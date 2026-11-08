export const unitLabels = {
  un: 'un',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  pacote: 'pacote',
  caixa: 'caixa',
  lata: 'lata',
}

export function formatQuantity(quantity, unit) {
  const value = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
    Number(quantity),
  )
  return `${value} ${unitLabels[unit] || unit}`
}
