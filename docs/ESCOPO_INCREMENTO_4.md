# Escopo do Incremento 4 — Planejamento semanal persistente

> **Status:** implementado, com migração aplicada e frontend publicado em 11/11/2026.
>
> **Projeto:** Smart Pantry — TCC
>
> **Ambiente Supabase:** `cojcrquveckvrdzjivmc` (`https://cojcrquveckvrdzjivmc.supabase.co`)
>
> **Frontend em produção:** `https://smart-pantry-coral.vercel.app`
>
> **Documento anterior:** [`ESCOPO_INCREMENTO_3.md`](./ESCOPO_INCREMENTO_3.md)

---

## 1. Objetivo

Substituir a grade estática de demonstração da semana por um planejamento real, persistido no banco e vinculado ao usuário autenticado. A Fase 4 do [`plano_implementacao_v2.md`](./plano_implementacao_v2.md) fecha o último bloco previsto no plano de features.

Ao final do incremento, o usuário pode:

1. agendar qualquer receita sugerida (ou já preparada) em um dia da semana e em um tipo de refeição;
2. reabrir os detalhes da refeição planejada sem nova chamada ao Gemini;
3. substituir ou remover uma refeição do slot;
4. encontrar o planejamento preservado depois de recarregar a página ou trocar de dispositivo.

---

## 2. Funcionalidades incluídas

- Tabela `public.meal_plans`, com um registro por `(user_id, day_of_week, meal_type)`.
- Snapshot completo da receita em `recipe_snapshot` (`jsonb`), no mesmo formato usado pelo histórico.
- Serviço `mealPlan.js` com `listWeeklyPlan`, `assignMealToDay` e `removeMealPlan`.
- Grade semanal real na tela principal, com:
  - até quatro refeições por dia (café da manhã, almoço, lanche e jantar);
  - botão de adicionar refeição em cada coluna;
  - botão de remover em cada refeição;
  - abertura do modal de detalhes ao clicar na refeição;
  - contagem de refeições planejadas e estados de carregamento/erro.
- Botão **Planejar** no modal de detalhes da receita e atalho de calendário no card de receita sugerida.
- Modal `PlanMealModal` para escolher dia, tipo de refeição e (quando necessário) a receita.
- Extração do snapshot de receita para `lib/recipeSnapshot.js`, reutilizado pelo consumo e pelo planejamento.

---

## 3. Fora do escopo deste incremento

- Geração automática da semana inteira por IA.
- Lista de compras derivada dos ingredientes faltantes do planejamento.
- Notificações ou lembretes das refeições do dia.
- Planejamento por data específica (o modelo é semanal e recorrente).
- Edição em massa, arrastar e soltar ou visão mensal.
- Sincronização com calendários externos.

---

## 4. Decisões de arquitetura

### 4.1 Um slot único por dia e tipo de refeição

A restrição `unique (user_id, day_of_week, meal_type)` impede duplicidade no mesmo horário e permite que o frontend use `upsert` para substituir o prato de um slot. Essa escolha mantém a grade simples e previsível: ao reagendar o mesmo dia/refeição, o novo prato ocupa o lugar do anterior.

### 4.2 Snapshot da receita no momento do agendamento

O planejamento guarda `recipe_snapshot` com título, imagem, categoria, tempo, porções, calorias, ingredientes e passos. Assim como em `user_recipes`, o snapshot:

- permite abrir o modal de detalhes sem chamar o Gemini novamente;
- preserva o prato exatamente como foi planejado, mesmo que as sugestões mudem depois;
- mantém o planejamento legível caso a receita deixe de aparecer na lista atual.

As colunas `recipe_id`, `recipe_title` e `recipe_image` permanecem como fallback e como apoio a consultas e índices.

### 4.3 Serviço dedicado e constantes compartilhadas

Toda a comunicação com `meal_plans` ficou em `services/mealPlan.js`, seguindo o padrão dos demais serviços. Os dias e tipos de refeição aceitos pelo banco estão em `lib/mealPlan.js`, importados tanto pelo serviço quanto pelos componentes, evitando divergência entre validação e interface.

