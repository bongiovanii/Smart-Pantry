import { normalizeIngredientName } from '../lib/recipeNormalization.js'
import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const SHOPPING_LIST_TABLE = 'shopping_list_items'

const shoppingItemFields = [
  'id',
  'user_id',
  'name',
  'name_normalized',
  'category',
  'unit',
  'quantity',
  'source',
  'status',
  'pantry_item_id',
  'note',
  'created_at',
  'updated_at',
  'purchased_at',
].join(', ')

function normalizeShoppingItem(row) {
  if (!row) return null

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    nameNormalized: row.name_normalized,
    category: row.category || 'outros',
    unit: row.unit || 'un',
    quantity: Number(row.quantity) || 1,
    source: row.source || 'manual',
    status: row.status || 'pending',
    pantryItemId: row.pantry_item_id,
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    purchasedAt: row.purchased_at,
    isPending: row.status === 'pending',
    isPurchased: row.status === 'purchased',
  }
}

/**
 * Lista itens da lista de compras.
 *
 * @param {{ status?: 'pending' | 'purchased' | 'all' }} options
 */
export async function listShoppingItems({ status = 'pending' } = {}) {
  const session = await getCurrentSession()

  let query = supabase
    .from(SHOPPING_LIST_TABLE)
    .select(shoppingItemFields)
    .eq('user_id', session.user.id)

  if (status === 'all') {
    query = query.neq('status', 'removed')
  } else {
    query = query.eq('status', status)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return (data ?? []).map(normalizeShoppingItem)
}

/**
 * Adiciona um item à lista de compras. Se já existir um item pendente com
 * o mesmo nome e unidade, soma a quantidade ao invés de duplicar.
 */
export async function addShoppingItem({
  name,
  category = 'outros',
  unit = 'un',
  quantity = 1,
  source = 'manual',
  note = '',
  pantryItemId = null,
}) {
  const session = await getCurrentSession()

  const trimmedName = (name || '').trim()
  if (!trimmedName) {
    throw new Error('Informe o nome do item.')
  }

  if (trimmedName.length > 120) {
    throw new Error('O nome do item deve ter no máximo 120 caracteres.')
  }

  const parsedQty = Number(quantity)
  if (!parsedQty || parsedQty <= 0) {
    throw new Error('A quantidade deve ser maior que zero.')
  }

  const nameNormalized = normalizeIngredientName(trimmedName)

  // Verifica se já existe na lista pendente para somar
  const { data: existing } = await supabase
    .from(SHOPPING_LIST_TABLE)
    .select('id, quantity')
    .eq('user_id', session.user.id)
    .eq('name_normalized', nameNormalized)
    .eq('unit', unit)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return updateShoppingItem(existing.id, {
      quantity: Number(existing.quantity) + parsedQty,
      note: note || undefined,
    })
  }

  const { data, error } = await supabase
    .from(SHOPPING_LIST_TABLE)
    .insert({
      user_id: session.user.id,
      name: trimmedName,
      name_normalized: nameNormalized,
      category: category || 'outros',
      unit: unit || 'un',
      quantity: parsedQty,
      source: source || 'manual',
      status: 'pending',
      note: note ? note.trim() : null,
      pantry_item_id: pantryItemId || null,
    })
    .select(shoppingItemFields)
    .single()

  if (error) throw error

  return normalizeShoppingItem(data)
}

/**
 * Atualiza campos de um item da lista de compras.
 */
export async function updateShoppingItem(id, changes) {
  const session = await getCurrentSession()

  if (!id) {
    throw new Error('Item não informado.')
  }

  const payload = {}

  if (changes.name !== undefined) {
    const trimmed = changes.name.trim()
    if (!trimmed) throw new Error('O nome do item não pode ficar vazio.')
    payload.name = trimmed
    payload.name_normalized = normalizeIngredientName(trimmed)
  }

  if (changes.category !== undefined) {
    payload.category = changes.category || 'outros'
  }

  if (changes.unit !== undefined) {
    payload.unit = changes.unit || 'un'
  }

  if (changes.quantity !== undefined) {
    const qty = Number(changes.quantity)
    if (!qty || qty <= 0) {
      throw new Error('A quantidade deve ser maior que zero.')
    }
    payload.quantity = qty
  }

  if (changes.note !== undefined) {
    payload.note = changes.note ? changes.note.trim() : null
  }

  const { data, error } = await supabase
    .from(SHOPPING_LIST_TABLE)
    .update(payload)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select(shoppingItemFields)
    .single()

  if (error) throw error

  return normalizeShoppingItem(data)
}

