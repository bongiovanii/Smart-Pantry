import { normalizeRecipeFromRow } from '../lib/recipeRecord.js'
import {
  buildIngredientNames,
  normalizeRecipeTitle,
} from '../lib/recipeNormalization.js'
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
  'source',
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

/**
 * Alterna o estado de favorito de uma receita.
 *
 * Se a receita já estiver na biblioteca do usuário, inverte `is_favorite` e
 * atualiza `favorited_at`. Se for nova (ex.: vinda de sugestão externa ou
 * gerador), salva o snapshot completo com `source: 'cooked'` e `is_favorite: true`.
 */
export async function toggleFavoriteRecipe(recipe) {
  const session = await getCurrentSession()
  const title = String(recipe?.title ?? '').trim()
  if (!title) {
    throw new Error('A receita precisa de um título válido.')
  }

  const titleNormalized = normalizeRecipeTitle(title)
  if (!titleNormalized) {
    throw new Error('Título da receita inválido.')
  }

  // 1. Verifica se a receita já existe na biblioteca do usuário
  const { data: existing, error: findError } = await supabase
    .from('recipes')
    .select(RECIPE_FIELDS)
    .eq('user_id', session.user.id)
    .eq('title_normalized', titleNormalized)
    .maybeSingle()

  if (findError) throw findError

  if (existing) {
    const nextFavorite = !existing.is_favorite
    const nextFavoritedAt = nextFavorite ? new Date().toISOString() : null

    const { data: updated, error: updateError } = await supabase
      .from('recipes')
      .update({
        is_favorite: nextFavorite,
        favorited_at: nextFavoritedAt,
      })
      .eq('id', existing.id)
      .eq('user_id', session.user.id)
      .select(RECIPE_FIELDS)
      .single()

    if (updateError) throw updateError
    return normalizeRecipeFromRow(updated)
  }

  // 2. Se não existir, faz insert do snapshot com is_favorite = true
  const usedIngredients = Array.isArray(recipe?.usedIngredients)
    ? recipe.usedIngredients
    : Array.isArray(recipe?.used_ingredients)
      ? recipe.used_ingredients
      : []

  const missedIngredients = Array.isArray(recipe?.missedIngredients)
    ? recipe.missedIngredients
    : Array.isArray(recipe?.missed_ingredients)
      ? recipe.missed_ingredients
      : []

  const steps = Array.isArray(recipe?.steps) ? recipe.steps : []
  const ingredientNames = buildIngredientNames(recipe)

  const newRow = {
    user_id: session.user.id,
    title,
    title_normalized: titleNormalized,
    category: recipe?.category || 'outros',
    image: recipe?.image || null,
    image_query: recipe?.imageQuery || recipe?.image_query || null,
    image_source: recipe?.imageSource || recipe?.image_source || null,
    image_author: recipe?.imageAuthor || recipe?.image_author || null,
    image_license: recipe?.imageLicense || recipe?.image_license || null,
    image_license_url:
      recipe?.imageLicenseUrl || recipe?.image_license_url || null,
    image_source_url:
      recipe?.imageSourceUrl || recipe?.image_source_url || null,
    ready_in_minutes: Math.max(
      0,
      Number(recipe?.readyInMinutes ?? recipe?.ready_in_minutes ?? 0),
    ),
    servings: Math.max(0, Number(recipe?.servings ?? 0)),
    calories_per_serving: Math.max(
      0,
      Number(recipe?.caloriesPerServing ?? recipe?.calories_per_serving ?? 0),
    ),
    used_ingredients: usedIngredients,
    missed_ingredients: missedIngredients,
    steps,
    ingredient_names: ingredientNames,
    source: recipe?.source || 'cooked',
    is_favorite: true,
    favorited_at: new Date().toISOString(),
  }

  const { data: inserted, error: insertError } = await supabase
    .from('recipes')
    .insert(newRow)
    .select(RECIPE_FIELDS)
    .single()

  if (insertError) {
    // Corrida com chave única (user_id, title_normalized): reexecuta alternando
    if (insertError.code === '23505') {
      return toggleFavoriteRecipe(recipe)
    }
    throw insertError
  }

  return normalizeRecipeFromRow(inserted)
}

/**
 * Lista as receitas favoritas do usuário ordenadas por data de adição ou por título.
 */
export async function listFavoriteRecipes({
  search = '',
  sort = 'recent',
} = {}) {
  const session = await getCurrentSession()

  let query = supabase
    .from('recipes')
    .select(RECIPE_FIELDS)
    .eq('user_id', session.user.id)
    .eq('is_favorite', true)

  if (sort === 'title') {
    query = query.order('title', { ascending: true })
  } else {
    query = query
      .order('favorited_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
  }

  const term = search.trim()
  if (term) {
    const safeTerm = term.replace(/[%,()*]/g, ' ').trim()
    if (safeTerm) {
      query = query.or(
        `title.ilike.%${safeTerm}%,category.ilike.%${safeTerm}%`,
      )
    }
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => normalizeRecipeFromRow(row))
}
