# Escopo do Incremento 6 — Templates de planejamento semanal, ciclo de 4 semanas e histórico

> **Status:** implementado em 12/11/2026, com migração `20261112180000_meal_plan_templates.sql` aplicada no banco de dados remoto Supabase, serviços implementados, página `PlanningPage` e modais integrados à navegação principal e testes unitários passando com 100% de sucesso.
>
> **Projeto:** Smart Pantry — TCC
>
> **Ambiente Supabase:** `cojcrquveckvrdzjivmc` (`https://cojcrquveckvrdzjivmc.supabase.co`)
>
> **Frontend:** React 19 + Vite 8 + Tailwind CSS 4
>
> **Documento anterior:** [`ESCOPO_INCREMENTO_5.md`](./ESCOPO_INCREMENTO_5.md)

---

## 1. Objetivo

Implementar a **Fase 5** do [`plano_implementacao_v3.md`](./plano_implementacao_v3.md), transformando o planejamento semanal em um sistema completo com:

1. **Até 4 templates semanais** por usuário (um para cada semana de um ciclo de 4 semanas), com nome obrigatório e descrição opcional;
2. **Ciclo contínuo de 4 semanas** que avança automaticamente e repete os templates a cada mês (recorrência inteligente);
3. **Aplicação com substituição atômica**, permitindo aplicar um template à semana atual sem alterar o template original caso a semana seja editada posteriormente;
4. **Editor de templates** dedicado (`TemplateEditorModal`), permitindo preencher ou ajustar os slots de refeições dia a dia usando as receitas da biblioteca;
5. **Histórico persistente de semanas passadas** (`meal_plan_weeks`), permitindo consultar cardápios executados anteriormente;
6. **Aba de Planejamento dedicada** na navegação principal (`PlanningPage.jsx`), mantendo também o resumo visual da semana atual na tela da despensa.

---

## 2. Funcionalidades incluídas

### 2.1 Modelo de dados e migração SQL (`20261112180000_meal_plan_templates.sql`)

- **Evolução de `public.meal_plans`:**
  - Adicionada coluna `week_start date not null default (date_trunc('week', now()))::date`;
  - Nova constraint única: `unique (user_id, week_start, day_of_week, meal_type)`, permitindo armazenar refeições de diferentes semanas sem conflito;
  - Preservação do `recipe_snapshot jsonb` com os dados canônicos da receita.
- **Tabela `public.meal_plan_cycles`:**
  - Controla o ciclo ativo de 4 semanas por usuário (`started_on date`, `status text in ('active', 'closed')`);
  - Índice parcial único garantindo no máximo um ciclo ativo por usuário.
- **Tabela `public.meal_plan_templates`:**
  - Guarda até 4 templates por usuário (`week_index between 1 and 4`, `name text`, `description text`);
  - Constraint `unique (user_id, week_index)` impedindo mais de um template por semana do ciclo.
- **Tabela `public.meal_plan_template_items`:**
  - Slots dia × refeição de cada template com `recipe_snapshot`, RLS e constraint única por slot.
- **Tabela `public.meal_plan_weeks`:**
  - Metadados das semanas aplicadas (`week_start`, `week_index`, `applied_template_id`), conectando o histórico ao ciclo.
- **RPCs transacionais no PostgreSQL:**
  - `get_or_create_active_cycle()`: obtém ou inicializa o ciclo na segunda-feira atual;
  - `sync_meal_plan_week()`: sincroniza a semana corrente, calcula o `week_index` (1 a 4) e aplica template recorrente de forma segura caso a semana esteja vazia;
  - `apply_meal_plan_template(p_template_id)`: substitui todas as refeições da semana atual pelas refeições do template em transação atômica;
  - `save_current_week_as_template(p_name, p_description)`: cria ou atualiza o template da semana do ciclo com os pratos planejados na semana corrente;
  - `duplicate_meal_plan_template(p_template_id)`: duplica um template e seus itens para a primeira semana livre do ciclo;
  - `list_meal_plan_history(p_page, p_page_size)`: pagina o histórico de semanas passadas com contagem de refeições e template associado;
  - `start_new_meal_plan_cycle()`: encerra o ciclo ativo e inicia um novo a partir da semana corrente.

### 2.2 Camada de serviços (`mealPlan.js` e `mealPlanTemplates.js`)

- `app/src/services/mealPlanTemplates.js`:
  - `listTemplates()`: lista os templates com contagem de refeições;
  - `createTemplate({ name, description, weekIndex })`: valida e insere novo template;
  - `updateTemplate(id, { name, description })`: renomeia ou altera descrição;
  - `deleteTemplate(id)`: remove template e seus itens em cascata;
  - `duplicateTemplate(id)`: aciona duplicação atômica via RPC;
  - `saveCurrentWeekAsTemplate({ name, description })`: grava semana atual como template via RPC;
  - `applyTemplate(id)`: aplica o template na semana via RPC;
  - `listTemplateItems(templateId)`: lista os slots do template;
  - `upsertTemplateItem(templateId, { dayOfWeek, mealType, recipe })`: agenda receita em slot do template;
  - `removeTemplateItem(itemId)`: desmarca slot do template.
- `app/src/services/mealPlan.js`:
  - `listWeeklyPlan(weekStart)`: busca refeições da semana informada (padrão: segunda-feira atual de Brasília);
  - `syncCurrentWeek()`: executa `sync_meal_plan_week` e retorna o contexto da semana/ciclo;
  - `listPlanHistory({ page, pageSize })`: consulta semanas anteriores paginadas;
  - `startNewMealPlanCycle()`: reinicia o ciclo de 4 semanas.

### 2.3 Interface e componentes React

