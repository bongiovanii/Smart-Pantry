import { isSupabaseConfigured, supabase } from './supabase.js'

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no arquivo app/.env e reinicie o servidor.',
    )
  }
}

/**
 * Lê a sessão persistida no navegador. Não cria sessão anônima: quando não há
 * usuário autenticado, retorna null e a aplicação mostra a landing page.
 */
export async function getSession() {
  requireSupabase()

  const { data, error } = await supabase.auth.getSession()

  if (error) throw error

  return data.session ?? null
}

/**
 * Assina as mudanças de autenticação (login, logout, refresh e retorno do
 * OAuth). O callback recebe a sessão e o nome do evento.
 */
export function onAuthStateChange(callback) {
  requireSupabase()

  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session, event)
  })
}

/**
 * Inicia o fluxo OAuth do Google. O Supabase redireciona o navegador para o
 * Google e depois devolve o usuário para `redirectTo`.
 */
export async function signInWithGoogle({ redirectTo } = {}) {
  requireSupabase()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || window.location.origin,
    },
  })

  if (error) throw error

  return data
}

export async function signOut() {
  requireSupabase()

  const { error } = await supabase.auth.signOut()

  if (error) throw error
}

export function getUserName(user) {
  const metadata = user?.user_metadata ?? {}

  return (
    metadata.full_name ||
    metadata.name ||
    user?.email?.split('@')[0] ||
    'Usuário'
  )
}

export function getUserEmail(user) {
  return user?.email || 'Conta Google'
}

export function getUserAvatarUrl(user) {
  const metadata = user?.user_metadata ?? {}

  return metadata.avatar_url || metadata.picture || ''
}
