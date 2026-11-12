import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'
import { toDateOnly } from '../lib/week.js'

const NOTIFICATIONS_TABLE = 'notifications'

const notificationFields = [
  'id',
  'user_id',
  'type',
  'pantry_item_id',
  'title',
  'body',
  'status',
  'notification_date',
  'snoozed_until',
  'created_at',
].join(', ')

function normalizeNotification(row) {
  return {
    id: row.id,
    type: row.type || 'expiration',
    pantryItemId: row.pantry_item_id,
    title: row.title,
    body: row.body,
    status: row.status || 'unread',
    notificationDate: row.notification_date,
    snoozedUntil: row.snoozed_until,
    createdAt: row.created_at,
    isUnread: row.status === 'unread',
  }
}

/**
 * Aciona a geração no banco das notificações de vencimento (alimentos <= 7 dias ou vencidos)
 * e retorna as notificações ativas ordenadas por prioridade.
 */
export async function generateExpirationNotifications() {
  await getCurrentSession()

  const { data, error } = await supabase.rpc(
    'generate_expiration_notifications',
  )

  if (error) throw error

  return (data ?? []).map(normalizeNotification)
}

/**
 * Consulta a lista de notificações ativas (não lidas e lidas recentes, excluindo dispensadas
 * e adiadas para datas futuras).
 */
export async function listActiveNotifications() {
  const session = await getCurrentSession()
  const today = toDateOnly()

  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .select(notificationFields)
    .eq('user_id', session.user.id)
    .in('status', ['unread', 'read', 'snoozed'])
    .or(`snoozed_until.is.null,snoozed_until.lte.${today}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  return (data ?? []).map(normalizeNotification)
}

/**
 * Marca uma notificação como lida.
 */
export async function markNotificationAsRead(id) {
  const session = await getCurrentSession()

  if (!id) {
    throw new Error('Notificação não informada.')
  }

  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ status: 'read' })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select(notificationFields)
    .single()

  if (error) throw error

  return normalizeNotification(data)
}

/**
 * Marca todas as notificações não lidas como lidas.
 */
export async function markAllNotificationsAsRead() {
  await getCurrentSession()

  const { data, error } = await supabase.rpc('mark_all_notifications_as_read')

  if (error) throw error

  return Number(data ?? 0)
}

/**
 * Adia a notificação por 1 ou mais dias.
 */
export async function snoozeNotification(id, days = 1) {
  await getCurrentSession()

  if (!id) {
    throw new Error('Notificação não informada.')
  }

  const { data, error } = await supabase.rpc('snooze_notification', {
    p_notification_id: id,
    p_days: Number(days || 1),
  })

  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return normalizeNotification(row)
}

/**
 * Dispensa a notificação (não volta a ser exibida na central).
 */
export async function dismissNotification(id) {
  const session = await getCurrentSession()

  if (!id) {
    throw new Error('Notificação não informada.')
  }

  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .update({ status: 'dismissed' })
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select(notificationFields)
    .single()

  if (error) throw error

  return normalizeNotification(data)
}