- **Página principal `PlanningPage.jsx`:**
  - Cabeçalho com badge da semana do ciclo ("Semana X de 4"), intervalo formatado no fuso de Brasília e template aplicado;
  - Seção da **Semana atual** com a grade completa `WeekPlanner`, permitindo adicionar, abrir detalhes e remover refeições;
  - Seção **Meus templates** com cards de progresso (X de 28 refeições), ações rápidas (Aplicar, Editar, Renomear, Duplicar, Excluir) e botão para criar novo template nas semanas livres;
  - Seção **Histórico de semanas** com cards de semanas passadas, quantidade de refeições, template utilizado, botão "Ver refeições" e paginação;
  - Botão "Salvar como template" para transformar a semana corrente em template do ciclo;
  - Botão "Novo ciclo" para reiniciar a contagem de semanas.
- **Modais integrados:**
  - `TemplateFormModal.jsx`: criação, renomeação e salvamento de templates com validações de tamanho;
  - `TemplateEditorModal.jsx`: editor completo da grade do template dia a dia;
  - `TemplateItemModal.jsx`: seletor de refeição e dia para o template conectado à biblioteca de receitas;
  - `PlanHistoryModal.jsx`: visualizador somente leitura das refeições de semanas anteriores;
  - `ConfirmDialog.jsx`: diálogos de confirmação para aplicar template (com aviso de substituição), excluir template e reiniciar ciclo.
- **Navegação no `App.jsx`:**
  - Aba **Planejamento** conectada na Sidebar e na barra inferior mobile (`view: 'planejamento'`);
  - Sincronização automática do ciclo ao abrir o app (`syncCurrentWeek`);
  - Preservação da visualização resumida da semana na aba da despensa.

---

## 3. Arquivos alterados e criados

| Arquivo | Natureza | Descrição |
|---|---|---|
| `supabase/migrations/20261112180000_meal_plan_templates.sql` | Criado | Migração completa com tabelas de ciclo, templates, itens, histórico e 7 RPCs. |
| `app/src/services/mealPlanTemplates.js` | Criado | Serviço de gerenciamento de templates e itens. |
| `app/src/services/mealPlan.js` | Modificado | Suporte a `week_start`, `syncCurrentWeek`, histórico e novo ciclo. |
| `app/src/app/PlanningPage.jsx` | Criado / Finalizado | Página completa de planejamento com semana atual, templates e histórico. |
| `app/src/components/TemplateFormModal.jsx` | Criado | Modal de criação/edição/salvamento de template. |
| `app/src/components/TemplateEditorModal.jsx` | Criado | Modal de edição da grade de refeições do template. |
| `app/src/components/TemplateItemModal.jsx` | Criado | Modal de seleção de refeição para template. |
| `app/src/components/PlanHistoryModal.jsx` | Criado | Modal de visualização de histórico de semanas anteriores. |
| `app/src/components/ConfirmDialog.jsx` | Criado | Diálogo de confirmação reutilizável com foco e acessibilidade. |
| `app/src/app/App.jsx` | Modificado | Integração da navegação, sincronização do ciclo e renderização da página. |
| `app/src/lib/week.js` | Modificado | Funções de segunda-feira, avanço de semanas e índice de ciclo. |
| `app/src/lib/__tests__/week.test.js` | Modificado | Correção do teste de virada de dia no fuso de Brasília. |
| `app/src/services/__tests__/mealPlanTemplates.test.js` | Criado | Suíte de testes unitários para validações de templates. |

---

## 4. Decisões de engenharia adotadas

1. **4 templates = 4 semanas do ciclo:** O usuário possui no máximo 4 templates, cada um associado a uma das semanas do ciclo de 4 semanas. Isso impede sobrecarga e cria uma rotina simples e reutilizável.
2. **Independência entre template e semana ativa:** A aplicação copia as refeições do template para a semana ativa. Modificar a semana não altera o template gravado, e editar o template não altera retrospectivamente semanas já planejadas.
3. **Recorrência não destrutiva:** Na virada de semana, se o usuário tiver um template cadastrado para o `week_index` e a nova semana estiver vazia, o template é aplicado automaticamente. Caso o usuário já tenha planejado manualmente refeições na nova semana, nada é sobrescrito.
4. **Resolução de regras de hooks do React 19:** Todos os modais inicializam seus estados de formulário a partir das props recebidas no `useState` e usam chaves (`key`) controladas pelo pai para reset limpo na reabertura, eliminando o anti-padrão de chamadas síncronas a `setState` em `useEffect`.

---

## 5. Verificações realizadas

- **Migração Supabase:** Aplicada remotamente com sucesso via `list_migrations` confirmando `20261112180000_meal_plan_templates`.
- **Testes unitários (Vitest):** 44 testes em 5 suítes passando com 100% de sucesso (`recipeNormalization`, `recipeRecord`, `week`, `pantry`, `mealPlanTemplates`).
- **ESLint:** Executado sobre 100% dos arquivos do projeto com zero erros e zero advertências.
- **Build de produção:** `vite build` executado com sucesso, gerando bundles minificados sem inconsistências.

---

## 6. Próximos passos

Conforme a ordem de dependências do [`plano_implementacao_v3.md`](./plano_implementacao_v3.md):

1. **Fase 6 — Favoritas:** Componente `FavoriteButton`, filtro e aba Favoritas em Minhas receitas reaproveitando a coluna `is_favorite` da biblioteca de receitas.
2. **Fase 8 — Dark Mode e aba Configurações:** Suporte a tema claro/escuro/sistema e tokens semânticos no Tailwind.
3. **Fase 9 — Minha lista de compras:** Fluxo de reposição na despensa e lista de compras inteligente.
