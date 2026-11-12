import { MEAL_TYPES, WEEK_DAYS } from '../lib/mealPlan.js'
import { buildRecipeSnapshot } from '../lib/recipeSnapshot.js'
import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const TABLE_NAME = 'meal_plans'

const planFields = [
  'id',
  'day_of_week',
  'meal_type',
  'recipe_id',
  'recipe_title',
  'recipe_image',
  'recipe_snapshot',
  'created_at',
  'updated_at',
].join(', ')

/**
 * Converte a linha do banco para o contrato usado pela interface. O snapshot
 * salvo é a fonte principal dos dados da receita; as colunas de id/título/
 * imagem funcionam como fallback e como filtros de consulta.
 */
function normalizePlanEntry(row) {
  const snapshot =
    row.recipe_snapshot && typeof row.recipe_snapshot === 'object'
      ? row.recipe_snapshot
      : {}

  const usedIngredients = Array.isArray(snapshot.usedIngredients)
    ? snapshot.usedIngredients
    : []
  const missedIngredients = Array.isArray(snapshot.missedIngredients)
    ? snapshot.missedIngredients
    : []
  const readyInMinutes = Number(snapshot.readyInMinutes ?? 0)

  return {
    planId: row.id,
    dayOfWeek: row.day_of_week,
    mealType: row.meal_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recipe: {
      ...snapshot,
      id: snapshot.id || row.recipe_id,
      title: snapshot.title || row.recipe_title || 'Receita sem nome',
      image: snapshot.image || row.recipe_image || '',
      category: snapshot.category || 'outros',
      readyInMinutes,
      servings: Number(snapshot.servings ?? 0),
      caloriesPerServing: Number(snapshot.caloriesPerServing ?? 0),
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
    },
  }
}

/**
 * Lista todas as refeições planejadas pelo usuário. A RLS já restringe as
 * linhas ao próprio usuário; o filtro explícito reforça a intenção.
 */
export async function listWeeklyPlan() {
  const session = await getCurrentSession()

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(planFields)
    .eq('user_id', session.user.id)
    .order('day_of_week', { ascending: true })
    .order('meal_type', { ascending: true })

  if (error) throw error

  return (data ?? []).map(normalizePlanEntry)
}

/**
 * Agenda uma receita em um slot da semana. Como existe uma restrição única
 * por (usuário, dia, refeição), o upsert substitui o prato anterior do slot.
 *
 * @param {{
 *   dayOfWeek: string,
 *   mealType: string,
 *   recipe: Object,
 * }} payload
 * @returns {Promise<Object>} entrada normalizada já persistida
 */
export async function assignMealToDay({ dayOfWeek, mealType, recipe }) {
  const session = await getCurrentSession()

  if (!WEEK_DAYS.includes(dayOfWeek)) {
    throw new Error('Selecione um dia da semana válido.')
  }

  if (!MEAL_TYPES.includes(mealType)) {
    throw new Error('Selecione um tipo de refeição válido.')
  }

  const snapshot = buildRecipeSnapshot(recipe)

  if (!snapshot.id) {
    throw new Error('Não foi possível identificar a receita selecionada.')
  }

  if (!snapshot.title) {
    throw new Error('Informe o nome da receita.')
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      {
        user_id: session.user.id,
        day_of_week: dayOfWeek,
        meal_type: mealType,
        recipe_id: snapshot.id,
        recipe_title: snapshot.title,
        recipe_image: snapshot.image || null,
        recipe_snapshot: snapshot,
      },
      { onConflict: 'user_id,day_of_week,meal_type' },
    )
    .select(planFields)
    .single()

  if (error) throw error

  return normalizePlanEntry(data)
}

/**
 * Remove uma refeição do planejamento. O filtro por user_id é redundante
 * diante da RLS, mas deixa a operação explícita e à prova de regressão.
 */
export async function removeMealPlan(planId) {
  const session = await getCurrentSession()

  if (!planId) {
    throw new Error('Refeição do planejamento não informada.')
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', planId)
    .eq('user_id', session.user.id)

  if (error) throw error
}
