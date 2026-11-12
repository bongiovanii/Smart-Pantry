import { useEffect, useId, useState } from 'react'
import { toDateOnly } from '../lib/week.js'

const categories = [
  ['frutas', 'Frutas'],
  ['verduras', 'Verduras e legumes'],
  ['laticinios', 'Laticínios'],
  ['carnes', 'Carnes'],
  ['graos', 'Grãos e cereais'],
  ['bebidas', 'Bebidas'],
  ['outros', 'Outros'],
]

function PurchaseItemModal({
  isOpen,
  item,
  isSubmitting = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const [quantity, setQuantity] = useState(() => String(item?.quantity ?? '1'))
  const [addToPantry, setAddToPantry] = useState(true)
  const [category, setCategory] = useState(() => item?.category || 'outros')
  const [expirationDate, setExpirationDate] = useState('')
  const titleId = useId()
  const today = toDateOnly()

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
    const parsedQty = Number(String(quantity).replace(',', '.'))
    if (!parsedQty || parsedQty <= 0) return

    onConfirm({
      quantity: parsedQty,
      addToPantry,
      category,
      expirationDate: expirationDate || null,
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
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <span className="material-symbols-outlined text-2xl">
                check_circle
              </span>
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary" id={titleId}>
                Confirmar compra
              </h2>
              <p className="text-xs text-on-surface-variant">
                Marcar {item.name} como comprado
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

          <div>
            <label
              className="block text-xs font-bold text-on-surface"
              htmlFor="purchase-qty"
            >
              Quantidade comprada *
            </label>
            <div className="relative mt-1">
              <input
                autoFocus
                className="w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 pr-16 text-sm font-semibold text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="purchase-qty"
                min="0.001"
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
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

          {/* Toggle Adicionar à Despensa */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface-container-low p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-primary">
                  Adicionar à despensa
                </p>
                <p className="text-[11px] text-on-surface-variant">
                  Atualiza seu estoque automaticamente
                </p>
              </div>
              <input
                checked={addToPantry}
                className="h-5 w-5 rounded border-outline text-primary focus:ring-primary"
                id="add-to-pantry"
                onChange={(e) => setAddToPantry(e.target.checked)}
                type="checkbox"
              />
            </div>

            {addToPantry && (
              <div className="mt-4 space-y-3 border-t border-outline-variant/40 pt-3">
                <div>
                  <label
                    className="block text-[11px] font-bold text-on-surface"
                    htmlFor="purchase-cat"
                  >
                    Categoria na despensa
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs text-on-surface transition focus:border-primary focus:outline-none"
                    id="purchase-cat"
                    onChange={(e) => setCategory(e.target.value)}
                    value={category}
                  >
                    {categories.map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold text-on-surface"
                    htmlFor="purchase-exp"
                  >
                    Data de validade (opcional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-xs text-on-surface transition focus:border-primary focus:outline-none"
                    id="purchase-exp"
                    min={today}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    type="date"
                    value={expirationDate}
                  />
                  <p className="mt-1 text-[10px] text-on-surface-variant">
                    Ajuda o sistema a alertar você antes do alimento vencer.
                  </p>
                </div>
              </div>
            )}
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
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              <span className="material-symbols-outlined text-base">
                check
              </span>
              {isSubmitting ? 'Confirmando...' : 'Confirmar compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PurchaseItemModal
