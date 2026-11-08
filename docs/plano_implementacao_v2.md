# Plano de Implementação — Próximas Features do Smart Pantry

Este plano detalha o passo a passo técnico para implementar as quatro funcionalidades solicitadas, respeitando o modelo incremental, a rastreabilidade acadêmica do TCC e a integridade da arquitetura atual (**React + Supabase + Edge Functions + Node.js**).

---

## Visão Geral das Entregas

```mermaid
flowchart LR
    Fase1["Fase 1: Edição e Exclusão<br/>(CRUD Despensa - Concluída)"] --> Fase2["Fase 2: Motor de Receitas com IA<br/>(Google AI Studio / Gemini API)"]
    Fase2 --> Fase3["Fase 3: Movimentações e Consumo<br/>(stock_movements)"]
    Fase3 --> Fase4["Fase 4: Planejamento Semanal<br/>(meal_plans)"]
```

---

## Fase 1 — Edição e Exclusão de Itens da Despensa (Concluída)

### 1.1 Objetivo
Permitir que o usuário corrija dados cadastrados incorretamente (nome, categoria, quantidade, validade) ou remova itens que já não estão mais em sua posse.

### 1.2 Alterações Técnicas

1. **Camada de Serviço ([`pantry.js`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/services/pantry.js)):**
   - Implementar `updatePantryItem(id, item)`: realiza update no Supabase filtrando por `id` e `user_id`.
   - Implementar `deletePantryItem(id)` / `archivePantryItem(id)`: utiliza *soft delete* (`archived_at = now()`) para preservar a integridade referencial com a tabela `stock_movements`.
2. **Componente de Formulário ([`IngredientModal.jsx`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/components/IngredientModal.jsx)):**
   - Adaptar o modal para receber uma prop opcional `initialData` ou `editingItem`.
   - Quando `editingItem` estiver presente: alterar título para "Editar ingrediente", botão para "Salvar alterações" e pré-carregar os campos.
3. **Interface e Listagem ([`App.jsx`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/app/App.jsx)):**
   - Adicionar botões de ação em cada cartão de ingrediente:
     - Ícone de lápis (`edit`): abre o modal em modo de edição.
     - Ícone de lixeira (`delete`): abre diálogo de confirmação de exclusão.
   - Atualizar a lista de estado local (`ingredients`) sem necessitar de recarregamento total da página.

### 1.3 Critérios de Pronto
- [x] Usuário consegue alterar quantidade, unidade, categoria e validade de um item existente.
- [x] Item excluído deixa de ser exibido na lista ativa via exclusão suave (*soft delete*) e não quebra referências no banco.
- [x] RLS impede que um usuário edite ou exclua itens de outra sessão.
- [x] ESLint e Vite build executados com sucesso (sem erros).

---

## Fase 2 — Motor de Receitas Inteligente e Detalhamento em PT-BR (Google AI Studio / Gemini API)

> [!NOTE]
> **Decisão de Engenharia & TCC:** A Spoonacular foi descontinuada do escopo por operar exclusivamente em inglês e limitar a cota a 150 pontos/dia. A migração para a **API Gemini (Google AI Studio)** foi adotada para garantir receitas 100% nativas em português do Brasil, contextualizadas com a despensa real das famílias brasileiras e com cota gratuita ampla (1.500 req/dia) sem exigência de cartão de crédito.

### 2.1 Objetivo
Substituir a busca externa engessada por um motor de Inteligência Artificial generativa que gera receitas criativas e com foco no combate ao desperdício (ODS 12), entregando modo de preparo passo a passo e ingredientes completos diretamente em português na primeira requisição.

### 2.2 Alterações Técnicas

