import { describe, expect, it } from 'vitest'
import {
  calculateEcologicalImpact,
  calculateEfficiencyRate,
  calculateWastedFinancialCost,
  getAtRiskUrgency,
  getCategoryPricePerKg,
  getCategoryWaterFootprint,
  normalizeCategoryKey,
  toKilogramsEquivalent,
} from '../consumptionMetrics.js'

describe('consumptionMetrics', () => {
  describe('normalizeCategoryKey', () => {
    it('normalizes accents, casing, and aliases', () => {
      expect(normalizeCategoryKey('Hortifrúti')).toBe('hortifruti')
      expect(normalizeCategoryKey('Frutas e Verduras')).toBe('hortifruti')
      expect(normalizeCategoryKey('Panificação')).toBe('panificacao')
      expect(normalizeCategoryKey('Laticínios')).toBe('laticinios')
      expect(normalizeCategoryKey('Grãos')).toBe('graos')
      expect(normalizeCategoryKey('Carnes')).toBe('carnes')
      expect(normalizeCategoryKey('Bebidas')).toBe('bebidas')
      expect(normalizeCategoryKey(null)).toBe('outros')
      expect(normalizeCategoryKey('')).toBe('outros')
    })

    it('returns reference prices and water footprint factors', () => {
      expect(getCategoryPricePerKg('hortifruti')).toBe(8.5)
      expect(getCategoryPricePerKg('carnes')).toBe(38.0)
      expect(getCategoryWaterFootprint('hortifruti')).toBe(350)
      expect(getCategoryWaterFootprint('carnes')).toBe(10500)
    })
  })

  describe('toKilogramsEquivalent', () => {
    it('converts direct kg and g', () => {
      expect(toKilogramsEquivalent(2, 'kg')).toBe(2)
      expect(toKilogramsEquivalent(500, 'g')).toBe(0.5)
      expect(toKilogramsEquivalent(1500, 'g')).toBe(1.5)
    })

    it('converts liquids l and ml', () => {
      expect(toKilogramsEquivalent(1, 'l')).toBe(1)
      expect(toKilogramsEquivalent(250, 'ml')).toBe(0.25)
    })

    it('estimates unit weights according to category', () => {
      // 4 tomatoes (hortifruti, 0.15 kg/un) => 0.6 kg
      expect(toKilogramsEquivalent(4, 'un', 'hortifruti')).toBeCloseTo(0.6)
      // 2 breads (panificacao, 0.05 kg/un) => 0.1 kg
      expect(toKilogramsEquivalent(2, 'un', 'panificacao')).toBeCloseTo(0.1)
      // 10 eggs/cheese units (laticinios, 0.06 kg/un) => 0.6 kg
      expect(toKilogramsEquivalent(10, 'un', 'laticinios')).toBeCloseTo(0.6)
      // other generic unit (0.2 kg/un)
      expect(toKilogramsEquivalent(5, 'un', 'outros')).toBeCloseTo(1.0)
    })

    it('converts packaged units (pacote, caixa, lata)', () => {
      expect(toKilogramsEquivalent(2, 'pacote')).toBe(1.0)
      expect(toKilogramsEquivalent(3, 'caixa')).toBeCloseTo(1.2)
      expect(toKilogramsEquivalent(2, 'lata')).toBeCloseTo(0.7)
    })

    it('handles invalid inputs safely', () => {
      expect(toKilogramsEquivalent(0, 'kg')).toBe(0)
      expect(toKilogramsEquivalent(-5, 'kg')).toBe(0)
      expect(toKilogramsEquivalent(null, 'kg')).toBe(0)
    })
  })

  describe('calculateEfficiencyRate', () => {
    it('calculates efficiency percentage correctly', () => {
      // 7.8 kg consumed, 2.2 kg wasted => 78%
      expect(calculateEfficiencyRate(7.8, 2.2)).toBe(78)
      // 10 kg consumed, 0 wasted => 100%
      expect(calculateEfficiencyRate(10, 0)).toBe(100)
      // 0 consumed, 5 wasted => 0%
      expect(calculateEfficiencyRate(0, 5)).toBe(0)
      // Both zero => 100% (safe initial state)
      expect(calculateEfficiencyRate(0, 0)).toBe(100)
    })
  })

  describe('calculateWastedFinancialCost', () => {
    it('calculates total cost using reference prices', () => {
      const wasted = [
        { quantity: 2, unit: 'kg', category: 'hortifruti' }, // 2 * 8.5 = 17.0
        { quantity: 1, unit: 'kg', category: 'carnes' }, // 1 * 38.0 = 38.0
        { quantity: 500, unit: 'g', category: 'laticinios' }, // 0.5 * 18.5 = 9.25
      ]
      // 17.0 + 38.0 + 9.25 = 64.25
      expect(calculateWastedFinancialCost(wasted)).toBe(64.25)
    })

    it('handles empty lists safely', () => {
      expect(calculateWastedFinancialCost([])).toBe(0)
      expect(calculateWastedFinancialCost(null)).toBe(0)
    })
  })

  describe('calculateEcologicalImpact', () => {
    it('computes water footprint and CO2 emissions', () => {
      const wasted = [
        { quantity: 1, unit: 'kg', category: 'hortifruti' }, // 350 L water, 1 kg
        { quantity: 1, unit: 'kg', category: 'carnes' }, // 10500 L water, 1 kg
      ]
      const impact = calculateEcologicalImpact(wasted)
      expect(impact.waterLiters).toBe(10850)
      expect(impact.totalWastedKg).toBe(2)
      // 2 kg * 2.1 = 4.2 kg CO2
      expect(impact.co2Kg).toBe(4.2)
    })
  })

  describe('getAtRiskUrgency', () => {
    const today = '2026-11-12'

    it('detects expired items', () => {
      const res = getAtRiskUrgency('2026-11-10', today)
      expect(res.urgency).toBe('expired')
      expect(res.daysRemaining).toBe(-2)
      expect(res.label).toContain('Venceu há 2 dias')
    })

    it('detects items expiring today', () => {
      const res = getAtRiskUrgency('2026-11-12', today)
      expect(res.urgency).toBe('critical')
      expect(res.daysRemaining).toBe(0)
      expect(res.label).toBe('Vence hoje')
    })

    it('detects items expiring tomorrow', () => {
      const res = getAtRiskUrgency('2026-11-13', today)
      expect(res.urgency).toBe('high')
      expect(res.daysRemaining).toBe(1)
      expect(res.label).toBe('Vencerá em 1 dia')
    })

    it('detects items expiring in 2-3 days', () => {
      const res = getAtRiskUrgency('2026-11-15', today)
      expect(res.urgency).toBe('moderate')
      expect(res.daysRemaining).toBe(3)
      expect(res.label).toBe('Vencerá em 3 dias')
    })

    it('detects safe items (> 3 days)', () => {
      const res = getAtRiskUrgency('2026-11-20', today)
      expect(res.urgency).toBe('safe')
      expect(res.daysRemaining).toBe(8)
    })
  })
})
