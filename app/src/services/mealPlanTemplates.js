import { MEAL_TYPES, WEEK_DAYS } from '../lib/mealPlan.js'
import {
  buildRecipeSnapshot,
  normalizeRecipeSnapshot,
} from '../lib/recipeSnapshot.js'
import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const TEMPLATE_TABLE = 'meal_plan_templates'
const ITEM_TABLE = 'meal_plan_template_items'

const templateFields = [
  'id',
  'name',
  'description',
  'week_index',
  'created_at',
  'updated_at',
].join(', ')

const itemFields = [
  'id',
  'template_id',
  'day_of_week',
  'meal_type',
  'recipe_id',
  'recipe_snapshot',
  'created_at',
  'updated_at',
].join(', ')

function normalizeTemplate(row, mealCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    weekIndex: Number(row.week_index),
    mealCount: Number(mealCount ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeTemplateItem(row) {
  return {
    itemId: row.id,
    planId: row.id,
    templateId: row.template_id,
    dayOfWeek: row.day_of_week,
    mealType: row.meal_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recipe: normalizeRecipeSnapshot(row.recipe_snapshot, {
      id: row.recipe_id,
    }),
  }
}

function normalizeWeekIndex(weekIndex) {
  const value = Number(weekIndex)

  if (!Number.isInteger(value) || value < 1 || value > 4) {
    throw new Error('Selecione uma semana do ciclo entre 1 e 4.')
  }

  return value
}

function normalizeName(name) {
  const value = String(name ?? '').trim()

  if (!value) {
    throw new Error('Informe um nome para o template.')
  }

  if (value.length > 80) {
    throw new Error('O nome do template deve ter até 80 caracteres.')
  }

  return value
}

function normalizeDescription(description) {
  const value = String(description ?? '').trim()

  if (value.length > 500) {
    throw new Error('A descrição deve ter até 500 caracteres.')
  }

  return value
}

function throwTemplateError(error) {
  if (error?.code === '23505') {
    throw new Error(
      'Já existe um template para esta semana do ciclo. Edite ou exclua o template existente.',
    )
  }

  throw new Error(error?.message || 'Não foi possível salvar o template.')
}

async function assertTemplateOwnership(templateId, userId) {
  const { data, error } = await supabase
    .from(TEMPLATE_TABLE)
    .select('id')
    .eq('id', templateId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error('Template não encontrado.')
  }
}

/**
 * Lista os templates do usuário com a quantidade de refeições de cada um.
 * São no máximo 4 linhas e 112 itens, então a contagem é feita no cliente
 * para evitar uma consulta agregada por template.
 */
export async function listTemplates() {
  const session = await getCurrentSession()

  const [templatesResult, itemsResult] = await Promise.all([
    supabase
      .from(TEMPLATE_TABLE)
      .select(templateFields)
      .eq('user_id', session.user.id)
      .order('week_index', { ascending: true }),
    supabase
      .from(ITEM_TABLE)
      .select('template_id')
      .eq('user_id', session.user.id),
  ])

  if (templatesResult.error) throw templatesResult.error
  if (itemsResult.error) throw itemsResult.error

  const counts = new Map()

  for (const item of itemsResult.data ?? []) {
    counts.set(item.template_id, (counts.get(item.template_id) ?? 0) + 1)
  }

  return (templatesResult.data ?? []).map((row) =>
    normalizeTemplate(row, counts.get(row.id) ?? 0),
  )
}

export async function createTemplate({ name, description, weekIndex }) {
  const session = await getCurrentSession()
  const normalizedName = normalizeName(name)
  const normalizedDescription = normalizeDescription(description)

  const { data, error } = await supabase
    .from(TEMPLATE_TABLE)
    .insert({
      user_id: session.user.id,
      name: normalizedName,
      description: normalizedDescription || null,
      week_index: normalizeWeekIndex(weekIndex),
    })
    .select(templateFields)
    .single()

  if (error) throwTemplateError(error)

  return normalizeTemplate(data)
}

export async function updateTemplate(id, { name, description }) {
  const session = await getCurrentSession()

  if (!id) {
    throw new Error('Template não informado.')
  }

  const { data, error } = await supabase
    .from(TEMPLATE_TABLE)
    .update({
      name: normalizeName(name),
      description: normalizeDescription(description) || null,
    })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select(templateFields)
    .single()

  if (error) throwTemplateError(error)

  return normalizeTemplate(data)
}

export async function deleteTemplate(id) {
  const session = await getCurrentSession()

  if (!id) {
    throw new Error('Template não informado.')
  }

  const { error } = await supabase
    .from(TEMPLATE_TABLE)
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) throw error
}

export async function duplicateTemplate(id) {
  if (!id) {
    throw new Error('Template não informado.')
  }

  const { data, error } = await supabase.rpc(
    'duplicate_meal_plan_template',
    { p_template_id: id },
  )

  if (error) throwTemplateError(error)

  const row = Array.isArray(data) ? data[0] : data

  if (!row) throw new Error('Não foi possível duplicar o template.')

  return normalizeTemplate(row)
}

export async function saveCurrentWeekAsTemplate({ name, description }) {
  const { data, error } = await supabase.rpc(
    'save_current_week_as_template',
    {
      p_name: normalizeName(name),
      p_description: normalizeDescription(description) || null,
    },
  )

  if (error) throwTemplateError(error)

  const row = Array.isArray(data) ? data[0] : data

  if (!row) throw new Error('Não foi possível salvar o template.')

  return normalizeTemplate(row)
}

export async function applyTemplate(id) {
  if (!id) {
    throw new Error('Template não informado.')
  }

  const { data, error } = await supabase.rpc('apply_meal_plan_template', {
    p_template_id: id,
  })

  if (error) throwTemplateError(error)

  const row = Array.isArray(data) ? data[0] : data

  if (!row) throw new Error('Não foi possível aplicar o template.')

  return {
    templateId: row.template_id,
    weekStart: row.week_start,
    weekIndex: Number(row.week_index),
    mealCount: Number(row.meal_count ?? 0),
  }
}

export async function listTemplateItems(templateId) {
  const session = await getCurrentSession()

  if (!templateId) {
    throw new Error('Template não informado.')
  }

  await assertTemplateOwnership(templateId, session.user.id)

  const { data, error } = await supabase
    .from(ITEM_TABLE)
    .select(itemFields)
    .eq('template_id', templateId)
    .eq('user_id', session.user.id)
    .order('day_of_week', { ascending: true })
    .order('meal_type', { ascending: true })

  if (error) throw error

  return (data ?? []).map(normalizeTemplateItem)
}

/**
 * Cria ou substitui a receita de um slot do template. O snapshot é a fonte
 * de verdade, igual ao planejamento semanal.
 */
export async function upsertTemplateItem(
  templateId,
  { dayOfWeek, mealType, recipe },
) {
  const session = await getCurrentSession()

  if (!templateId) {
    throw new Error('Template não informado.')
  }

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

  await assertTemplateOwnership(templateId, session.user.id)

  const { data, error } = await supabase
    .from(ITEM_TABLE)
    .upsert(
      {
        template_id: templateId,
        user_id: session.user.id,
        day_of_week: dayOfWeek,
        meal_type: mealType,
        recipe_id: snapshot.id,
        recipe_snapshot: snapshot,
      },
      { onConflict: 'template_id,day_of_week,meal_type' },
    )
    .select(itemFields)
    .single()

  if (error) throw error

  return normalizeTemplateItem(data)
}

export async function removeTemplateItem(itemId) {
  const session = await getCurrentSession()

  if (!itemId) {
    throw new Error('Refeição do template não informada.')
  }

  const { error } = await supabase
    .from(ITEM_TABLE)
    .delete()
    .eq('id', itemId)
    .eq('user_id', session.user.id)

  if (error) throw error
}