### 4.4 Reaproveitamento do snapshot de receita

A função `buildRecipeSnapshot`, antes privada de `movements.js`, passou para `lib/recipeSnapshot.js`. Consumo e planejamento passam a usar o mesmo contrato, reduzindo duplicação e o risco de os dois fluxos salvarem formatos diferentes.

---

## 5. Arquitetura da solução

```text
Interface (WeekPlanner / PlanMealModal)
        |
        v
services/mealPlan.js  ---> Supabase (PostgREST)
        |                        |
        |                        +--> public.meal_plans (RLS por user_id)
        |
        +--> lib/recipeSnapshot.js (contrato compartilhado)
        +--> lib/mealPlan.js (dias e refeições válidos)
```

Fluxo de agendamento:

1. o usuário clica em **Planejar** no modal da receita ou no **+** de uma coluna da semana;
2. o `PlanMealModal` recebe a receita fixa (primeiro caso) ou lista as receitas sugeridas (segundo caso);
3. o usuário escolhe dia e tipo de refeição;
4. `assignMealToDay` valida os valores, monta o snapshot e faz `upsert` no slot;
5. o estado local é atualizado apenas para o slot salvo, sem recarregar a página;
6. um aviso confirma a inclusão ou a substituição.

---

## 6. Alterações por camada

### 6.1 Banco de dados

Migração [`20261111234500_meal_plans.sql`](../supabase/migrations/20261111234500_meal_plans.sql):

- cria `public.meal_plans` com validações de dia, refeição, tamanho de título/id e tipo do snapshot;
- adiciona a restrição única `meal_plans_user_slot_unique`;
- cria índice `meal_plans_user_day_idx (user_id, day_of_week)`;
- reutiliza o trigger `set_updated_at` para manter `updated_at`;
- habilita RLS com políticas de leitura, criação, atualização e exclusão por `auth.uid() = user_id`;
- revoga acesso de `anon` e concede `select, insert, update, delete` a `authenticated`.

### 6.2 Serviço do frontend

`app/src/services/mealPlan.js`:

- `listWeeklyPlan()`: consulta as refeições do usuário e normaliza o snapshot para o contrato dos cards/modal;
- `assignMealToDay({ dayOfWeek, mealType, recipe })`: valida dia/refeição, monta o snapshot e faz `upsert` no slot;
- `removeMealPlan(planId)`: exclui a refeição do usuário.

### 6.3 Componentes e telas

- `WeekPlanner.jsx`: grade semanal real, estados de carregamento/erro, contagem, cartões de refeição e botões de adicionar/remover.
- `PlanMealModal.jsx`: seleção de dia, refeição e receita; trata envio, erro e bloqueio durante o salvamento.
- `FeatureCard.jsx`: atalho de calendário para planejar a receita direto do card.
- `RecipeDetailModal.jsx`: botão **Planejar** no rodapé, ao lado de **Cozinhar esta receita**.
- `App.jsx`: carrega o planejamento na inicialização, coordena os modais e atualiza o estado local após salvar/remover.

### 6.4 Bibliotecas compartilhadas

- `app/src/lib/mealPlan.js`: dias da semana, rótulos e tipos de refeição aceitos pelo banco.
- `app/src/lib/recipeSnapshot.js`: contrato único de snapshot de receita.

---

## 7. Segurança e RLS

A tabela segue o mesmo modelo das demais:

- `user_id` referencia `auth.users(id)` com `on delete cascade`;
- as quatro políticas exigem `auth.uid() = user_id`;
- o frontend nunca informa outro `user_id`: o serviço usa a sessão autenticada;
- a operação de remoção também filtra por `user_id`, reforçando a intenção mesmo com RLS ativa;
- `anon` não possui acesso à tabela.

---

## 8. Implantação

1. ~~Aplicar a migração no projeto remoto.~~ Aplicada em 11/11/2026:

   ```bash
   npx supabase db push --remote cojcrquveckvrdzjivmc --yes
   ```

   A mesma execução aplicou também a migração de calorias, que estava pendente desde 08/11/2026.

