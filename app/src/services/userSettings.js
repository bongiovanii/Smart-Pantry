import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const SETTINGS_TABLE = 'user_settings'

function normalizeSettings(row) {
  if (!row) {
    return {
      theme: 'system',
      notificationsEnabled: true,
    }
  }

  return {
    theme: row.theme || 'system',
    notificationsEnabled: row.notifications_enabled ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Retorna as preferências do usuário autenticado. Cria o registro padrão
 * caso ainda não exista no banco.
 */
export async function getUserSettings() {
  await getCurrentSession()

  const { data, error } = await supabase.rpc('get_or_create_user_settings')

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return normalizeSettings(row)
}

/**
 * Atualiza as preferências do usuário no Supabase.
 *
 * @param {{
 *   theme?: 'light' | 'dark' | 'system',
 *   notificationsEnabled?: boolean,
 * }} settings
 */
export async function updateUserSettings({ theme, notificationsEnabled }) {
  const session = await getCurrentSession()

  const updates = {}

  if (theme !== undefined) {
    if (!['light', 'dark', 'system'].includes(theme)) {
      throw new Error('Tema inválido. Escolha entre light, dark ou system.')
    }
    updates.theme = theme
  }

  if (notificationsEnabled !== undefined) {
    updates.notifications_enabled = Boolean(notificationsEnabled)
  }

  if (Object.keys(updates).length === 0) {
    return getUserSettings()
  }

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .update(updates)
    .eq('user_id', session.user.id)
    .select('theme, notifications_enabled, created_at, updated_at')
    .single()

  if (error) throw error

  return normalizeSettings(data)
}
