# Escopo do Incremento 5 — Biblioteca de receitas e geração cache-first

> **Status:** implementado em 12/11/2026, com migração aplicada, Edge Function publicada e frontend confirmado em produção. A validação autenticada de ponta a ponta permanece pendente.
>
> **Projeto:** Smart Pantry — TCC
>
> **Ambiente Supabase:** `cojcrquveckvrdzjivmc` (`https://cojcrquveckvrdzjivmc.supabase.co`)
>
> **Frontend em produção:** `https://smart-pantry-coral.vercel.app`
>
> **Documento anterior:** [`ESCOPO_INCREMENTO_4.md`](./ESCOPO_INCREMENTO_4.md)

---

## 1. Objetivo

Persistir todas as receitas geradas pela IA na biblioteca do usuário e consultar essa biblioteca antes de chamar o Gemini. A Fase 7 do [`plano_implementacao_v3.md`](./plano_implementacao_v3.md) é a primeira fase do plano v3 e a base das fases 5, 6, 9, 10 e 11.

Ao final do incremento, o usuário pode:

1. continuar vendo sugestões de receitas mesmo depois de recarregar a página;
2. abrir **Descobrir mais receitas** e consultar todas as receitas já salvas;
3. buscar a biblioteca por nome ou categoria e navegar entre páginas;
4. gerar receitas adicionais somente quando a biblioteca não cobre a quantidade pedida;
5. acompanhar quantas gerações ainda restam no dia;
6. abrir os detalhes ou planejar uma receita da biblioteca sem nova chamada ao Gemini.

---

## 2. Funcionalidades incluídas

- Tabela `public.recipes` com snapshot completo da receita, ingredientes normalizados e campo de favorito preparado para a Fase 6.
- Tabela `public.recipe_generations` para auditoria e limite diário de gerações.
- RPC `find_recipes_for_pantry`, que busca receitas por sobreposição de ingredientes e ordena pelas que mais combinam com a despensa.
- Edge Function `recipe-suggestions` evoluída para:
  - exigir JWT do usuário;
  - consultar a biblioteca antes do Gemini;
  - gerar apenas a diferença quando o cache é parcial;
  - persistir as receitas geradas com deduplicação por título normalizado;
  - aplicar o limite de 10 gerações por dia;
  - devolver metadados de origem (`cache`, `mixed` ou `ai`), acertos de cache, quantidade gerada e saldo diário.
- Serviço `recipe.js` com o novo contrato de resposta.
- Serviço `recipeLibrary.js` para listar a biblioteca, buscar por título e consultar o status de gerações.
- Modal `DiscoverRecipesModal.jsx` com:
  - listagem da biblioteca;
  - busca com atraso de 300 ms;
  - paginação de 20 receitas por página;
  - botão **Gerar mais receitas**;
  - contador de gerações disponíveis;
  - estados de carregamento, erro, biblioteca vazia e aviso de limite;
  - abertura dos detalhes e planejamento direto do card.
- Integração no `App.jsx`:
  - estado dos metadados da última consulta;
  - selos **Da sua biblioteca** e **Limite diário atingido**;
  - atualização das sugestões com as receitas geradas pelo modal.
- Normalização compartilhada em `lib/recipeNormalization.js` e contrato de dados em `lib/recipeRecord.js`.
- Testes unitários com Vitest para normalização, contrato de receita e deduplicação.

---

## 3. Fora do escopo deste incremento

- Favoritar e desfavoritar receitas pela interface (Fase 6).
- Aba própria de favoritas em **Minhas receitas** (Fase 6).
- Templates de planejamento, ciclo de 4 semanas e histórico (Fase 5).
- Lista de compras derivada da biblioteca ou do planejamento (Fase 9).
- Edição manual do conteúdo de uma receita da biblioteca.
- Exclusão de receitas pela interface.
- Busca semântica ou por sinônimos de ingredientes.
- Sincronização em tempo real entre abas ou dispositivos.
- Testes de integração automatizados com sessão real do Supabase.

---

## 4. Decisões de arquitetura

### 4.1 Cache-first por sobreposição de ingredientes

A Edge Function consulta a biblioteca com os nomes normalizados dos ingredientes da despensa. A RPC `find_recipes_for_pantry` usa o operador de sobreposição de arrays (`&&`) e ordena pelo número de ingredientes em comum.

