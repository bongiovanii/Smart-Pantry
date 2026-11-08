// Relaciona os nomes usados pelo Gemini (usedIngredients) aos itens reais da
// despensa. Como a receita não recebe o id do item, a correspondência é feita
// por nome normalizado, tolerando acentos, maiúsculas e variações de plural.

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singularize(token) {
  // "tomates" -> "tomate"; palavras curtas (ex.: "gás") são preservadas.
  if (token.length > 3 && token.endsWith('s')) return token.slice(0, -1)
  return token
}

function tokenize(value) {
  return normalizeName(value).split(' ').filter(Boolean).map(singularize)
}

function containsSequence(haystack, needle) {
  if (needle.length === 0 || needle.length > haystack.length) return false

  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    let matches = true

    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) {
        matches = false
        break
      }
    }

    if (matches) return true
  }

  return false
}

export function ingredientNamesMatch(firstName, secondName) {
  const firstTokens = tokenize(firstName)
  const secondTokens = tokenize(secondName)

  if (firstTokens.length === 0 || secondTokens.length === 0) return false

  // Ex.: "tomate" corresponde a "tomate"; "arroz" corresponde a
  // "arroz integral"; "sal" NÃO corresponde a "salsicha", pois a comparação
  // trabalha com tokens inteiros.
  return (
    containsSequence(firstTokens, secondTokens) ||
    containsSequence(secondTokens, firstTokens)
  )
}

export function findMatchingPantryItems(usedIngredients, pantryItems) {
  const usedNames = (usedIngredients ?? [])
    .map((ingredient) =>
      typeof ingredient === 'string' ? ingredient : ingredient?.name,
    )
    .filter(Boolean)

  if (usedNames.length === 0 || !Array.isArray(pantryItems)) return []

  return pantryItems.filter((item) =>
    usedNames.some((name) => ingredientNamesMatch(item.name, name)),
  )
}