/**
 * Remove um item da lista de compras (marca status = 'removed').
 */
export async function removeShoppingItem(id) {
  const session = await getCurrentSession()

  if (!id) {
    throw new Error('Item não informado.')
  }

  const { error } = await supabase
    .from(SHOPPING_LIST_TABLE)
    .update({ status: 'removed' })
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) throw error

  return true
}

/**
 * Confirma a compra de um item da lista.
 * Se addToPantry for verdadeiro, debita entrada na despensa de forma transacional.
 */
export async function markShoppingItemPurchased(
  id,
  {
    quantity = null,
    addToPantry = true,
    category = null,
    expirationDate = null,
  } = {},
) {
  await getCurrentSession()

  if (!id) {
    throw new Error('Item não informado.')
  }

  const { data, error } = await supabase.rpc('mark_shopping_item_purchased', {
    p_item_id: id,
    p_quantity: quantity !== null ? Number(quantity) : null,
    p_add_to_pantry: addToPantry,
    p_category: category || null,
    p_expiration_date: expirationDate || null,
  })

  if (error) throw error

  return normalizeShoppingItem(data)
}

/**
 * Consulta até 20 sugestões inteligentes para a lista de compras
 * calculadas no banco de dados.
 */
export async function getShoppingSuggestions(days = 90) {
  await getCurrentSession()

  const { data, error } = await supabase.rpc('get_shopping_suggestions', {
    p_days: days,
  })

  if (error) throw error

  return data ?? []
}

/**
 * Extrai ingredientes faltantes do planejamento semanal atual que ainda não
 * constam na despensa nem na lista de compras pendente.
 *
 * @param {Array} weeklyPlan Lista de refeições da semana atual
 * @param {Array} pantryItems Lista de alimentos ativos na despensa
 * @param {Array} pendingShoppingItems Lista de compras pendente
 */
export function extractMealPlanMissingItems(
  weeklyPlan = [],
  pantryItems = [],
  pendingShoppingItems = [],
) {
  const pendingKeys = new Set(
    (pendingShoppingItems || []).map(
      (item) => `${item.nameNormalized || normalizeIngredientName(item.name)}|${item.unit}`,
    ),
  )

  const pantryMap = new Map()
  for (const item of pantryItems || []) {
    const key = `${normalizeIngredientName(item.name)}|${item.unit}`
    pantryMap.set(key, (pantryMap.get(key) || 0) + Number(item.quantity || 0))
  }

  const missingMap = new Map()

  for (const entry of weeklyPlan || []) {
    const missed = entry?.recipe?.missedIngredients || []
    const recipeTitle = entry?.recipe?.title || 'Refeição planejada'

    for (const ing of missed) {
      if (!ing || !ing.name) continue

      const normName = normalizeIngredientName(ing.name)
      const unit = ing.unit || 'un'
      const key = `${normName}|${unit}`

      // Se já está na lista de compras pendente, ignora
      if (pendingKeys.has(key)) continue

      const amount = Number(ing.amount) || 1
      const existing = missingMap.get(key)

      if (existing) {
        existing.quantity += amount
        if (!existing.recipeTitles.includes(recipeTitle)) {
          existing.recipeTitles.push(recipeTitle)
        }
      } else {
        missingMap.set(key, {
          name: ing.name.trim(),
          nameNormalized: normName,
          unit,
          quantity: amount,
          recipeTitles: [recipeTitle],
          category: 'outros',
        })
      }
    }
  }

  return Array.from(missingMap.values())
}
