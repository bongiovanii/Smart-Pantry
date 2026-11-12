import { DEFAULT_RECIPE_IMAGE } from './recipeRecord.js'

/**
 * Monta o snapshot de uma receita para persistência.
 *
 * O mesmo contrato é usado pelo histórico de preparos (`user_recipes`) e pelo
 * planejamento semanal (`meal_plans`). Guardar os campos necessários para
 * renderizar a receita novamente evita depender do Gemini para abrir o modal
 * de detalhes depois.
 */
export function buildRecipeSnapshot(recipe, fallbackId = '', fallbackTitle = '') {
  return {
    id: recipe?.id || fallbackId || '',
    title: String(recipe?.title ?? fallbackTitle ?? '').trim(),
    image: recipe?.image || DEFAULT_RECIPE_IMAGE,
    category: recipe?.category || '',
    readyInMinutes: recipe?.readyInMinutes ?? 0,
    servings: recipe?.servings ?? 0,
    caloriesPerServing: recipe?.caloriesPerServing ?? 0,
    usedIngredients: recipe?.usedIngredients ?? [],
    missedIngredients: recipe?.missedIngredients ?? [],
    steps: recipe?.steps ?? [],
    imageQuery: recipe?.imageQuery || '',
    imageSource: recipe?.imageSource || '',
    imageAuthor: recipe?.imageAuthor || '',
    imageLicense: recipe?.imageLicense || '',
    imageLicenseUrl: recipe?.imageLicenseUrl || '',
    imageSourceUrl: recipe?.imageSourceUrl || '',
  }
}

/**
 * Reconstrói o contrato de receita usado pela interface a partir de um
 * snapshot persistido. O snapshot é a fonte de verdade; as colunas de
 * fallback existem para linhas antigas ou incompletas.
 */
export function normalizeRecipeSnapshot(snapshot, fallback = {}) {
  const safeSnapshot =
    snapshot && typeof snapshot === 'object' ? snapshot : {}
  const usedIngredients = Array.isArray(safeSnapshot.usedIngredients)
    ? safeSnapshot.usedIngredients
    : []
  const missedIngredients = Array.isArray(safeSnapshot.missedIngredients)
    ? safeSnapshot.missedIngredients
    : []
  const readyInMinutes = Number(safeSnapshot.readyInMinutes ?? 0)

  return {
    ...safeSnapshot,
    id: safeSnapshot.id || fallback.id || '',
    title: safeSnapshot.title || fallback.title || 'Receita sem nome',
    image: safeSnapshot.image || fallback.image || DEFAULT_RECIPE_IMAGE,
    category: safeSnapshot.category || 'outros',
    readyInMinutes,
    servings: Number(safeSnapshot.servings ?? 0),
    caloriesPerServing: Number(safeSnapshot.caloriesPerServing ?? 0),
    time:
      readyInMinutes > 0
        ? `${readyInMinutes} min`
        : 'Tempo não informado',
    usedIngredients,
    missedIngredients,
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missedIngredients.length,
    ingredients: `${usedIngredients.length} ingrediente${
      usedIngredients.length === 1 ? '' : 's'
    } da despensa`,
  }
}
