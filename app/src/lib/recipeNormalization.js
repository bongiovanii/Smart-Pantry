/**
 * Normalização compartilhada de títulos e ingredientes.
 *
 * As mesmas regras são usadas no frontend e na Edge Function (em uma cópia
 * Deno) para que a biblioteca de receitas consiga casar nomes com acentos,
 * maiúsculas e plural sem depender do Gemini.
 */

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeRecipeTitle(value) {
  return normalizeText(value)
}

function singularizeIngredientWord(word) {
  if (word.length <= 3) return word
  if (word.endsWith('oes') || word.endsWith('aes')) {
    return `${word.slice(0, -3)}ao`
  }
  if (word.endsWith('eis')) return `${word.slice(0, -3)}el`
  if (word.endsWith('ais')) return `${word.slice(0, -3)}al`
  if (word.endsWith('is')) return `${word.slice(0, -2)}il`
  if (word.endsWith('ns')) return `${word.slice(0, -2)}m`
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

export function normalizeIngredientName(value) {
  return normalizeText(value)
    .split(' ')
    .filter(Boolean)
    .map(singularizeIngredientWord)
    .join(' ')
}

/**
 * Extrai os nomes normalizados dos ingredientes que a receita usa da despensa.
 * Ingredientes faltantes não entram no cache: eles não ajudam a decidir se a
 * receita combina com o que o usuário já tem.
 */
export function buildIngredientNames(recipe) {
  const usedIngredients = Array.isArray(recipe?.usedIngredients)
    ? recipe.usedIngredients
    : []

  const names = usedIngredients
    .map((ingredient) => {
      if (typeof ingredient === 'string') return ingredient
      return ingredient?.name ?? ''
    })
    .map(normalizeIngredientName)
    .filter(Boolean)

  return [...new Set(names)]
}
