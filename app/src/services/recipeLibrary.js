import { normalizeRecipeFromRow } from '../lib/recipeRecord.js'
import { normalizeRecipeTitle } from '../lib/recipeNormalization.js'
import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const RECIPE_FIELDS = [
  'id',
  'title',
  'title_normalized',
  'category',
  'image',
  'image_query',
  'image_source',
  'image_author',
  'image_license',
  'image_license_url',
  'image_source_url',
  'ready_in_minutes',
  'servings',
  'calories_per_serving',
  'used_ingredients',
  'missed_ingredients',
  'steps',
  'ingredient_names',
  'is_favorite',
  'favorited_at',
  'created_at',
  'updated_at',
].join(', ')

export const DAILY_GENERATION_LIMIT = 10

/**
 * Lista a biblioteca de receitas do usuário com busca e paginação.
 *
 * A consulta é feita diretamente na tabela `recipes`; a RLS garante que cada
 * sessão veja apenas as próprias receitas. Nenhum token do Gemini é gasto.
 */
export async function listRecipeLibrary({
  search = '',
  category = '',
  page = 1,
  pageSize = 20,
} = {}) {
  const session = await getCurrentSession()
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 50)
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  let query = supabase
    .from('recipes')
    .select(RECIPE_FIELDS, { count: 'exact' })
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const term = search.trim()
  const selectedCategory = String(category ?? '').trim()

  if (selectedCategory) {
    query = query.eq('category', selectedCategory)
  }

  if (term) {
    // Vírgulas, parênteses e curingas quebrariam a sintaxe do `or` do PostgREST.
    const safeTerm = term.replace(/[%,()*]/g, ' ').trim()
    if (safeTerm) {
      query = query.or(
        `title.ilike.%${safeTerm}%,category.ilike.%${safeTerm}%`,
      )
    }
  }

  const { data, error, count } = await query

  if (error) throw error

  const total = count ?? data?.length ?? 0

  return {
    recipes: (data ?? []).map((row) => normalizeRecipeFromRow(row)),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  }
}

/**
 * Lista as categorias presentes na biblioteca do usuário. Usado pelo filtro
 * do seletor de receitas dos templates.
 */
export async function listRecipeCategories() {
  const session = await getCurrentSession()

  const { data, error } = await supabase
    .from('recipes')
    .select('category')
    .eq('user_id', session.user.id)

  if (error) throw error

  return [
    ...new Set(
      (data ?? [])
        .map((row) => String(row.category ?? '').trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Calcula o início do dia no fuso de Brasília.
 *
 * A Edge Function usa a mesma referência para aplicar o limite diário. Alinhar
 * o contador do frontend evita divergência para usuários em outros fusos.
 */
function getStartOfDayInBrazil() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00-03:00`,
  )
}

/**
 * Retorna o status de gerações do dia. O limite é compartilhado com a Edge
 * Function; aqui ele serve para exibir o contador na interface.
 */
export async function getRecipeGenerationStatus() {
  const session = await getCurrentSession()
  const startOfDay = getStartOfDayInBrazil()

  const { count, error } = await supabase
    .from('recipe_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .gte('generated_at', startOfDay.toISOString())

  if (error) throw error

  const used = count ?? 0

  return {
    used,
    limit: DAILY_GENERATION_LIMIT,
    remaining: Math.max(0, DAILY_GENERATION_LIMIT - used),
  }
}

/**
 * Verifica se uma receita já está na biblioteca pelo título normalizado.
 * Usado por fluxos futuros (favoritas e histórico) para evitar duplicatas.
 */
export async function findRecipeByTitle(title) {
  const session = await getCurrentSession()
  const normalized = normalizeRecipeTitle(title)

  if (!normalized) return null

  const { data, error } = await supabase
    .from('recipes')
    .select(RECIPE_FIELDS)
    .eq('user_id', session.user.id)
    .eq('title_normalized', normalized)
    .maybeSingle()

  if (error) throw error

  return data ? normalizeRecipeFromRow(data) : null
}
