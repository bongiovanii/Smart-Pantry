/**
 * Algoritmos e métricas de consumo, desperdício e impacto ecológico
 * do Smart Pantry.
 */

// Tabela de preços médios de referência da cesta brasileira (R$ por kg)
export const CATEGORY_REFERENCE_PRICES_BRL = {
  carnes: 38.0,
  laticinios: 18.5,
  panificacao: 14.0,
  outros: 12.0,
  hortifruti: 8.5,
  graos: 7.5,
  bebidas: 6.0,
}

// Pegada hídrica média por categoria alimentar (Litros de água por kg de alimento)
// Fonte: Water Footprint Network & FAO
export const CATEGORY_WATER_FOOTPRINT_L_PER_KG = {
  carnes: 10500,
  laticinios: 2400,
  graos: 1600,
  panificacao: 1400,
  outros: 1250,
  bebidas: 400,
  hortifruti: 350,
}

// Fator médio de emissão de gases de efeito estufa (kg CO2 equivalente por kg de alimento em aterro)
// Fonte: FAO Food Wastage Footprint
export const CO2_KG_PER_KG_WASTE = 2.1

// Cores temáticas para gráficos alinhadas à paleta da aplicação
export const CATEGORY_CHART_COLORS = {
  hortifruti: '#154212', // Verde floresta primário
  panificacao: '#b91c1c', // Terracota / vermelho
  laticinios: '#ea580c', // Laranja quente
  graos: '#2d5a27', // Verde folha
  carnes: '#991b1b', // Vinho
  bebidas: '#0284c7', // Azul sutil
  outros: '#72796e', // Neutro outline
}

export const CATEGORY_LABELS = {
  hortifruti: 'Hortifrúti',
  panificacao: 'Panificação',
  laticinios: 'Laticínios',
  graos: 'Grãos e Cereais',
  carnes: 'Carnes e Proteínas',
  bebidas: 'Bebidas',
  outros: 'Outros',
}

/**
 * Normaliza o identificador da categoria alimentar.
 */
export function normalizeCategoryKey(rawCategory) {
  if (!rawCategory || typeof rawCategory !== 'string') return 'outros'
  const clean = rawCategory
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (clean.includes('horti') || clean.includes('frut') || clean.includes('verd')) {
    return 'hortifruti'
  }
  if (clean.includes('panific') || clean.includes('pao') || clean.includes('massa')) {
    return 'panificacao'
  }
  if (clean.includes('latici') || clean.includes('leite') || clean.includes('queijo')) {
    return 'laticinios'
  }
  if (clean.includes('grao') || clean.includes('cereal') || clean.includes('arroz') || clean.includes('feijao')) {
    return 'graos'
  }
  if (clean.includes('carne') || clean.includes('frango') || clean.includes('peixe') || clean.includes('ovo')) {
    return 'carnes'
  }
  if (clean.includes('bebid') || clean.includes('suco') || clean.includes('refrig')) {
    return 'bebidas'
  }
  return 'outros'
}

/**
 * Converte qualquer quantidade e unidade da despensa para quilogramas equivalentes (kg_eq).
 */
export function toKilogramsEquivalent(quantity, unit, category = 'outros') {
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || qty <= 0) return 0

  const cleanUnit = String(unit || '')
    .trim()
    .toLowerCase()
  const catKey = normalizeCategoryKey(category)

  switch (cleanUnit) {
    case 'kg':
      return qty
    case 'g':
      return qty / 1000
    case 'l':
      return qty * 1.0
    case 'ml':
      return qty / 1000
    case 'un':
      if (catKey === 'hortifruti') return qty * 0.15
      if (catKey === 'panificacao') return qty * 0.05
      if (catKey === 'laticinios') return qty * 0.06
      return qty * 0.2
    case 'pacote':
      return qty * 0.5
    case 'caixa':
      return qty * 0.4
    case 'lata':
      return qty * 0.35
    default:
      return qty
  }
}

/**
 * Retorna o preço estimado por kg da categoria.
 */
export function getCategoryPricePerKg(category) {
  const catKey = normalizeCategoryKey(category)
  return CATEGORY_REFERENCE_PRICES_BRL[catKey] ?? CATEGORY_REFERENCE_PRICES_BRL.outros
}

/**
 * Retorna a pegada hídrica estimada (litros por kg) da categoria.
 */
