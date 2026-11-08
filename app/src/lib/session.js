import { getSession } from './auth.js'

/**
 * Retorna a sessão ativa ou lança um erro claro quando o usuário não está
 * autenticado. Os serviços usam esta função para evitar qualquer operação
 * anônima no Supabase.
 */
export async function getCurrentSession() {
  const session = await getSession()

  if (!session) {
    throw new Error('Entre com sua conta Google para continuar.')
  }

  return session
}
