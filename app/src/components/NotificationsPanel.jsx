import { useEffect, useId } from 'react'

function NotificationsPanel({
  isOpen,
  notifications = [],
  isLoading = false,
  error = '',
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onSnooze,
  onDismiss,
  onSuggestRecipe,
  onOpenSettings,
}) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const unreadCount = notifications.filter((n) => n.isUnread).length

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-end bg-on-background/45 p-0 backdrop-blur-[2px] sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
    >
      <section
        aria-labelledby={titleId}
        className="flex h-full w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-md sm:rounded-3xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-xl">
                notifications
              </span>
            </span>
            <div>
              <h2 className="text-base font-bold text-primary" id={titleId}>
                Notificações
              </h2>
              <p className="text-xs text-on-surface-variant">
                {unreadCount > 0
                  ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}`
                  : 'Nenhuma nova notificação'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary transition hover:bg-surface-container"
                onClick={onMarkAllAsRead}
                title="Marcar todas como lidas"
                type="button"
              >
                Ler todas
              </button>
            )}
            <button
              aria-label="Fechar painel de notificações"
              className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
              onClick={onClose}
              type="button"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Lista com rolagem */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((item) => (
                <div
                  className="surface-card min-h-24 animate-pulse bg-surface-container-low"
                  key={item}
                />
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div
              className="rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="py-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline">
                check_circle
              </span>
              <p className="mt-2 text-sm font-bold text-primary">
                Tudo em dia na sua despensa!
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-outline leading-relaxed">
                Nenhum alimento vencido ou próximo do vencimento nos próximos 7
                dias. Avisaremos você automaticamente quando for hora de
                aproveitar algum item.
              </p>
            </div>
          )}

          {!isLoading &&
            !error &&
            notifications.map((notification) => {
              const isExpired = notification.title.toLowerCase().includes('vencido')
              const isToday = notification.title.toLowerCase().includes('hoje')

              return (
                <article
                  className={`relative rounded-2xl border p-4 transition ${
                    notification.isUnread
                      ? 'border-primary/30 bg-primary/[0.03]'
                      : 'border-outline-variant/60 bg-white'
                  }`}
                  key={notification.id}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-base ${
                        isExpired
                          ? 'bg-red-100 text-red-700'
                          : isToday
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isExpired
                          ? 'error'
                          : isToday
                            ? 'alarm'
                            : 'notification_important'}
                      </span>
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-primary">
                          {notification.title}
                        </h3>
                        {notification.isUnread && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                        {notification.body}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary-container"
                          onClick={() => onSuggestRecipe?.(notification)}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-sm">
                            restaurant
                          </span>
                          Ver receitas
                        </button>

                        <button
                          className="flex items-center gap-1 rounded-lg border border-outline-variant px-2.5 py-1.5 text-[11px] font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
                          onClick={() => onSnooze?.(notification.id)}
                          title="Lembrar amanhã"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-sm">
                            snooze
                          </span>
                          Adiar 1 dia
                        </button>

                        {notification.isUnread && (
                          <button
                            className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-on-surface-variant transition hover:bg-surface-container"
                            onClick={() => onMarkAsRead?.(notification.id)}
                            type="button"
                          >
                            Marcar lida
                          </button>
                        )}

                        <button
                          aria-label="Dispensar notificação"
                          className="ml-auto rounded-lg p-1 text-outline transition hover:bg-surface-container hover:text-red-700"
                          onClick={() => onDismiss?.(notification.id)}
                          title="Dispensar"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-base">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low/50 px-5 py-3">
          <button
            className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant transition hover:text-primary"
            onClick={() => {
              onClose()
              onOpenSettings?.()
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-base">
              settings
            </span>
            Ajustar notificações
          </button>

          <button
            className="rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-primary border border-outline-variant transition hover:bg-surface-container"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
      </section>
    </div>
  )
}

export default NotificationsPanel
