# Smart Pantry — Escopo do Incremento 9

**Data:** 12 de novembro de 2026

**Fase correspondente no plano v3:** Fase 6 — Botão favorito e aba Favoritas

**Responsável técnico:** Gustavo Bongiovani

**Status:** concluído em código, testado com Vitest (67 testes passando), build de produção validado e lint com 0 erros.

---

## 1. Objetivo do incremento

Permitir favoritar receitas em qualquer superfície da aplicação (sugestões da despensa, modal de detalhes, cartões do planejamento semanal, inventário e histórico) com persistência no banco de dados e sincronização de estado reativo em tempo real, além de criar uma aba dedicada **Favoritas** com busca, ordenação (recentes e A-Z) e gerenciamento dentro de **Minhas receitas**.

---

## 2. Decisões arquiteturais e modelo de dados

1. **Reaproveitamento da modelagem existente:** A tabela `public.recipes` já possuía os campos `is_favorite boolean default false`, `favorited_at timestamptz` e o índice parcial `recipes_user_favorite_idx on public.recipes (user_id, is_favorite) where is_favorite` criados na Fase 7. Nenhuma migração de banco foi necessária.
2. **Snapshot canônico na persistência:** Quando uma receita que ainda não estava na biblioteca é favoritada (por exemplo, diretamente de uma sugestão do Gemini ou do planejamento semanal), ela é gravada na tabela `recipes` com seu snapshot completo de ingredientes (`used_ingredients`, `missed_ingredients`), passos (`steps`) e nomes normalizados (`ingredient_names`), com `source: 'cooked'` e `is_favorite: true`.
3. **Alternância transacional:** Se a receita já existe na tabela `recipes`, seu estado `is_favorite` é alternado de forma idempotente, e `favorited_at` recebe o timestamp atual ou `null`.
4. **Sincronização global:** `App.jsx` gerencia um conjunto reativo de títulos favoritos (`favoriteTitles: Set<string>`) e a função `handleToggleFavorite(recipe)`. Qualquer clique no coração em qualquer parte da aplicação reflete instantaneamente em todos os cartões, modais e abas abertas sem necessidade de recarregar a página.

---

## 3. Serviços desenvolvidos

No arquivo `app/src/services/recipeLibrary.js`:

- `toggleFavoriteRecipe(recipe)`:
  - Valida o título da receita;
  - Localiza o registro existente por `(user_id, title_normalized)`;
  - Se existir: atualiza `is_favorite` e `favorited_at`;
  - Se não existir: realiza insert do snapshot completo da receita com `is_favorite: true`;
  - Trata condições de corrida com chave única de forma transparente.
- `listFavoriteRecipes({ search = '', sort = 'recent' })`:
  - Retorna todas as receitas do usuário autenticado com `is_favorite = true`;
  - Ordena por `favorited_at desc` (recentes) ou por `title asc` (ordem alfabética);
  - Aplica filtro de busca por termo no título ou categoria via `ilike`.

---

## 4. Componentes e alterações de interface

1. **`FavoriteButton.jsx` (`app/src/components/FavoriteButton.jsx`):**
   - Botão reutilizável com `aria-label`, `aria-pressed` e tooltip descritivo em português;
   - Renderização via Material Symbols `favorite` com `fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0"`;
   - Cor vermelha quando ativo (`text-red-600`) e transição suave;
   - Interceptação com `event.stopPropagation()` para não disparar cliques do cartão pai ou abertura involuntária de modais;
   - Suporte a tamanhos `sm`, `md` e `lg`.

2. **`FeatureCard.jsx`:**
   - Integração do `FavoriteButton` no canto superior direito da imagem, substituindo o botão de placeholder antigo.

3. **`RecipeDetailModal.jsx`:**
   - Integração do `FavoriteButton` no cabeçalho superior direito ao lado do botão de fechar, permitindo favoritar/desfavoritar enquanto visualiza os detalhes completos do prato.

4. **`WeekPlanner.jsx` e `PlanHistoryModal.jsx`:**
   - Cartão `MealCard` integrado com `FavoriteButton` em tamanho `sm`, posicionado ao lado do botão de remoção de refeição.

5. **`MyRecipesPage.jsx`:**
   - Reestruturação da página em 3 abas internas:
     - **Inventário:** receitas preparadas agrupadas com contador de preparos e botão de favorito em cada cartão;
     - **Favoritas:** catálogo completo de receitas favoritadas com busca em tempo real, seletor de ordenação ("Mais recentes" ou "Ordem alfabética (A-Z)"), contador de favoritas e estado vazio explicativo com botão para ver receitas sugeridas;
     - **Histórico:** linha do tempo com até 50 preparos recentes, data/hora e botão de favoritar em cada item.
   - Cabeçalho enriquecido com 4 métricas: *Preparos*, *Inventário*, *Favoritas* e *Última vez*.

6. **`App.jsx`:**
   - Estado compartilhado `favoriteTitles` e `favoriteVersion`;
   - Efeito de carregamento inicial automático ao iniciar sessão;
   - Notificações de feedback tipo toast informando quando uma receita foi adicionada ou removida das favoritas;
   - Repasse das propriedades `isFavorite` e `onToggleFavorite` para todas as telas e modais.

---

## 5. Testes automatizados

Arquivo `app/src/services/__tests__/recipeLibrary.test.js` com 5 testes unitários:
- Rejeição de receitas sem título válido;
- Alternância de `is_favorite` de `true` para `false` quando existente;
- Criação de nova receita com snapshot e `is_favorite = true` quando não existente;
- Listagem restrita às receitas favoritas do usuário logado;
- Tratamento de busca por título vazio.

Execução da suíte completa de testes:
```
Test Files  8 passed (8)
Tests       67 passed (67)
Duration    225ms
```
Linter:
```
eslint .  (0 erros, 0 alertas)
```
Build de produção:
```
vite build  (sucesso em 369ms, sem advertências)
```
