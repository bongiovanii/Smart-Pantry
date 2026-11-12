import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'
import { toDateOnly } from '../lib/week.js'

const pantryFields =
  'id, name, category, quantity, unit, expiration_date, created_at, updated_at'

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

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      user_id: session.user.id,
      name: item.name.trim(),
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
      expiration_date: item.expirationDate || null,
    })
    .select(pantryFields)
    .single()

  if (error) throw error

  return data
}

export async function updatePantryItem(id, item) {
  await getCurrentSession()

  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      name: item.name.trim(),
      category: item.category,
      quantity: Number(item.quantity),
      unit: item.unit,
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