A Edge Function aplica um segundo filtro: a receita precisa ter pelo menos **2 ingredientes em comum** com a despensa. Quando a despensa tem apenas 1 ingrediente, o mínimo cai para 1. Essa regra evita devolver receitas que usam somente um item trivial e deixa o cache mais previsível.

Se o cache cobrir o limite pedido, o Gemini não é chamado. Se cobrir parcialmente, o Gemini gera apenas a diferença. Uma resposta totalmente servida pelo cache não consome cota diária.

### 4.2 Persistência por upsert direto no PostgREST

O plano v3 previa a RPC `upsert_generated_recipes`. A implementação optou por um `POST` direto em `recipes` com:

```text
Prefer: resolution=merge-duplicates,return=representation
on_conflict=user_id,title_normalized
```

Motivos:

- o PostgREST já executa `insert ... on conflict do update` com a chave única;
- a operação usa o JWT do usuário, portanto a RLS continua valendo;
- não foi necessário criar uma função SQL adicional para um fluxo que o próprio PostgREST resolve;
- o retorno `representation` entrega as linhas canônicas com IDs e timestamps do banco.

O campo `is_favorite` não é enviado no upsert, então o valor existente não é sobrescrito. O lote também é deduplicado antes do envio, porque o PostgreSQL não permite afetar a mesma linha duas vezes na mesma instrução `ON CONFLICT DO UPDATE`.

### 4.3 Autenticação da Edge Function com o JWT do usuário

A função lê o header `Authorization`, valida a sessão em `/auth/v1/user` e usa o mesmo token nas chamadas REST ao Supabase. Assim:

- a função não precisa da service role key;
- as consultas e gravações respeitam as políticas de RLS;
- um usuário não consegue ler nem gravar receitas de outro;
- requisições sem sessão retornam `401`.

### 4.4 Limite diário em `recipe_generations`

Cada chamada que efetivamente chama o Gemini grava uma linha em `recipe_generations` com:

- `requested_count`: quantidade pedida;
- `generated_count`: quantidade gerada;
- `cache_hits`: quantidade servida pelo cache;
- `source`: `ai`, `cache` ou `mixed`.

O limite é de **10 gerações por dia**, contadas a partir da meia-noite de `America/Sao_Paulo`. O frontend usa a mesma referência para exibir o contador. Uma chamada que gera várias receitas consome uma geração; o limite conta chamadas de geração, não receitas individuais.

Quando o limite é atingido:

- se houver receitas em cache, a função devolve o que existe com `limitReached: true`;
- se não houver, devolve `429` com mensagem orientando o usuário a consultar a biblioteca.

### 4.5 Listagem da biblioteca direto na tabela `recipes`

O plano previa um modo `mode: 'library'` na Edge Function. A implementação lista a biblioteca diretamente pela tabela `recipes`, usando o cliente Supabase do frontend e a sessão do usuário.

Motivos:

- a RLS já protege a consulta;
- a paginação, a busca e a contagem são feitas pelo PostgREST;
- evita uma chamada de Edge Function apenas para leitura;
- o modal não precisa gastar cota nem acordar a função para listar dados já salvos.

A Edge Function continua sendo usada apenas quando o usuário pede para gerar mais receitas.

### 4.6 Normalização compartilhada

As regras de normalização de título e ingredientes estão em `lib/recipeNormalization.js`, com uma cópia Deno equivalente na Edge Function. A duplicação é intencional: o frontend não pode importar código TypeScript da função e a função não deve depender do bundle do frontend.

As regras removem acentos, convertem para minúsculas, removem pontuação e singularizam palavras simples de ingredientes (`Tomates` → `tomate`, `Feijões` → `feijao`, `Pães` → `pao`). O título normalizado é a chave de deduplicação; os nomes dos ingredientes usados formam o array `ingredient_names` consultado pela RPC.

---

## 5. Arquitetura da solução

```text
Interface
  App.jsx
    |-- DiscoverRecipesModal.jsx
    |-- RecipeDetailModal.jsx / PlanMealModal.jsx
    |
    +--> services/recipe.js ---------> Edge Function recipe-suggestions
    |                                      |
    |                                      +--> valida JWT em /auth/v1/user
    |                                      +--> RPC find_recipes_for_pantry
    |                                      +--> Gemini API (somente a diferença)
    |                                      +--> upsert em public.recipes
    |                                      +--> insert em public.recipe_generations
    |
    +--> services/recipeLibrary.js --> public.recipes (RLS)
                                       public.recipe_generations (RLS)

Bibliotecas compartilhadas:
  lib/recipeNormalization.js  (títulos e ingredientes)
  lib/recipeRecord.js         (contrato dos cards e merge)
```

