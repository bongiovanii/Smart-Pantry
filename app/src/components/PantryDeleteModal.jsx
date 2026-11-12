import { useState } from 'react'

/**
 * Modal para registrar a baixa de um alimento da despensa,
 * diferenciando se o item foi consumido, se foi descartado por validade/estrago,
 * ou se foi cadastrado por engano.
 */
export default function PantryDeleteModal({
  item,
  isSubmitting = false,
  onClose,
  onConfirm,
}) {
  const [disposition, setDisposition] = useState('consumed')
  const [reason, setReason] = useState('')

  if (!item) return null

  function handleSubmit(e) {
    e.preventDefault()
    onConfirm({
      disposition,
      reason: reason.trim(),
    })
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/45 p-4 backdrop-blur-[2px]"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="material-symbols-outlined text-2xl">inventory_2</span>
            <h3 className="text-lg font-bold text-on-surface">Baixa de alimento</h3>
          </div>
          <button
            aria-label="Fechar modal"
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-low"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <p className="text-sm text-on-surface-variant">
              O que aconteceu com <strong>{item.name}</strong> ({item.quantity} {item.unit})?
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Opção 1: Consumido */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                disposition === 'consumed'
                  ? 'border-primary bg-secondary-container/30 ring-1 ring-primary'
                  : 'border-outline-variant/60 hover:bg-surface-container-low'
              }`}
            >
              <input
                checked={disposition === 'consumed'}
                className="mt-1 text-primary focus:ring-primary"
                name="disposition"
                onChange={() => setDisposition('consumed')}
                type="radio"
                value="consumed"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🍽️</span>
                  <span className="text-sm font-bold text-on-surface">
                    Foi consumido
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  Usado em lanches ou refeições fora do app. Melhora sua taxa de aproveitamento!
                </p>
              </div>
            </label>

            {/* Opção 2: Descartado */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                disposition === 'wasted'
                  ? 'border-red-600 bg-red-50/60 ring-1 ring-red-600'
                  : 'border-outline-variant/60 hover:bg-surface-container-low'
              }`}
            >
              <input
                checked={disposition === 'wasted'}
                className="mt-1 text-red-600 focus:ring-red-600"
                name="disposition"
                onChange={() => setDisposition('wasted')}
                type="radio"
                value="wasted"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🗑️</span>
                  <span className="text-sm font-bold text-on-surface">
                    Venceu ou estragou
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  Contabilizado como desperdício para ajudar na sua conscientização e economia.
                </p>
              </div>
            </label>

            {/* Opção 3: Erro de cadastro */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                disposition === 'mistake'
                  ? 'border-zinc-500 bg-zinc-50 ring-1 ring-zinc-500'
                  : 'border-outline-variant/60 hover:bg-surface-container-low'
              }`}
            >
              <input
                checked={disposition === 'mistake'}
                className="mt-1 text-zinc-600 focus:ring-zinc-600"
                name="disposition"
                onChange={() => setDisposition('mistake')}
                type="radio"
                value="mistake"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">✏️</span>
                  <span className="text-sm font-bold text-on-surface">
                    Cadastrei por engano / Limpar
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  Apenas remove da despensa sem alterar as estatísticas de consumo ou desperdício.
                </p>
              </div>
            </label>
          </div>

          {disposition === 'wasted' && (
            <div className="pt-1">
              <label
                className="block text-xs font-semibold text-on-surface-variant"
                htmlFor="waste-reason"
              >
                Motivo do descarte (opcional):
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-outline-variant px-3 py-1.5 text-xs text-on-surface focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
                id="waste-reason"
                maxLength={80}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Passou da validade, mofou, sobrou..."
                type="text"
                value={reason}
              />
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-on-surface-variant transition hover:bg-surface-container-low"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
                disposition === 'wasted'
                  ? 'bg-red-700 hover:bg-red-800'
                  : 'bg-primary hover:bg-primary-container'
              }`}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