export function getCategoryWaterFootprint(category) {
  const catKey = normalizeCategoryKey(category)
  return CATEGORY_WATER_FOOTPRINT_L_PER_KG[catKey] ?? CATEGORY_WATER_FOOTPRINT_L_PER_KG.outros
}

/**
 * Calcula a taxa de aproveitamento e eficiência de alimentos (0 a 100%).
 */
export function calculateEfficiencyRate(consumedKg, wastedKg) {
  const consumed = Math.max(0, Number(consumedKg) || 0)
  const wasted = Math.max(0, Number(wastedKg) || 0)
  const total = consumed + wasted

  if (total === 0) return 100
  const rate = (consumed / total) * 100
  return Math.min(100, Math.max(0, Math.round(rate)))
}

/**
 * Calcula o custo financeiro estimado (em R$) do desperdício acumulado.
 */
export function calculateWastedFinancialCost(wastedItems = []) {
  if (!Array.isArray(wastedItems) || wastedItems.length === 0) return 0

  const total = wastedItems.reduce((acc, item) => {
    const kg = toKilogramsEquivalent(
      item.quantity,
      item.unit,
      item.category,
    )
    const pricePerKg = getCategoryPricePerKg(item.category)
    return acc + kg * pricePerKg
  }, 0)

  return Math.round(total * 100) / 100
}

/**
 * Calcula o impacto ambiental (pegada hídrica e pegada de carbono).
 */
export function calculateEcologicalImpact(wastedItems = []) {
  if (!Array.isArray(wastedItems) || wastedItems.length === 0) {
    return { waterLiters: 0, co2Kg: 0, totalWastedKg: 0 }
  }

  let totalWaterLiters = 0
  let totalWastedKg = 0

  for (const item of wastedItems) {
    const kg = toKilogramsEquivalent(
      item.quantity,
      item.unit,
      item.category,
    )
    totalWastedKg += kg
    const waterFactor = getCategoryWaterFootprint(item.category)
    totalWaterLiters += kg * waterFactor
  }

  const co2Kg = Math.round(totalWastedKg * CO2_KG_PER_KG_WASTE * 10) / 10
  const waterLiters = Math.round(totalWaterLiters)

  return {
    waterLiters,
    co2Kg,
    totalWastedKg: Math.round(totalWastedKg * 10) / 10,
  }
}

/**
 * Analisa a urgência e situação de um alimento quanto ao vencimento.
 */
export function getAtRiskUrgency(expirationDate, referenceDate = new Date()) {
  if (!expirationDate) {
    return {
      daysRemaining: null,
      urgency: 'safe',
      label: 'Sem validade informada',
      badgeClass: 'bg-zinc-100 text-zinc-600',
    }
  }

  const todayStr =
    typeof referenceDate === 'string'
      ? referenceDate.slice(0, 10)
      : referenceDate.toISOString().slice(0, 10)

  const expStr = String(expirationDate).slice(0, 10)

  const [tY, tM, tD] = todayStr.split('-').map(Number)
  const [eY, eM, eD] = expStr.split('-').map(Number)

  const todayUtc = Date.UTC(tY, tM - 1, tD)
  const expUtc = Date.UTC(eY, eM - 1, eD)

  const diffDays = Math.round((expUtc - todayUtc) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const abs = Math.abs(diffDays)
    return {
      daysRemaining: diffDays,
      urgency: 'expired',
      label: abs === 1 ? 'Venceu há 1 dia' : `Venceu há ${abs} dias`,
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      actionClass: 'bg-red-700 hover:bg-red-800 text-white',
    }
  }

  if (diffDays === 0) {
    return {
      daysRemaining: 0,
      urgency: 'critical',
      label: 'Vence hoje',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      actionClass: 'bg-red-700 hover:bg-red-800 text-white',
    }
  }

  if (diffDays === 1) {
    return {
      daysRemaining: 1,
      urgency: 'high',
      label: 'Vencerá em 1 dia',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
      actionClass: 'bg-orange-700 hover:bg-orange-800 text-white',
    }
  }

  if (diffDays <= 3) {
    return {
      daysRemaining: diffDays,
      urgency: 'moderate',
      label: `Vencerá em ${diffDays} dias`,
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      actionClass: 'bg-[#154212] hover:bg-[#2d5a27] text-white',
    }
  }

  return {
    daysRemaining: diffDays,
    urgency: 'safe',
    label: `Vence em ${diffDays} dias`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    actionClass: 'bg-[#154212] hover:bg-[#2d5a27] text-white',
  }
}