2. ~~Publicar o frontend atualizado (Vercel).~~ Publicado em 11/11/2026 pelo push para `main`; o bundle `App-BUKnWRSJ.js` foi confirmado na URL de produção.
3. Validar o fluxo com uma conta autenticada:
   - planejar uma receita em um dia/refeição;
   - recarregar a página e confirmar a persistência;
   - substituir o mesmo slot por outra receita;
   - remover a refeição.

> [!IMPORTANT]
> O `supabase migration list --remote` confirmou todas as migrações sincronizadas. O smoke test via PostgREST retornou `42501` (permission denied) para `anon` em `meal_plans` e `user_recipes`, confirmando que as tabelas existem e que os grants estão corretos. O deploy do frontend foi confirmado pela presença do bundle novo em `https://smart-pantry-coral.vercel.app`. O teste manual autenticado permanece como validação final do fluxo.

---

## 9. Testes e evidências

- `npm run lint` sem erros.
- `npm run build` concluído com sucesso (Vite).
- Revisão do contrato de dados entre `meal_plans`, serviço e componentes.
- `supabase migration list --remote` confirmou as seis migrações sincronizadas.
- Smoke test via PostgREST: `meal_plans` e `user_recipes` respondem `42501` (permission denied) para `anon`, comprovando que as tabelas existem e que o acesso público está bloqueado.
- Deploy do frontend confirmado em `https://smart-pantry-coral.vercel.app` (bundle `App-BUKnWRSJ.js` com o código do planejamento).
- Teste manual autenticado permanece pendente como validação final do fluxo.

---

## 10. Limitações e riscos conhecidos

- O planejamento é semanal e recorrente; não há data inicial, semana específica ou histórico de semanas passadas.
- Cada slot aceita apenas uma receita. Um almoço com prato principal e acompanhamento exige dois slots ou uma receita combinada.
- O snapshot é imutável: editar a receita original não altera o que já foi planejado.
- Não existe lista de compras automática a partir dos ingredientes faltantes.
- O modal só lista as receitas sugeridas atualmente carregadas; para planejar uma receita que não está na lista, é necessário abri-la em **Minhas receitas** e usar **Planejar**.

---

## 11. Próximos passos sugeridos

1. Lista de compras derivada do planejamento semanal.
2. Alertas de validade e sugestão de receitas que priorizem itens vencendo.
3. Registro manual de entrada, descarte e ajuste em `stock_movements`.
4. Tela de histórico de movimentações e indicadores de desperdício.
5. Revisão dos requisitos com base no software consolidado.

---

## 12. Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `supabase/migrations/20261111234500_meal_plans.sql` | Nova tabela, índices, trigger, RLS e grants. |
| `app/src/services/mealPlan.js` | Novo serviço de planejamento. |
| `app/src/lib/mealPlan.js` | Constantes de dias e refeições. |
| `app/src/lib/recipeSnapshot.js` | Snapshot compartilhado entre consumo e planejamento. |
| `app/src/components/WeekPlanner.jsx` | Grade semanal persistente. |
| `app/src/components/PlanMealModal.jsx` | Modal de agendamento. |
| `app/src/components/FeatureCard.jsx` | Atalho de planejamento no card. |
| `app/src/components/RecipeDetailModal.jsx` | Botão **Planejar**. |
| `app/src/app/App.jsx` | Estado, carregamento e handlers do planejamento. |
| `app/src/services/movements.js` | Passa a importar o snapshot compartilhado. |
| `docs/ESTADO_ATUAL_DO_PROJETO.md` | Estado e versionamento atualizados. |
| `docs/plano_implementacao_v2.md` | Fase 4 marcada como concluída. |

---

## 13. Referências

- [`plano_implementacao_v2.md`](./plano_implementacao_v2.md) — Fase 4.
- [`ESTADO_ATUAL_DO_PROJETO.md`](./ESTADO_ATUAL_DO_PROJETO.md) — estado consolidado.
- [`ESCOPO_INCREMENTO_3.md`](./ESCOPO_INCREMENTO_3.md) — incremento anterior.
