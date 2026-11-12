import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const DEFAULT_KPIS = {
  waste_kg: 0,
  waste_cost_brl: 0,
  consumed_kg: 0,
  efficiency_pct: 100,
  prev_waste_kg: 0,
  diff_waste_pct: 0,
  at_risk_count: 0,
}

const DEFAULT_ECO = {
  water_liters: 0,
  co2_kg: 0,
  food_saved_kg: 0,
}

/**
 * Consulta as métricas analíticas agregadas de consumo e desperdício.
 *
 * @param {'30_days' | '8_weeks' | 'all'} period
 */
export async function getConsumptionDashboardData(period = '8_weeks') {
  await getCurrentSession()

  const { data, error } = await supabase.rpc(
    'get_consumption_dashboard_data',
    {
      p_period: period,
    },
  )

  if (error) throw error

  return {
    period: data?.period || period,
    kpis: {
      ...DEFAULT_KPIS,
      ...(data?.kpis || {}),
    },
    timeline: Array.isArray(data?.timeline) ? data.timeline : [],
    categories: Array.isArray(data?.categories) ? data.categories : [],
    atRiskFoods: Array.isArray(data?.at_risk_foods) ? data.at_risk_foods : [],
    ecoImpact: {
      ...DEFAULT_ECO,
      ...(data?.eco_impact || {}),
    },
  }
}
