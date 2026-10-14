import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

const pantryFields =
  'id, name, category, quantity, unit, expiration_date, created_at, updated_at'

let sessionPromise

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo app/.env.local e reinicie o servidor.',
    )
  }
}

async function resolveSession() {
  requireSupabase()

  const { data, error } = await supabase.auth.getSession()

  if (error) throw error
  if (data.session) return data.session

  const { data: anonymousData, error: anonymousError } =
    await supabase.auth.signInAnonymously()

  if (anonymousError) {
    throw new Error(
      'Não foi possível iniciar a sessão. Confirme se o login anônimo está habilitado no Supabase.',
      { cause: anonymousError },
    )
  }

  return anonymousData.session
}

function getCurrentSession() {
  if (!sessionPromise) {
    sessionPromise = resolveSession().catch((error) => {
      sessionPromise = undefined
      throw error
    })
  }

  return sessionPromise
}

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