Fluxo de uma busca de receitas:

1. o `App.jsx` envia os ingredientes da despensa para `listRecipesByIngredients`;
2. `recipe.js` normaliza os nomes e chama a Edge Function com o JWT da sessão;
3. a Edge Function valida o usuário e normaliza os ingredientes;
4. a função consulta `find_recipes_for_pantry`;
5. se o cache cobre o limite, devolve `source: 'cache'` sem chamar o Gemini;
6. se o cache é parcial, verifica o limite diário e chama o Gemini apenas para a diferença;
7. as receitas geradas são enriquecidas com imagem e persistidas em `recipes`;
8. a geração é registrada em `recipe_generations`;
9. a função devolve receitas do cache + receitas geradas e os metadados;
10. o frontend atualiza os cards, os selos e o contador.

Fluxo do modal **Descobrir mais receitas**:

1. o usuário abre o modal;
2. o modal consulta `recipes` com busca e paginação;
3. o usuário pode abrir os detalhes, planejar ou clicar em **Gerar mais receitas**;
4. a geração usa o mesmo fluxo da Edge Function;
5. ao concluir, o modal recarrega a primeira página da biblioteca e atualiza o contador.

---

## 6. Alterações por camada

### 6.1 Banco de dados

Migração [`20261112120000_recipes_library.sql`](../supabase/migrations/20261112120000_recipes_library.sql):

- cria `public.recipes` com:
  - `id`, `user_id`, `title`, `title_normalized`, `category`;
  - metadados de imagem (`image`, `image_query`, `image_source`, `image_author`, `image_license`, `image_license_url`, `image_source_url`);
  - `ready_in_minutes`, `servings`, `calories_per_serving`;
  - `used_ingredients`, `missed_ingredients` e `steps` em `jsonb`;
  - `ingredient_names text[]` para o cache;
  - `source`, `is_favorite`, `favorited_at`, `created_at`, `updated_at`;
  - restrição única `recipes_user_title_unique (user_id, title_normalized)`.
- cria `public.recipe_generations` com `requested_count`, `generated_count`, `cache_hits`, `source` e `generated_at`.
- cria índices:
  - GIN em `recipes.ingredient_names`;
  - `(user_id, created_at desc)`;
  - `(user_id, title_normalized)`;
  - índice parcial para favoritas;
  - `(user_id, generated_at desc)` em `recipe_generations`.
- reutiliza o trigger `set_updated_at` para manter `updated_at`.
- habilita RLS nas duas tabelas:
  - `recipes`: leitura, criação, atualização e exclusão por `auth.uid() = user_id`;
  - `recipe_generations`: leitura e criação por `auth.uid() = user_id`.
- revoga acesso de `anon` e concede os privilégios a `authenticated`.
- cria a RPC `find_recipes_for_pantry(p_ingredients text[], p_limit integer)`:
  - `stable`, `security invoker`, `search_path = public`;
  - filtra por `user_id = auth.uid()` e `ingredient_names && p_ingredients`;
  - ordena pela cardinalidade da interseção e por `created_at desc`;
  - limita o resultado entre 1 e 24 linhas.

### 6.2 Edge Function

[`supabase/functions/recipe-suggestions/index.ts`](../supabase/functions/recipe-suggestions/index.ts):

- valida o JWT em `/auth/v1/user`;
- usa um cliente REST com `apikey` e o token do usuário;
- consulta `find_recipes_for_pantry` antes do Gemini;
- aplica o mínimo de 2 ingredientes em comum;
- conta as gerações do dia em `recipe_generations`;
- chama o Gemini apenas para a diferença;
- mantém o fallback entre modelos e o enriquecimento de imagens;
- persiste as receitas com upsert em `recipes`;
- deduplica o lote por `title_normalized`;
- registra a geração;
- devolve o contrato:

```json
{
  "recipes": [],
  "source": "cache",
  "cacheHits": 6,
  "generated": 0,
  "remainingGenerationsToday": 10,
  "limitReached": false
}
```

