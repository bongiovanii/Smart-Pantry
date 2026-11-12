import { useCallback, useEffect, useState } from 'react'
import AtRiskFoodsCard from '../components/dashboard/AtRiskFoodsCard.jsx'
import CategoryDonutChart from '../components/dashboard/CategoryDonutChart.jsx'
import DashboardKpiCard from '../components/dashboard/DashboardKpiCard.jsx'
import EcoImpactCard from '../components/dashboard/EcoImpactCard.jsx'
import WasteHistoryChart from '../components/dashboard/WasteHistoryChart.jsx'
import PantryLoadingState from '../components/PantryLoadingState.jsx'
import { getConsumptionDashboardData } from '../services/consumptionDashboard.js'

export default function ConsumptionDashboardPage({
  onFindRecipesForIngredient,
  onNavigateToSuggestions,
}) {
  const [period, setPeriod] = useState('8_weeks')
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await getConsumptionDashboardData(period)
      setData(response)
    } catch (err) {
      console.error('Erro ao carregar métricas de consumo:', err)
      setError(
        err?.message || 'Não foi possível carregar as métricas de consumo.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [period])

  useEffect(() => {
    let isActive = true

    getConsumptionDashboardData(period)
      .then((response) => {
        if (isActive) {
          setData(response)
          setError('')
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(
            err?.message || 'Não foi possível carregar as métricas de consumo.',
          )
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [period])

  return (
    <div className="space-y-6">
      {/* Cabeçalho da aba */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
            Consumo & Desperdício
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
            Mapeamento inteligente de consumo, economia financeira e impacto ambiental.
          </p>
        </div>

        {/* Seletor de período */}
        <div className="flex items-center gap-1.5 self-start rounded-xl border border-outline-variant/50 bg-white p-1 shadow-xs sm:self-auto">
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              period === '30_days'
                ? 'bg-secondary-container text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setPeriod('30_days')}
            type="button"
          >
            30 dias
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              period === '8_weeks'
                ? 'bg-secondary-container text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setPeriod('8_weeks')}
            type="button"
          >
            8 semanas
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              period === 'all'
                ? 'bg-secondary-container text-primary shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            onClick={() => setPeriod('all')}
            type="button"
          >
            Geral
          </button>
        </div>
      </div>

      {/* Estados de carregamento e erro */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-20">
          <PantryLoadingState
            message="Calculando métricas da sua despensa..."
            submessage="Mapeando histórico de consumo e impacto ambiental"
          />
        </div>
      )}

      {error && !data && (
        <div className="surface-card flex flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-red-600">
            error
          </span>
          <p className="text-sm font-semibold text-on-surface">{error}</p>
          <button
            className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-container"
            onClick={loadData}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Linha dos 4 KPIs do topo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: Desperdício Mensal */}
            <DashboardKpiCard
              badgeText={
                data.kpis.diff_waste_pct !== 0
                  ? `${data.kpis.diff_waste_pct > 0 ? '+' : ''}${data.kpis.diff_waste_pct}% vs anterior`
                  : 'Estável'
              }
              badgeType={data.kpis.diff_waste_pct <= 0 ? 'positive' : 'negative'}
              icon="delete_sweep"
              iconBg="bg-emerald-100 text-emerald-800"
              subtext="acumulado no período"
              title="Desperdício no Período"
              value={`${data.kpis.waste_kg.toLocaleString('pt-BR')} kg`}
            />

            {/* KPI 2: Valor Desperdiçado (R$) */}
            <DashboardKpiCard
              badgeText={data.kpis.diff_waste_pct > 0 ? 'Em alta' : 'Em queda'}
              badgeType={data.kpis.diff_waste_pct > 0 ? 'negative' : 'positive'}
              icon="payments"
              iconBg="bg-red-100 text-red-800"
              subtext="custo médio estimado"
              title="Valor Desperdiçado"
              value={`R$ ${data.kpis.waste_cost_brl.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            />

            {/* KPI 3: Aproveitamento de Alimentos */}
            <DashboardKpiCard
              badgeText={
                data.kpis.efficiency_pct >= 75 ? 'Eficiente' : 'Atenção'
              }
              badgeType={
                data.kpis.efficiency_pct >= 75 ? 'positive' : 'warning'
              }
              icon="pie_chart"
              iconBg="bg-emerald-100 text-primary"
              subtext="de consumo eficiente"
              title="Aproveitamento"
              value={`${data.kpis.efficiency_pct}%`}
            />

            {/* KPI 4: Próximos do Vencimento */}
            <DashboardKpiCard
              badgeText={
                data.kpis.at_risk_count > 0 ? 'Ação imediata' : 'Tudo em dia'
              }
              badgeType={data.kpis.at_risk_count > 0 ? 'warning' : 'positive'}
              icon="event_busy"
              iconBg="bg-amber-100 text-amber-800"
              subtext={
                data.kpis.at_risk_count > 0
                  ? 'Precisam de atenção'
                  : 'Nenhum item em risco'
              }
              title="Próximos do Vencimento"
              value={`${data.kpis.at_risk_count} ${
                data.kpis.at_risk_count === 1 ? 'item' : 'itens'
              }`}
            />
          </div>

          {/* Grid intermediário: Histórico semanal + Alimentos em risco */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-full">
              <WasteHistoryChart timeline={data.timeline} />
            </div>
            <div className="h-full">
              <AtRiskFoodsCard
                items={data.atRiskFoods}
                onFindRecipesForIngredient={onFindRecipesForIngredient}
                onViewAllSuggestions={onNavigateToSuggestions}
              />
            </div>
          </div>

          {/* Grid inferior: Principais categorias + Impacto ambiental */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-full">
              <CategoryDonutChart categories={data.categories} />
            </div>
            <div className="h-full">
              <EcoImpactCard
                co2Kg={data.ecoImpact.co2_kg}
                foodSavedKg={data.ecoImpact.food_saved_kg}
                waterLiters={data.ecoImpact.water_liters}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
