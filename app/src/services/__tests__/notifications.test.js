import { describe, expect, it, vi } from 'vitest'
import {
  dismissNotification,
  generateExpirationNotifications,
  listActiveNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  snoozeNotification,
} from '../notifications.js'
import {
  getUserSettings,
  updateUserSettings,
} from '../userSettings.js'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/session.js', () => ({
  getCurrentSession: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id' },
  }),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
  },
}))

describe('notifications service', () => {
  it('generateExpirationNotifications aciona RPC e mapeia campos corretamente', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'notif-1',
          user_id: 'test-user-id',
          type: 'expiration',
          pantry_item_id: 'item-1',
          title: 'Iogurte vence hoje!',
          body: 'Consuma hoje para evitar desperdício.',
          status: 'unread',
          notification_date: '2026-11-12',
          snoozed_until: null,
          created_at: '2026-11-12T10:00:00Z',
        },
      ],
      error: null,
    })

    const result = await generateExpirationNotifications()

    expect(mockRpc).toHaveBeenCalledWith('generate_expiration_notifications')
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'notif-1',
      type: 'expiration',
      pantryItemId: 'item-1',
      title: 'Iogurte vence hoje!',
      body: 'Consuma hoje para evitar desperdício.',
      status: 'unread',
      notificationDate: '2026-11-12',
      snoozedUntil: null,
      createdAt: '2026-11-12T10:00:00Z',
      isUnread: true,
    })
  })

  it('listActiveNotifications consulta tabela com filtros apropriados', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'notif-2',
            user_id: 'test-user-id',
            type: 'expiration',
            pantry_item_id: 'item-2',
            title: 'Leite vence em 2 dias',
            body: 'Aproveite o alimento.',
            status: 'read',
            notification_date: '2026-11-12',
            snoozed_until: null,
            created_at: '2026-11-12T09:00:00Z',
          },
        ],
        error: null,
      }),
    }
    mockFrom.mockReturnValueOnce(chain)

    const result = await listActiveNotifications()

    expect(mockFrom).toHaveBeenCalledWith('notifications')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('notif-2')
    expect(result[0].isUnread).toBe(false)
  })

  it('markNotificationAsRead valida id obrigatório e atualiza status para read', async () => {
    await expect(markNotificationAsRead('')).rejects.toThrow(
      'Notificação não informada.',
    )

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'notif-1',
          user_id: 'test-user-id',
          type: 'expiration',
          status: 'read',
        },
        error: null,
      }),
    }
    mockFrom.mockReturnValueOnce(chain)

    const result = await markNotificationAsRead('notif-1')
    expect(chain.update).toHaveBeenCalledWith({ status: 'read' })
    expect(result.status).toBe('read')
    expect(result.isUnread).toBe(false)
  })

  it('markAllNotificationsAsRead aciona RPC mark_all_notifications_as_read', async () => {
    mockRpc.mockResolvedValueOnce({
      data: 3,
      error: null,
    })

    const count = await markAllNotificationsAsRead()
    expect(mockRpc).toHaveBeenCalledWith('mark_all_notifications_as_read')
    expect(count).toBe(3)
  })

  it('snoozeNotification valida id e aciona RPC snooze_notification', async () => {
    await expect(snoozeNotification('', 1)).rejects.toThrow(
      'Notificação não informada.',
    )

    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'notif-1',
          user_id: 'test-user-id',
          type: 'expiration',
          status: 'snoozed',
          snoozed_until: '2026-11-13',
        },
      ],
      error: null,
    })

    const result = await snoozeNotification('notif-1', 2)
    expect(mockRpc).toHaveBeenCalledWith('snooze_notification', {
      p_notification_id: 'notif-1',
      p_days: 2,
    })
    expect(result.status).toBe('snoozed')
  })

  it('dismissNotification valida id e atualiza status para dismissed', async () => {
    await expect(dismissNotification('')).rejects.toThrow(
      'Notificação não informada.',
    )

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'notif-1',
          user_id: 'test-user-id',
          status: 'dismissed',
        },
        error: null,
      }),
    }
    mockFrom.mockReturnValueOnce(chain)

    const result = await dismissNotification('notif-1')
    expect(chain.update).toHaveBeenCalledWith({ status: 'dismissed' })
    expect(result.status).toBe('dismissed')
  })
})

describe('userSettings service', () => {
  it('getUserSettings obtém configurações do usuário via RPC get_or_create_user_settings', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          user_id: 'test-user-id',
          theme: 'system',
          notifications_enabled: true,
          created_at: '2026-11-12T10:00:00Z',
          updated_at: '2026-11-12T10:00:00Z',
        },
      ],
      error: null,
    })

    const settings = await getUserSettings()
    expect(mockRpc).toHaveBeenCalledWith('get_or_create_user_settings')
    expect(settings).toEqual({
      theme: 'system',
      notificationsEnabled: true,
      createdAt: '2026-11-12T10:00:00Z',
      updatedAt: '2026-11-12T10:00:00Z',
    })
  })

  it('updateUserSettings valida tema e atualiza preferências no banco', async () => {
    await expect(
      updateUserSettings({ theme: 'invalid-theme' }),
    ).rejects.toThrow('Tema inválido. Escolha entre light, dark ou system.')

    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          user_id: 'test-user-id',
          theme: 'dark',
          notifications_enabled: false,
          updated_at: '2026-11-12T10:05:00Z',
        },
        error: null,
      }),
    }
    mockFrom.mockReturnValueOnce(chain)

    const updated = await updateUserSettings({
      theme: 'dark',
      notificationsEnabled: false,
    })

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: 'dark',
        notifications_enabled: false,
      }),
    )
    expect(updated.theme).toBe('dark')
    expect(updated.notificationsEnabled).toBe(false)
  })
})
