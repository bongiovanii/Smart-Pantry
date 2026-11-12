import { MEAL_TYPES, WEEK_DAYS } from '../lib/mealPlan.js'
import {
  buildRecipeSnapshot,
  normalizeRecipeSnapshot,
} from '../lib/recipeSnapshot.js'
import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'
import { getMonday } from '../lib/week.js'

const TABLE_NAME = 'meal_plans'

const planFields = [
  'id',
  'week_start',
  'day_of_week',
  'meal_type',
  'recipe_id',
  'recipe_title',
  'recipe_image',
  'recipe_snapshot',
  'created_at',
  'updated_at',
].join(', ')

function normalizeWeekStart(weekStart) {
  return weekStart || getMonday()
}

/**
 * Converte a linha do banco para o contrato usado pela interface. O snapshot
 * salvo é a fonte principal dos dados da receita; as colunas de id/título/
 * imagem funcionam como fallback e como filtros de consulta.
 */
function normalizePlanEntry(row) {
  return {
    planId: row.id,
    weekStart: row.week_start,
    dayOfWeek: row.day_of_week,
    mealType: row.meal_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recipe: normalizeRecipeSnapshot(row.recipe_snapshot, {
      id: row.recipe_id,
      title: row.recipe_title,
      image: row.recipe_image,
    }),
  }
}

/**
 * Lista as refeições de uma semana. Por padrão consulta a semana corrente
 * (segunda-feira no fuso de Brasília); o histórico passa uma data explícita.
 */
export async function listWeeklyPlan(weekStart = getMonday()) {
  const session = await getCurrentSession()

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(planFields)
    .eq('user_id', session.user.id)
    .eq('week_start', normalizeWeekStart(weekStart))
    .order('day_of_week', { ascending: true })
    .order('meal_type', { ascending: true })

  if (error) throw error

  return (data ?? []).map(normalizePlanEntry)
}

/**
 * Agenda uma receita em um slot da semana. A restrição única por
 * (usuário, semana, dia, refeição) garante que o upsert substitua o prato
 * anterior do mesmo slot sem afetar outras semanas.
 *
 * @param {{
 *   dayOfWeek: string,
 *   mealType: string,
 *   recipe: Object,
 *   weekStart?: string,
 * }} payload
 * @returns {Promise<Object>} entrada normalizada já persistida
 */
export async function assignMealToDay({
  dayOfWeek,
  mealType,
  recipe,
  weekStart = getMonday(),
}) {
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
        week_start: normalizeWeekStart(weekStart),
        day_of_week: dayOfWeek,
        meal_type: mealType,
        recipe_id: snapshot.id,
        recipe_title: snapshot.title,
        recipe_image: snapshot.image || null,
        recipe_snapshot: snapshot,
      },
      { onConflict: 'user_id,week_start,day_of_week,meal_type' },
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

/**
 * Garante o ciclo ativo e o registro da semana corrente. Se a semana estiver
 * vazia e existir template para o índice atual, a recorrência é aplicada no
 * banco em uma única transação.
 */
export async function syncCurrentWeek() {
  const { data, error } = await supabase.rpc('sync_meal_plan_week')

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data

  if (!row) return null

  return {
    cycleId: row.cycle_id,
    weekStart: row.week_start,
    weekIndex: Number(row.week_index),
    appliedTemplateId: row.applied_template_id,
    appliedTemplateName: row.applied_template_name,
    mealCount: Number(row.meal_count ?? 0),
  }
}

/**
 * Lista semanas anteriores registradas no histórico, com o template aplicado
 * e a quantidade de refeições de cada uma.
 */
export async function listPlanHistory({ page = 1, pageSize = 20 } = {}) {
  const { data, error } = await supabase.rpc('list_meal_plan_history', {
    p_page: page,
    p_page_size: pageSize,
  })

  if (error) throw error

  const rows = data ?? []
  const totalCount = Number(rows[0]?.total_count ?? 0)

  return {
    weeks: rows.map((row) => ({
      weekStart: row.week_start,
      weekIndex: Number(row.week_index),
      cycleId: row.cycle_id,
      templateName: row.template_name,
      mealCount: Number(row.meal_count ?? 0),
    })),
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  }
}

/**
 * Encerra o ciclo ativo e começa um novo na semana corrente. A semana atual
 * passa a ser a semana 1; as semanas anteriores continuam no histórico.
 */
export async function startNewMealPlanCycle() {
  const { data, error } = await supabase.rpc('start_new_meal_plan_cycle')

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data

  if (!row) return null

  return {
    cycleId: row.id,
    startedOn: row.started_on,
    status: row.status,
  }
}
