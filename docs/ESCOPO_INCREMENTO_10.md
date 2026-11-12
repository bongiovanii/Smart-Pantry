# Smart Pantry — Escopo do Incremento 10

**Data:** 12 de novembro de 2026

**Fase correspondente no plano v3:** Fase 12 — Dashboard de Consumo, Desperdício e Sustentabilidade

**Responsável técnico:** Gustavo Bongiovani

**Status:** concluído em código, migração remota aplicada no Supabase (`cojcrquveckvrdzjivmc`), 87 testes unitários passando no Vitest, build de produção validado e lint com 0 erros.

---

## 1. Objetivo do incremento

Implementar a aba **Dashboard de Consumo**, proporcionando ao usuário uma visão analítica abrangente sobre o fluxo dos seus alimentos:
1. Mapeamento de **Desperdício (kg)** e histórico semanal com curva de tendência;
2. Estimativa de **Custo Financeiro Desperdiçado (R$)** com base na precificação média da cesta alimentar brasileira (CEAGESP/IBGE);
3. **Taxa de Aproveitamento e Eficiência (%)** calculada a partir da proporção entre o que foi consumido e o que foi descartado;
4. Monitoramento proativo de **Alimentos em Risco** (vencendo em até 3 dias ou vencidos) com call-to-action imediato: *"Ver receitas para aproveitar"*;
5. Gráfico Donut de **Principais Categorias Desperdiçadas** (Hortifrúti, Panificação, Laticínios, Carnes, Grãos, etc.);
6. Mapeamento de **Impacto Ambiental** (Pegada hídrica em litros de água doce e emissões de $CO_2$ em kg baseadas em fatores da FAO);
7. **Modal de Baixa de Alimentos na Despensa** que permite ao usuário informar se o alimento foi consumido fora do app, se estragou/venceu ou se foi erro de cadastro.

---

## 2. Decisões arquiteturais e modelo de dados

1. **Migração `20261112233000_consumption_dashboard_and_waste.sql`:**
   - Funções utilitárias no banco:
     - `public.pantry_unit_to_kg(p_quantity, p_unit, p_category)`: Converte unidades heterogêneas (`un`, `g`, `kg`, `l`, `ml`, `pacote`, `caixa`, `lata`) para quilogramas equivalentes ($kg_{eq}$);
     - `public.pantry_category_price(p_category)`: Preços médios por kg para cada categoria alimentar;
     - `public.pantry_category_water_liters(p_category)`: Fatores médios de pegada hídrica (L/kg);
   - RPC `public.record_pantry_discard(p_item_id uuid, p_disposition text, p_reason text)`:
     - `'consumed'`: grava movimentação `consumption`, define status `'consumido'` e arquiva;
     - `'wasted'`: grava movimentação `waste`, define status `'descartado'` e arquiva;
     - `'mistake'`: apenas arquiva sem distorcer o histórico de consumo nem de desperdício;
   - RPC `public.get_consumption_dashboard_data(p_period text default '8_weeks')`:
     - Retorna em uma única consulta transacional: `kpis`, `timeline` semanal, `categories`, `at_risk_foods` e `eco_impact`.

2. **Gráficos SVG puros em React (Zero Dependências Pesadas):**
   - Não foram adicionadas bibliotecas externas pesadas; os gráficos de barras, linha de tendência com interpolação de Bézier cúbica e Donut com arcos trigonométricos foram implementados em SVG nativo responsivo com Tailwind CSS v4.

---

## 3. Serviços e módulos criados

- `app/src/lib/consumptionMetrics.js`:
  - `toKilogramsEquivalent(quantity, unit, category)`
  - `getCategoryPricePerKg(category)`
  - `getCategoryWaterFootprint(category)`
  - `calculateEfficiencyRate(consumedKg, wastedKg)`
  - `calculateWastedFinancialCost(wastedItems)`
  - `calculateEcologicalImpact(wastedItems)`
  - `getAtRiskUrgency(expirationDate, referenceDate)`
- `app/src/services/consumptionDashboard.js`:
  - `getConsumptionDashboardData(period)`
- `app/src/services/pantry.js`:
  - `recordPantryDiscard(itemId, disposition, reason)`

---

## 4. Componentes visuais desenvolvidos

- `app/src/components/dashboard/DashboardKpiCard.jsx`: Card estilizado para os 4 indicadores do topo.
- `app/src/components/dashboard/WasteHistoryChart.jsx`: Gráfico combinado semanal com barras de desperdício e linha de tendência escura, com modo de comparação de consumo.
- `app/src/components/dashboard/AtRiskFoodsCard.jsx`: Lista de alimentos em risco com badge de urgência e botão *"Ver receitas para aproveitar"*.
- `app/src/components/dashboard/CategoryDonutChart.jsx`: Gráfico Donut de distribuição proporcional das categorias com tooltips e legenda.
- `app/src/components/dashboard/EcoImpactCard.jsx`: Painel ecológico com litros de água doce poupados/desperdiçados, kg de $CO_2$ e alimentos salvos.
- `app/src/components/PantryDeleteModal.jsx`: Modal de confirmação para triagem de alimentos na despensa (consumido vs estragado vs erro).
- `app/src/app/ConsumptionDashboardPage.jsx`: Página agregadora completa do Dashboard de Consumo.

---

## 5. Evidências de teste e validação

- **Vitest:** 10 arquivos de teste, 87 testes unitários passando.
- **ESLint:** 0 erros e 0 warnings.
- **Vite Build:** Build de produção bem-sucedido em ~375ms.
- **Supabase db push:** Migração aplicada no ambiente de produção remoto (`cojcrquveckvrdzjivmc`).
