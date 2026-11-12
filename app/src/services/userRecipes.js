import { DEFAULT_RECIPE_IMAGE } from '../lib/recipeRecord.js'
import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const cookedRecipeFields = [
  'id',
  'recipe_id',
  'title',
  'image',
  'category',
  'ready_in_minutes',
  'servings',
  'calories_per_serving',
  'used_ingredients',
  'missed_ingredients',
  'steps',
  'image_query',
  'image_source',
  'image_author',
  'image_license',
  'image_license_url',
  'image_source_url',
  'cooked_at',
].join(', ')

/**
 * Converte a linha do banco para o mesmo contrato usado pelos cards e pelo
 * RecipeDetailModal. O snapshot guarda tudo que é necessário para reabrir a
 * receita sem uma nova chamada ao Gemini.
 */
function normalizeCookedRecipe(row) {
  return {
    historyId: row.id,
    id: row.recipe_id,
    title: row.title || 'Receita sem nome',
    image: row.image || DEFAULT_RECIPE_IMAGE,
    category: row.category || 'outros',
    readyInMinutes: Number(row.ready_in_minutes ?? 0),
    servings: Number(row.servings ?? 0),
    caloriesPerServing: Number(row.calories_per_serving ?? 0),
    time:
      Number(row.ready_in_minutes ?? 0) > 0
        ? `${Number(row.ready_in_minutes)} min`
        : 'Tempo não informado',
    usedIngredients: Array.isArray(row.used_ingredients)
      ? row.used_ingredients
      : [],
    missedIngredients: Array.isArray(row.missed_ingredients)
      ? row.missed_ingredients
      : [],
    steps: Array.isArray(row.steps) ? row.steps : [],
    usedIngredientCount: Array.isArray(row.used_ingredients)
      ? row.used_ingredients.length
      : 0,
    missedIngredientCount: Array.isArray(row.missed_ingredients)
      ? row.missed_ingredients.length
      : 0,
    imageQuery: row.image_query || '',
    imageSource: row.image_source || '',
    imageAuthor: row.image_author || '',
    imageLicense: row.image_license || '',
    imageLicenseUrl: row.image_license_url || '',
    imageSourceUrl: row.image_source_url || '',
    cookedAt: row.cooked_at,
  }
}

/**
 * Lista todas as receitas executadas pelo usuário, da mais recente para a
 * mais antiga. A RLS garante que apenas as linhas do próprio usuário sejam
 * devolvidas; o filtro explícito reforça a intenção da consulta.
 */
export async function listCookedRecipes() {
  const session = await getCurrentSession()

  const { data, error } = await supabase
    .from('user_recipes')
    .select(cookedRecipeFields)
    .eq('user_id', session.user.id)
    .order('cooked_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(normalizeCookedRecipe)
}
