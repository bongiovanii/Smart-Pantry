# Escopo do Incremento 8 — Minha Lista de Compras e Fluxo de Reposição

> **Status:** implementado em 12/11/2026, com migração `20261112220000_shopping_list_and_pantry_entries.sql` aplicada no banco de dados remoto Supabase, serviços `shoppingList.js` e `pantry.js`, componentes `ShoppingListPage`, `ShoppingItemModal`, `PurchaseItemModal`, `PantryEntryModal` e integração completa na navegação principal (`App.jsx`), com 62 testes unitários passando com 100% de sucesso.
>
> **Projeto:** Smart Pantry — TCC
>
> **Ambiente Supabase:** `cojcrquveckvrdzjivmc` (`https://cojcrquveckvrdzjivmc.supabase.co`)
>
> **Frontend:** React 19 + Vite 8 + Tailwind CSS 4
>
> **Documento anterior:** [`ESCOPO_INCREMENTO_7.md`](./ESCOPO_INCREMENTO_7.md)

---

## 1. Objetivo

Implementar a **Fase 9** do [`plano_implementacao_v3.md`](./plano_implementacao_v3.md), entregando a aba **Minha lista de compras** com:

1. **Gestão de lista de compras persistida** no banco de dados com RLS;
2. **Sugestões inteligentes automáticas** calculadas no PostgreSQL combinando frequência de consumo (`stock_movements.movement_type = 'consumption'`), histórico de reposições (`movement_type = 'entry'`) e saldo atual da despensa nos últimos 90 dias;
3. **Detecção automática de ingredientes faltantes no planejamento alimentar**, inspecionando o cardápio da semana atual (`recipe_snapshot.missedIngredients`) e oferecendo adição direta com 1 clique;
4. **Fluxo atômico de compra e entrada na despensa**: ao marcar um item como comprado (`PurchaseItemModal`), o usuário pode optar por dar entrada automática na despensa, atualizando o saldo do item existente ou cadastrando um novo e registrando a movimentação de entrada;
5. **Fluxo de reposição direta na despensa** (`PantryEntryModal`): botão **Repor** em cada alimento da despensa para adicionar quantidade com motivo opcional sem alterar a data de criação;
6. **Deduplicação e soma inteligente**: se o usuário adicionar um item já pendente na lista de compras (mesmo nome normalizado e unidade), a quantidade é somada automaticamente ao item existente em vez de gerar duplicação.

---

## 2. Funcionalidades incluídas

### 2.1 Modelo de dados e migração SQL (`20261112220000_shopping_list_and_pantry_entries.sql`)

- **Tabela `public.shopping_list_items`:**
  - Armazena itens pendentes, comprados ou removidos (`status in ('pending', 'purchased', 'removed')`);
  - Registra a origem do item (`source in ('manual', 'suggestion', 'meal_plan')`);
  - Constraint única parcial: `unique (user_id, name_normalized, unit) where status = 'pending'`, garantindo integridade e evitando duplicatas na lista ativa;
  - Políticas de RLS completas (SELECT, INSERT, UPDATE, DELETE para `auth.uid() = user_id`);
  - Trigger automático de `set_updated_at`.
- **RPCs transacionais no PostgreSQL:**
  - `record_pantry_entry(p_item_id, p_quantity, p_reason)`: registra movimentação `entry` em `stock_movements`, incrementa `quantity` em `pantry_items`, define `status = 'em_estoque'` e devolve a linha atualizada atomicamente;
  - `create_pantry_item_with_entry(...)`: insere novo alimento na despensa e registra imediatamente o histórico de entrada inicial;
  - `mark_shopping_item_purchased(p_item_id, p_quantity, p_add_to_pantry, p_category, p_expiration_date)`: marca o item da lista como comprado (`purchased_at = now()`) e, se solicitado, vincula ou cria o item na despensa e insere `stock_movements` em uma única transação atômica;
  - `get_shopping_suggestions(p_days)`: analisa a frequência e o volume de consumo e reposições nos últimos 90 dias, cruza com o saldo atual da despensa, exclui itens já pendentes na lista e calcula um score de recomendação de 0 a 1, devolvendo até 20 sugestões com quantidade sugerida e justificativa contextual (ex: *"Você compra com frequência"*, *"Estoque acabando"*, *"Estoque zerado"*).

