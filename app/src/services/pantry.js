import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'
import { toDateOnly } from '../lib/week.js'

const pantryFields =
  'id, name, category, quantity, unit, price, expiration_date, created_at, updated_at'

export async function listPantryItems() {
  await getCurrentSession()

  const { data, error } = await supabase
    .from('pantry_items')
    .select(pantryFields)
    .is('archived_at', null)
    .order('expiration_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return data
}

export async function createPantryItem(item) {
  const session = await getCurrentSession()

  if (item.expirationDate && item.expirationDate < toDateOnly()) {
    throw new Error('A data de validade não pode ser anterior a hoje.')
  }

  const parsedPrice =
    item.price !== undefined && item.price !== null && String(item.price).trim() !== ''
      ? Number(String(item.price).replace(',', '.'))
      : null

  if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
    throw new Error('O preço informado não pode ser negativo.')
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      user_id: session.user.id,
      name: item.name.trim(),
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      price: parsedPrice,
      expiration_date: item.expirationDate || null,
    })
    .select(pantryFields)
    .single()

  if (error) throw error

  return data
}

export async function updatePantryItem(id, item) {
  await getCurrentSession()

  const parsedPrice =
    item.price !== undefined && item.price !== null && String(item.price).trim() !== ''
      ? Number(String(item.price).replace(',', '.'))
      : null

  if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
    throw new Error('O preço informado não pode ser negativo.')
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      name: item.name.trim(),
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      price: parsedPrice,
      expiration_date: item.expirationDate || null,
    })
    .eq('id', id)
    .select(pantryFields)
    .single()

  if (error) throw error

  return data
}

export async function archivePantryItem(id) {
  await getCurrentSession()

  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      archived_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(pantryFields)
    .single()

  if (error) throw error

  return data
}

export async function recordPantryEntry(
  itemId,
  { quantity, reason = 'Reposição' } = {},
) {
  await getCurrentSession()

  if (!itemId) {
    throw new Error('Alimento não informado.')
  }

  const parsedQty = Number(quantity)
  if (!parsedQty || parsedQty <= 0) {
    throw new Error('A quantidade de reposição deve ser maior que zero.')
  }

  const { data, error } = await supabase.rpc('record_pantry_entry', {
    p_item_id: itemId,
    p_quantity: parsedQty,
    p_reason: reason || 'Reposição',
  })

  if (error) throw error

  return data
}

/**
 * Registra a baixa de um alimento na despensa classificando o motivo:
 * - 'consumed': consumido fora do app (movimentação 'consumption')
 * - 'wasted': estragou / venceu (movimentação 'waste')
 * - 'mistake': erro de cadastro (apenas arquiva)
 */
export async function recordPantryDiscard(
  itemId,
  disposition = 'mistake',
  reason = '',
) {
  await getCurrentSession()

  if (!itemId) {
    throw new Error('Alimento não informado.')
  }

  const validDispositions = ['consumed', 'wasted', 'mistake']
  if (!validDispositions.includes(disposition)) {
    throw new Error('Motivo de baixa inválido.')
  }

  const { data, error } = await supabase.rpc('record_pantry_discard', {
    p_item_id: itemId,
    p_disposition: disposition,
    p_reason: reason || null,
  })

  if (error) throw error

  return data
}
