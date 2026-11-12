import { useEffect, useId, useState } from 'react'

function PantryEntryModal({
  isOpen,
  item,
  isSubmitting = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState('Reposição')
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen || !item) return null

  function handleSubmit(event) {
    event.preventDefault()
    const parsedQty = Number(quantity.replace(',', '.'))
    if (!parsedQty || parsedQty <= 0) return

    onConfirm({
      quantity: parsedQty,
      reason: reason.trim() || 'Reposição',
    })
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
      role="dialog"
    >
      <div
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">
                add_shopping_cart
              </span>
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary" id={titleId}>
                Repor alimento
              </h2>
              <p className="text-xs text-on-surface-variant">
                Adicione estoque para {item.name}
              </p>
            </div>
          </div>
          <button
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition hover:bg-surface-container"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div
              className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="rounded-xl bg-surface-container-low p-3.5 text-xs text-on-surface-variant">
            <span className="font-semibold text-on-surface">Item: </span>
            {item.name} · Saldo atual:{' '}
            <strong className="text-primary font-bold">
              {item.quantity} {item.unit}
            </strong>
          </div>

          <div>
            <label
              className="block text-xs font-bold text-on-surface"
              htmlFor="entry-qty"
            >
              Quantidade a adicionar *
            </label>
            <div className="relative mt-1">
              <input
                autoFocus
                className="w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 pr-14 text-sm font-semibold text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="entry-qty"
                min="0.001"
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ex: 2"
                required
                step="any"
                type="number"
                value={quantity}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs font-bold uppercase text-on-surface-variant">
                {item.unit}
              </span>
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold text-on-surface"
              htmlFor="entry-reason"
            >
              Motivo ou observação
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="entry-reason"
              maxLength={100}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Compra do mês, Feira semanal..."
              type="text"
              value={reason}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              className="rounded-xl border border-outline-variant px-4 py-2.5 text-xs font-bold text-on-surface transition hover:bg-surface-container"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white transition hover:bg-primary-container disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              <span className="material-symbols-outlined text-base">
                check
              </span>
              {isSubmitting ? 'Salvando...' : 'Confirmar reposição'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PantryEntryModal