- devolve `401` sem sessão válida;
- devolve `429` quando o limite diário acaba e não há cache;
- devolve `503` quando o Gemini está sobrecarregado e `502` para outros erros de geração.

### 6.3 Serviços do frontend

`app/src/services/recipe.js`:

- `listRecipesByIngredients(ingredients, { limit })` passa a devolver um objeto com `recipes`, `source`, `cacheHits`, `generated`, `remainingGenerationsToday` e `limitReached`;
- usa `normalizeRecipeFromApi` para manter o contrato dos cards.

`app/src/services/recipeLibrary.js`:

- `listRecipeLibrary({ search, page, pageSize })`: lista a biblioteca com busca por título/categoria, contagem total e paginação (20 por padrão, máximo 50);
- `getRecipeGenerationStatus()`: conta as gerações do dia e devolve `used`, `limit` e `remaining`;
- `findRecipeByTitle(title)`: busca uma receita pelo título normalizado, preparando a Fase 6;
- `DAILY_GENERATION_LIMIT = 10`.

### 6.4 Componentes e telas

- `DiscoverRecipesModal.jsx`: listagem, busca, paginação, geração, contador, estados de carregamento/erro/vazio e ações de abrir/planejar.
- `App.jsx`: integra o modal, guarda os metadados da consulta, exibe os selos de cache/limite e mescla as receitas geradas às sugestões atuais.
- `FeatureCard.jsx` e `RecipeDetailModal.jsx`: continuam recebendo o mesmo contrato de receita, agora também preenchido por linhas da biblioteca.

### 6.5 Bibliotecas compartilhadas

- `app/src/lib/recipeNormalization.js`: `normalizeText`, `normalizeRecipeTitle`, `normalizeIngredientName` e `buildIngredientNames`.
- `app/src/lib/recipeRecord.js`: `normalizeRecipeFromApi`, `normalizeRecipeFromRow` e `mergeRecipeLists`.

### 6.6 Testes

- `app/src/lib/__tests__/recipeNormalization.test.js`: acentos, caixa, pontuação, plural e deduplicação de ingredientes.
- `app/src/lib/__tests__/recipeRecord.test.js`: contrato da API, contrato da linha do banco e merge por título normalizado.
- `app/package.json`: scripts `test` (`vitest run`) e `test:watch`, com Vitest em `devDependencies`.

---

## 7. Segurança e RLS

- `user_id` referencia `auth.users(id)` com `on delete cascade`.
- Todas as políticas exigem `auth.uid() = user_id`.
- A Edge Function não usa service role: as operações usam o JWT do usuário.
- O frontend nunca envia outro `user_id`; os serviços usam a sessão autenticada.
- `anon` não possui acesso às tabelas nem à RPC.
- O upsert usa a chave `(user_id, title_normalized)`, impedindo duplicatas por usuário.
- O limite diário é aplicado no servidor, não apenas na interface.

Evidências de smoke test:

- `POST` sem JWT: `401`;
- `POST` com JWT inválido: `401`;
- `OPTIONS`: `200`;
- `recipes` e `find_recipes_for_pantry` com `anon`: `42501` (permission denied).

---

## 8. Implantação

1. ~~Aplicar a migração no projeto remoto.~~ Aplicada em 12/11/2026:

   ```bash
   npx supabase db push --remote --yes
   ```

   O `supabase migration list --remote` confirmou as **7 migrações** sincronizadas.

2. ~~Publicar a Edge Function atualizada.~~ Publicada em 12/11/2026:

   ```bash
   npx supabase functions deploy recipe-suggestions --project-ref cojcrquveckvrdzjivmc --yes
   ```

3. ~~Publicar o frontend pelo push para `main` e confirmar o bundle na Vercel.~~ Publicado em 12/11/2026; o bundle `App-DGRzoN0o.js` foi confirmado em `https://smart-pantry-coral.vercel.app`.

4. Validar o fluxo com uma conta autenticada:
   - abrir **Descobrir mais receitas**;
   - gerar receitas com a despensa;
   - recarregar a página e confirmar a persistência;
   - buscar e paginar a biblioteca;
   - planejar uma receita da biblioteca;
   - confirmar o contador e o bloqueio após 10 gerações.

> [!IMPORTANT]
> A migração, a Edge Function e o frontend estão em produção. O teste autenticado completo depende da conta Google do usuário e ainda não foi executado.

---

