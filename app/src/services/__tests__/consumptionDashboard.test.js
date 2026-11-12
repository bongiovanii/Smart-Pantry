import { describe, expect, it, vi } from 'vitest'
import { getConsumptionDashboardData } from '../consumptionDashboard.js'
import { recordPantryDiscard } from '../pantry.js'

vi.mock('../../lib/session.js', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id' },
  }),
}))

const mockRpc = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
  },
}))

describe('consumptionDashboard service', () => {
  it('calls get_consumption_dashboard_data and normalizes defaults', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        period: '8_weeks',
        kpis: {
          waste_kg: 12.4,
          waste_cost_brl: 184.5,
          efficiency_pct: 78,
          at_risk_count: 5,
        },
        timeline: [{ week_label: 'Sem 01', waste_kg: 10, consumed_kg: 25 }],
        categories: [{ category: 'hortifruti', percentage: 40, kg: 5.0 }],
        at_risk_foods: [{ id: 'item-1', name: 'Tomate', days_remaining: 1 }],
        eco_impact: { water_liters: 15000, co2_kg: 25, food_saved_kg: 30 },
      },
      error: null,
    })

    const result = await getConsumptionDashboardData('8_weeks')
    expect(mockRpc).toHaveBeenCalledWith('get_consumption_dashboard_data', {
      p_period: '8_weeks',
    })
    expect(result.kpis.waste_kg).toBe(12.4)
    expect(result.kpis.waste_cost_brl).toBe(184.5)
    expect(result.timeline).toHaveLength(1)
    expect(result.categories).toHaveLength(1)
    expect(result.atRiskFoods).toHaveLength(1)
    expect(result.ecoImpact.water_liters).toBe(15000)
  })

  it('handles null/empty response gracefully with safe defaults', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const result = await getConsumptionDashboardData('30_days')
    expect(result.period).toBe('30_days')
    expect(result.kpis.efficiency_pct).toBe(100)
    expect(result.kpis.waste_kg).toBe(0)
    expect(result.timeline).toEqual([])
    expect(result.categories).toEqual([])
    expect(result.atRiskFoods).toEqual([])
    expect(result.ecoImpact.water_liters).toBe(0)
  })
})

describe('recordPantryDiscard service', () => {
  it('calls record_pantry_discard RPC with valid parameters', async () => {
    mockRpc.mockResolvedValueOnce({
      data: { id: 'item-123', status: 'descartado' },
      error: null,
    })

    const result = await recordPantryDiscard('item-123', 'wasted', 'Venceu')
    expect(mockRpc).toHaveBeenCalledWith('record_pantry_discard', {
      p_item_id: 'item-123',
      p_disposition: 'wasted',
      p_reason: 'Venceu',
    })
    expect(result.status).toBe('descartado')
  })

  it('throws error when disposition is invalid', async () => {
    await expect(
      recordPantryDiscard('item-123', 'invalid_disposition'),
    ).rejects.toThrow('Motivo de baixa inválido.')
  })
})
