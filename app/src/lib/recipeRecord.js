import { normalizeRecipeTitle } from './recipeNormalization.js'

function normalizeIngredientList(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Converte a resposta da Edge Function para o contrato usado pelos cards.
 */
export function normalizeRecipeFromApi(recipe) {
  const usedIngredients = normalizeIngredientList(recipe?.usedIngredients)
  const missedIngredients = normalizeIngredientList(recipe?.missedIngredients)
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : []
  const readyInMinutes = Number(recipe?.readyInMinutes ?? 0)
  const servings = Number(recipe?.servings ?? 0)
  const caloriesPerServing = Number(recipe?.caloriesPerServing ?? 0)

  return {
    id: recipe?.id,
    title: recipe?.title || 'Receita sem nome',
    image: recipe?.image || '',
    category: recipe?.category || 'outros',
    readyInMinutes,
    servings,
    caloriesPerServing:
      Number.isFinite(caloriesPerServing) && caloriesPerServing > 0
        ? Math.round(caloriesPerServing)
        : 0,
    time: readyInMinutes > 0 ? `${readyInMinutes} min` : 'Tempo não informado',
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missedIngredients.length,
    usedIngredients,
    missedIngredients,
    steps,
    ingredients: `${usedIngredients.length} ingrediente${usedIngredients.length === 1 ? '' : 's'} da despensa`,
    imageQuery: recipe?.imageQuery || '',
    imageSource: recipe?.imageSource || '',
    imageAuthor: recipe?.imageAuthor || '',
    imageLicense: recipe?.imageLicense || '',
    imageLicenseUrl: recipe?.imageLicenseUrl || '',
    imageSourceUrl: recipe?.imageSourceUrl || '',
    isFavorite: Boolean(recipe?.is_favorite ?? recipe?.isFavorite),
    favoritedAt: recipe?.favorited_at ?? recipe?.favoritedAt ?? null,
    origin: recipe?.origin || 'ai',
  }
}

/**
 * Converte uma linha da tabela `recipes` para o mesmo contrato dos cards.
 */
export function normalizeRecipeFromRow(row, origin = 'library') {
  const usedIngredients = normalizeIngredientList(row?.used_ingredients)
  const missedIngredients = normalizeIngredientList(row?.missed_ingredients)
  const steps = Array.isArray(row?.steps) ? row.steps : []
  const readyInMinutes = Number(row?.ready_in_minutes ?? 0)
  const servings = Number(row?.servings ?? 0)
  const caloriesPerServing = Number(row?.calories_per_serving ?? 0)

  return {
    id: row?.id,
    title: row?.title || 'Receita sem nome',
    image: row?.image || '',
    category: row?.category || 'outros',
    readyInMinutes,
    servings,
    caloriesPerServing:
      Number.isFinite(caloriesPerServing) && caloriesPerServing > 0
        ? Math.round(caloriesPerServing)
        : 0,
    time: readyInMinutes > 0 ? `${readyInMinutes} min` : 'Tempo não informado',
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missedIngredients.length,
    usedIngredients,
    missedIngredients,
    steps,
    ingredients: `${usedIngredients.length} ingrediente${usedIngredients.length === 1 ? '' : 's'} da despensa`,
    imageQuery: row?.image_query || '',
    imageSource: row?.image_source || '',
    imageAuthor: row?.image_author || '',
    imageLicense: row?.image_license || '',
    imageLicenseUrl: row?.image_license_url || '',
    imageSourceUrl: row?.image_source_url || '',
    isFavorite: Boolean(row?.is_favorite),
    favoritedAt: row?.favorited_at || null,
    source: row?.source || 'cooked',
    origin,
  }
}

/**
 * Une listas de receitas sem repetir o mesmo título normalizado.
 */
export function mergeRecipeLists(...lists) {
  const byTitle = new Map()

  for (const recipe of lists.flat()) {
    const key = normalizeRecipeTitle(recipe?.title)
    if (key && !byTitle.has(key)) byTitle.set(key, recipe)
  }

  return [...byTitle.values()]
}