## 9. Testes e evidências

- `npm run lint` sem erros.
- `npm run build` concluído com sucesso (Vite; bundle `App-DGRzoN0o.js`).
- `npm test`: 16 testes unitários passando em 2 arquivos.
- `supabase migration list --remote` confirmou 7 migrações sincronizadas.
- Edge Function republicada após o ajuste de deduplicação do lote.
- `POST` sem JWT retornou `401`.
- `POST` com JWT inválido retornou `401`.
- `OPTIONS` retornou `200`.
- `recipes` e `find_recipes_for_pantry` com `anon` retornaram `42501`.
- Deploy do frontend confirmado em `https://smart-pantry-coral.vercel.app` (bundle `App-DGRzoN0o.js`, com os textos **Descobrir mais receitas** e **Gerar mais receitas**).
- Teste autenticado de geração/persistência/limite permanece pendente.

---

## 10. Limitações e riscos conhecidos

- O cache compara nomes normalizados literalmente. Sinônimos e variações regionais (`cebola` vs. `cebola roxa`) podem não casar.
- O mínimo de 2 ingredientes em comum pode excluir receitas que usam apenas 1 item da despensa. Essas receitas ainda podem ser geradas pelo Gemini, mas não serão servidas pelo cache.
- O limite diário conta chamadas de geração, não receitas. Uma chamada que gera 3 receitas consome 1 do limite.
- O selo **Gerada agora** pode não aparecer depois de recarregar o modal, porque a listagem da biblioteca não distingue a origem da geração. É um refinamento cosmético.
- A biblioteca ainda não permite excluir receitas pela interface.
- A busca é textual e por categoria; não há busca por ingrediente na biblioteca.
- A validação autenticada de ponta a ponta depende da conta Google do usuário.
- A persistência usa o PostgREST em vez da RPC prevista no plano; a decisão está registrada na seção 4.2.

---

## 11. Próximos passos sugeridos

1. Validar o fluxo autenticado completo da Fase 7.
2. Confirmar o deploy da Vercel e o bundle publicado.
3. Iniciar a **Fase 5 — Templates de planejamento**.
4. Na Fase 6, usar `is_favorite` e `findRecipeByTitle` para favoritar e importar receitas do histórico.
5. Ampliar os testes com integração de cache, RLS e fluxos autenticados.

---

## 12. Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `supabase/migrations/20261112120000_recipes_library.sql` | Novas tabelas `recipes` e `recipe_generations`, índices, trigger, RLS, grants e RPC `find_recipes_for_pantry`. |
| `supabase/functions/recipe-suggestions/index.ts` | Autenticação JWT, cache-first, geração da diferença, persistência, deduplicação e limite diário. |
| `app/src/services/recipe.js` | Novo contrato de resposta com metadados. |
| `app/src/services/recipeLibrary.js` | Listagem da biblioteca, status de gerações e busca por título. |
| `app/src/components/DiscoverRecipesModal.jsx` | Modal “Descobrir mais receitas”. |
| `app/src/app/App.jsx` | Integração do modal, selos e estado das receitas. |
| `app/src/lib/recipeNormalization.js` | Normalização de títulos e ingredientes. |
| `app/src/lib/recipeRecord.js` | Contrato de receita e merge por título. |
| `app/src/lib/__tests__/recipeNormalization.test.js` | Testes de normalização. |
| `app/src/lib/__tests__/recipeRecord.test.js` | Testes de contrato e deduplicação. |
| `app/package.json` / `app/package-lock.json` | Vitest e scripts de teste. |
| `docs/ESTADO_ATUAL_DO_PROJETO.md` | Estado e versionamento atualizados para 2.1. |
| `docs/plano_implementacao_v3.md` | Fase 7 marcada como concluída e próximos passos atualizados. |
| `docs/plano_testes.md` | Status e automação da Fase 7 registrados. |

---

## 13. Referências

- [`plano_implementacao_v3.md`](./plano_implementacao_v3.md) — Fase 7.
- [`plano_testes.md`](./plano_testes.md) — casos CT-07-01 a CT-07-10.
- [`ESTADO_ATUAL_DO_PROJETO.md`](./ESTADO_ATUAL_DO_PROJETO.md) — estado consolidado.
- [`ESCOPO_INCREMENTO_4.md`](./ESCOPO_INCREMENTO_4.md) — incremento anterior.