1. **Configuração de Chave e Segredos:**
   - Obter a chave gratuita no [Google AI Studio](https://aistudio.google.com/apikey).
   - Cadastrar o segredo `GEMINI_API_KEY` na Edge Function do Supabase via CLI ou painel web.
2. **Refatoração da Supabase Edge Function ([`recipe-suggestions/index.ts`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/supabase/functions/recipe-suggestions/index.ts)):**
   - Chamar o modelo `gemini-3.1-flash-lite` (padrão econômico do projeto) via API REST da Google AI Studio.
   - Definir System Prompt de "Chef de Cozinha Brasileiro especialista em reaproveitamento e combate ao desperdício".
   - Aplicar **Structured Output (JSON Schema)** para forçar a resposta com `{ recipes: [...] }` contendo `id`, `title`, `readyInMinutes`, `servings`, `usedIngredients`, `missedIngredients` e `steps`.
   - Adicionar mapeador automático de imagens de alta resolução por categoria culinária (Unsplash Food Collection) para manter cards visualmente ricos.
3. **Frontend ([`recipe.js`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/services/recipe.js) e [`RecipeDetailModal.jsx`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/components/RecipeDetailModal.jsx)):**
   - Como o Gemini já entrega os passos (`steps`) e ingredientes detalhados na resposta inicial, o modal abre instantaneamente ao clique no card, sem latência adicional.
   - Manutenção do contrato de dados para que a interface permaneça estável.

### 2.3 Critérios de Pronto
- [x] Chave `GEMINI_API_KEY` cadastrada nos segredos do Supabase.
- [x] Edge Function atualizada gerando receitas estruturadas em JSON 100% em português brasileiro nativo (Structured Output via JSON Schema).
- [x] Receitas sugeridas priorizam os ingredientes ativos da despensa e apresentam instruções práticas e claras.
- [x] Modal de detalhes abre instantaneamente com passos numerados e ingredientes (em estoque vs a comprar) — sem segunda requisição.
- [x] ESLint e Vite build executados com sucesso (sem erros).

> [!IMPORTANT]
> **Deploy manual necessário:** A Edge Function foi atualizada no repositório local e commitada. Para ativar em produção, o deploy deve ser feito manualmente pelo usuário:
> - **Opção A (Terminal):** `npx supabase functions deploy recipe-suggestions --project-ref cojcrquveckvrdzjivmc`
> - **Opção B (Dashboard):** https://supabase.com/dashboard/project/cojcrquveckvrdzjivmc/functions → abrir `recipe-suggestions` → editar código → colar conteúdo de `supabase/functions/recipe-suggestions/index.ts` → Deploy

---

## Fase 3 — Movimentações de Estoque (`stock_movements`) e Consumo de Receitas

### 3.1 Objetivo
Vincular a decisão de cozinhar à gestão real de despensa: ao fazer uma receita, os itens disponíveis utilizados são automaticamente registrados como **Consumidos** em `stock_movements` e seu status é atualizado na despensa.

### 3.2 Alterações Técnicas

1. **Evolução do Schema do Banco (Nova Migração SQL):**
   - Adicionar coluna de status na tabela `pantry_items`:
     ```sql
     alter table public.pantry_items
     add column if not exists status text not null default 'em_estoque'
     check (status in ('em_estoque', 'consumido', 'descartado'));
     ```
   - A tabela `stock_movements` já existente possui suporte nativo para `movement_type = 'consumption'`, `quantity`, `reason` e FK com `pantry_items`.
2. **Novo Serviço ([`app/src/services/movements.js`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/services/movements.js)):**
   - Implementar `consumeRecipeIngredients({ recipeId, recipeTitle, pantryItemIds })`:
     - Em uma transação / lote:
       1. Insere linhas em `stock_movements` com `movement_type: 'consumption'`, `reason: 'Preparo da receita: ' || recipeTitle`.
       2. Atualiza `pantry_items`: define `status = 'consumido'` e `archived_at = now()` (ou ajusta a quantidade para 0).
3. **Fluxo na Interface:**
   - No modal de detalhes da receita (criado na Fase 2), o botão **"Cozinhar esta receita"** abre uma tela de confirmação listando os itens da despensa correspondentes.
   - O usuário pode escolher para cada item:
     - **Consumo total** (adequado para frutas, legumes ou itens unitários inteiros): o item é marcado integralmente como `consumido` e arquivado.
     - **Consumo fracionado / parcial** (adequado para pacotes de arroz, feijão, farinha, etc.): o usuário informa a quantidade utilizada, debitando do saldo atual e mantendo o saldo remanescente ativo na despensa.
   - Após confirmação, os registros correspondentes são gravados em `stock_movements`, feedback de sucesso é exibido e a despensa é atualizada automaticamente.

### 3.3 Critérios de Pronto
- [x] Confirmação de receita gera registros auditáveis em `stock_movements`.
- [x] Itens consumidos saem da contagem ativa de "Em estoque agora" (ou ganham etiqueta visual).
- [x] Base de dados passa a acumular dados reais para a medição de desperdício do TCC.

> [!NOTE]
> **Migração aplicada:** o arquivo [`20261108120000_stock_movements_consumption.sql`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/supabase/migrations/20261108120000_stock_movements_consumption.sql) foi aplicado no projeto `cojcrquveckvrdzjivmc` em 08/11/2026 via `npx supabase db push --remote cojcrquveckvrdzjivmc --yes`. Ele adiciona a coluna `status` e a função transacional `consume_recipe_ingredients`. Para outro ambiente, aplique a migração antes de usar o botão **Confirmar consumo**.

---

## Fase 4 — Planejamento Semanal Dinâmico e Persistente

### 4.1 Objetivo
Substituir a grade estática de mock da semana por um cronograma real armazenado no banco, onde o usuário agenda refeições com base nos ingredientes que tem em casa.

### 4.2 Alterações Técnicas

1. **Nova Migração SQL (`meal_plans`):**
   ```sql
   create table public.meal_plans (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users(id) on delete cascade,
     day_of_week text not null check (day_of_week in ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM')),
     meal_type text not null check (meal_type in ('Almoço', 'Jantar', 'Café', 'Lanche')),
     recipe_id text,
     recipe_title text not null,
     recipe_image text,
     created_at timestamptz not null default now(),
     constraint meal_plans_unique_slot unique (user_id, day_of_week, meal_type)
   );
   alter table public.meal_plans enable row level security;
   -- Políticas RLS para select, insert, update e delete vinculadas a auth.uid() = user_id
   ```
2. **Novo Serviço ([`app/src/services/mealPlan.js`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/services/mealPlan.js)):**
   - `listWeeklyPlan()`: busca refeições cadastradas da semana do usuário.
   - `assignMealToDay({ dayOfWeek, mealType, recipe })`: agenda ou substitui a refeição.
   - `removeMealPlan(id)`: desmarca o slot da semana.
3. **Interface ([`App.jsx`](file:///home/gustavo-bongiovani/Documentos/GitHub/Smart-Pantry/app/src/app/App.jsx)):**
   - Permitir adicionar uma receita sugerida ao planejamento semanal diretamente pelo card/modal ("Adicionar ao planejamento").
   - Na seção "Sua semana", renderizar os slots reais. Se preenchido, exibir nome, tipo de refeição e botão para remover ou ver detalhes da receita.

### 4.3 Critérios de Pronto
- [ ] Usuário pode agendar qualquer receita sugerida para um dia e refeição específicos.
- [ ] O planejamento persiste no banco após recarregar a página.
- [ ] Usuário pode desmarcar ou substituir uma refeição da semana.

---

## Ordem de Execução Recomendada

1. **Incremento 1.1:** Fase 1 (Edição e Exclusão) — entrega rápida, fecha o CRUD da despensa.
2. **Incremento 1.2:** Fase 2 (Modal de Detalhes da Receita via Gemini) — prepara a visualização e a base para a ação de cozinhar.
3. **Incremento 1.3:** Fase 3 (Tabela `stock_movements` e Ação de Consumo) — conecta a receita ao estoque real.
4. **Incremento 1.4:** Fase 4 (Planejamento Semanal Persistente) — consolida a organização da rotina do usuário.
