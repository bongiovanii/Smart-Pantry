import { useEffect, useId, useState } from 'react'

const categories = [
  ['frutas', 'Frutas'],
  ['verduras', 'Verduras e legumes'],
  ['laticinios', 'Laticínios'],
  ['carnes', 'Carnes'],
  ['graos', 'Grãos e cereais'],
  ['bebidas', 'Bebidas'],
  ['outros', 'Outros'],
]

const units = [
  ['un', 'Unidade'],
  ['g', 'Grama (g)'],
  ['kg', 'Quilograma (kg)'],
  ['ml', 'Mililitro (ml)'],
  ['l', 'Litro (l)'],
  ['pacote', 'Pacote'],
  ['caixa', 'Caixa'],
  ['lata', 'Lata'],
]

function getInitialForm(item) {
  if (!item) {
    return {
      name: '',
      category: 'outros',
      quantity: '1',
      unit: 'un',
      note: '',
    }
  }
  return {
    name: item.name || '',
    category: item.category || 'outros',
    quantity: String(item.quantity ?? '1'),
    unit: item.unit || 'un',
    note: item.note || '',
  }
}

function ShoppingItemModal({
  isOpen,
  item = null,
  isSubmitting = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => getInitialForm(item))
  const [formError, setFormError] = useState('')
  const titleId = useId()
  const isEditing = Boolean(item)

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

  if (!isOpen) return null

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setFormError('Informe o nome do item.')
      return
    }

    const parsedQty = Number(String(form.quantity).replace(',', '.'))
    if (!parsedQty || parsedQty <= 0) {
      setFormError('A quantidade deve ser maior que zero.')
      return
    }

    onSubmit({
      name: trimmedName,
      category: form.category,
      unit: form.unit,
      quantity: parsedQty,
      note: form.note.trim(),
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
                {isEditing ? 'edit_note' : 'add_shopping_cart'}
              </span>
            </span>
            <div>
              <h2 className="text-lg font-bold text-primary" id={titleId}>
                {isEditing ? 'Editar item da lista' : 'Novo item para comprar'}
              </h2>
              <p className="text-xs text-on-surface-variant">
                {isEditing
                  ? 'Ajuste os dados do alimento na sua lista'
                  : 'Adicione o que você precisa comprar'}
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
          {(error || formError) && (
            <div
              className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800"
              role="alert"
            >
              {error || formError}
            </div>
          )}

          <div>
            <label
              className="block text-xs font-bold text-on-surface"
              htmlFor="shop-name"
            >
              Nome do alimento *
            </label>
            <input
              autoFocus
              className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="shop-name"
              maxLength={120}
              onChange={(e) =>
                setForm((curr) => ({ ...curr, name: e.target.value }))
              }
              placeholder="Ex: Leite desnatado, Arroz, Café..."
              required
              type="text"
              value={form.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-bold text-on-surface"
                htmlFor="shop-qty"
              >
                Quantidade *
              </label>
              <input
                className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 text-sm font-semibold text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="shop-qty"
                min="0.001"
                onChange={(e) =>
                  setForm((curr) => ({ ...curr, quantity: e.target.value }))
                }
                placeholder="1"
                required
                step="any"
                type="number"
                value={form.quantity}
              />
            </div>

            <div>
              <label
                className="block text-xs font-bold text-on-surface"
                htmlFor="shop-unit"
              >
                Unidade
              </label>
              <select
                className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="shop-unit"
                onChange={(e) =>
                  setForm((curr) => ({ ...curr, unit: e.target.value }))
                }
                value={form.unit}
              >
                {units.map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-bold text-on-surface"
              htmlFor="shop-cat"
            >
              Categoria
            </label>
            <select
              className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="shop-cat"
              onChange={(e) =>
                setForm((curr) => ({ ...curr, category: e.target.value }))
              }
              value={form.category}
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
              className="block text-xs font-bold text-on-surface"
              htmlFor="shop-note"
            >
              Observação (opcional)
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-on-surface transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="shop-note"
              maxLength={100}
              onChange={(e) =>
                setForm((curr) => ({ ...curr, note: e.target.value }))
              }
              placeholder="Ex: Marca de preferência, orgânico, etc."
              type="text"
              value={form.note}
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
                {isEditing ? 'save' : 'add'}
              </span>
              {isSubmitting
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar alterações'
                  : 'Adicionar à lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShoppingItemModal
