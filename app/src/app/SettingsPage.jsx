import { useState } from 'react'

function SettingsPage({
  user,
  settings,
  isUpdatingSettings = false,
  onToggleNotifications,
  onSignOut,
  onGoToPantry,
}) {
  const [toggleNotice, setToggleNotice] = useState('')

  const notificationsEnabled = settings?.notificationsEnabled ?? true

  async function handleToggle() {
    try {
      const nextValue = !notificationsEnabled
      await onToggleNotifications?.(nextValue)
      setToggleNotice(
        nextValue
          ? 'Notificações de vencimento ativadas.'
          : 'Notificações de vencimento desativadas. Você não receberá novos avisos.',
      )
      setTimeout(() => setToggleNotice(''), 4000)
    } catch {
      setToggleNotice('Não foi possível alterar a preferência de notificações.')
      setTimeout(() => setToggleNotice(''), 4000)
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Preferências
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Configurações
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Gerencie seus alertas de validade, preferências de exibição e dados
              da conta.
            </p>
          </div>

          <button
            className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-surface-container-low"
            onClick={onGoToPantry}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">kitchen</span>
            Voltar à despensa
          </button>
        </div>
      </section>

      {toggleNotice && (
        <div
          className="rounded-2xl border border-secondary/30 bg-secondary-container/60 p-4 text-xs font-semibold text-primary transition"
          role="status"
        >
          {toggleNotice}
        </div>
      )}

      {/* Seção Notificações */}
      <section className="surface-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">
                notifications_active
              </span>
            </span>
            <div>
              <h2 className="text-base font-bold text-primary">
                Notificações de vencimento
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-on-surface-variant">
                Gera alertas in-app para alimentos que estão a até 7 dias do
                vencimento ou já venceram, oferecendo sugestões de receitas para
                evitar o desperdício.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            aria-checked={notificationsEnabled}
            aria-label="Ativar ou desativar notificações de vencimento"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 ${
              notificationsEnabled ? 'bg-primary' : 'bg-surface-container-highest'
            }`}
            disabled={isUpdatingSettings}
            onClick={handleToggle}
            role="switch"
            type="button"
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="mt-4 border-t border-outline-variant/60 pt-4">
          <p className="text-xs text-on-surface-variant">
            Status atual:{' '}
            <strong className="text-primary font-bold">
              {notificationsEnabled ? 'Ativadas (recomendado)' : 'Desativadas'}
            </strong>
            . Quando desativado, o sino continuará visível, mas novos alertas de
            validade não serão criados.
          </p>
        </div>
      </section>

      {/* Seção Conta */}
      <section className="surface-card p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-secondary-container text-primary">
            <span className="material-symbols-outlined text-2xl">
              account_circle
            </span>
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-primary">Conta conectada</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Você está autenticado via Google OAuth.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-surface-container-low/40 p-4">
              <div>
                <p className="text-xs font-semibold text-outline">E-mail</p>
                <p className="text-sm font-bold text-on-surface truncate">
                  {user?.email || 'Usuário conectado'}
                </p>
              </div>

              <button
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                onClick={onSignOut}
                type="button"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
