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
    image: recipe?.image || '',
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