### 2.2 Camada de serviços (`shoppingList.js` e `pantry.js`)

- `app/src/services/shoppingList.js`:
  - `listShoppingItems({ status })`: lista itens com filtros de status (`pending`, `purchased`, `all`);
  - `addShoppingItem({ name, category, unit, quantity, source, note })`: valida dados, normaliza nome e faz soma de quantidade caso já exista item pendente;
  - `updateShoppingItem(id, changes)`: edita dados do item na lista;
  - `removeShoppingItem(id)`: descarta item marcando `status = 'removed'`;
  - `markShoppingItemPurchased(id, options)`: invoca a RPC de compra e entrada na despensa;
  - `getShoppingSuggestions(days)`: consulta as sugestões calculadas no banco;
  - `extractMealPlanMissingItems(weeklyPlan, pantryItems, pendingItems)`: função pura que extrai e agrega itens que faltam no cardápio da semana.
- `app/src/services/pantry.js`:
  - `recordPantryEntry(itemId, { quantity, reason })`: aciona a RPC de reposição.

### 2.3 Interface e navegação

- **`ShoppingListPage.jsx`:**
  - Métricas rápidas no topo: contadores de itens para comprar, sugestões ativas e comprados no mês;
  - Seção **Para o seu planejamento semanal**: exibe os ingredientes faltantes das receitas da semana com indicação de quais pratos precisam deles e botão de 1 clique para adicionar à lista;
  - Seção **Sugestões baseadas no seu consumo**: cartões horizontais de sugestões inteligentes com estoque atual, quantidade recomendada e botão para adicionar;
  - Seção **Itens para comprar**: listagem de compras com filtro por categoria, botões para marcar como comprado, editar e excluir;
  - Seção **Comprados recentemente**: histórico expansível com opção de "Comprar de novo" em 1 clique.
- **`ShoppingItemModal.jsx`:** modal para cadastro e edição manual de itens na lista.
- **`PurchaseItemModal.jsx`:** modal de confirmação de compra com quantidade ajustável, opção de adicionar automaticamente à despensa e definição de data de validade.
- **`PantryEntryModal.jsx`:** modal para reposição rápida de estoque a partir de qualquer alimento da despensa.
- **`AppHeader.jsx` e `App.jsx`:** nova rota/aba **Lista de compras** integrada no menu lateral (desktop) e na barra de navegação inferior (mobile com `grid-cols-5`).

---

## 3. Testes e Qualidade

- Criado arquivo de testes `app/src/services/__tests__/shoppingList.test.js`:
  - Validação de regras e parâmetros de adição de itens;
  - Incremento automático em itens já pendentes;
  - Atualização, remoção e marcação de compra com entrada na despensa;
  - Agregação correta de ingredientes faltantes no planejamento alimentar;
  - Testes de reposição de estoque em `recordPantryEntry`.
- **Resultados:**
  - `vitest run`: **7 suítes / 62 testes passando (100% de sucesso)**;
  - `eslint .`: **0 erros e 0 warnings**;
  - `vite build`: **build de produção gerado com sucesso**.

---

## 4. Próximos passos recomendados

Conforme o [`plano_implementacao_v3.md`](./plano_implementacao_v3.md), as próximas fases planejadas são:
1. **Fase 6 — Favoritas:** permitir favoritar receitas e exibi-las em uma aba dedicada em Minhas receitas;
2. **Fase 8 — Dark mode:** tema escuro baseado na preferência salva em `user_settings`;
3. **Fase 11 — Smart Chef (stretch):** chatbot com IA contextualizado com despensa e receitas.
