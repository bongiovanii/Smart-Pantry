import { useEffect, useId, useState } from 'react'

const initialForm = {
  name: '',
  category: 'outros',
  quantity: '1',
  unit: 'un',
  expirationDate: '',
}

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

function IngredientModal({ isOpen, isSaving, onClose, onSubmit }) {
  const titleId = useId()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSaving) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, isSaving, onClose])

  if (!isOpen) return null

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.name.trim()) {
      setError('Informe o nome do ingrediente.')
      return
    }

    if (!form.quantity || Number(form.quantity) <= 0) {
      setError('Informe uma quantidade maior que zero.')
      return
    }

    try {
      await onSubmit(form)
      setForm(initialForm)
    } catch (submitError) {
      setError(submitError.message || 'Não foi possível cadastrar o ingrediente.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[1.75rem] bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-[1.75rem] sm:p-7"
        role="dialog"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Minha despensa
            </p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold text-primary">
              Novo ingrediente
            </h2>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Preencha os dados para incluir o item no seu estoque.
            </p>
          </div>
          <button
            aria-label="Fechar cadastro"
            className="icon-button"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-semibold text-on-surface sm:col-span-2">
            Nome do ingrediente
            <input
              autoFocus
              className="rounded-xl border border-outline-variant bg-white px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              maxLength="120"
              name="name"
              onChange={updateField}
              placeholder="Ex.: Arroz"
              required
              type="text"
              value={form.name}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-on-surface sm:col-span-2">
            Categoria
            <select
              className="rounded-xl border border-outline-variant bg-white px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              name="category"
              onChange={updateField}
              value={form.category}
            >
              {categories.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-on-surface">
            Quantidade
            <input
              className="rounded-xl border border-outline-variant bg-white px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              min="0.001"
              name="quantity"
              onChange={updateField}
              required
              step="0.001"
              type="number"
              value={form.quantity}
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-on-surface">
            Unidade
            <select
              className="rounded-xl border border-outline-variant bg-white px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              name="unit"
              onChange={updateField}
              value={form.unit}
            >
              {units.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-on-surface sm:col-span-2">
            Data de validade <span className="font-normal text-on-surface-variant">(opcional)</span>
            <input
              className="rounded-xl border border-outline-variant bg-white px-4 py-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              name="expirationDate"
              onChange={updateField}
              type="date"
              value={form.expirationDate}
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 sm:col-span-2" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 grid grid-cols-2 gap-3 sm:col-span-2">
            <button
              className="rounded-xl border border-outline-variant px-4 py-3 text-sm font-bold text-primary transition hover:bg-surface-container-low disabled:opacity-60"
              disabled={isSaving}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-container disabled:cursor-wait disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default IngredientModal
