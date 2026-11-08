import { useEffect, useId, useMemo, useState } from 'react'
import { formatQuantity } from '../lib/format.js'
import {
  findMatchingPantryItems,
  ingredientNamesMatch,
} from '../lib/ingredientMatch.js'

function buildRows(matches) {
  return matches.map((item) => ({
    pantryItemId: item.id,
    name: item.name,
    unit: item.unit,
    available: Number(item.quantity),
    include: true,
    mode: 'total',
    amount: '',
  }))
}

function isPartialAmountValid(row) {
  const amount = Number(row.amount)
  return Number.isFinite(amount) && amount > 0 && amount <= row.available
}

function CookRecipeModal({
  recipe,
  pantryItems,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) {
  const titleId = useId()

  // Usa apenas os itens da despensa realmente relacionados aos ingredientes
  // que o Gemini indicou como disponíveis nesta receita.
  const matches = useMemo(
    () => findMatchingPantryItems(recipe.usedIngredients, pantryItems),
    [recipe.usedIngredients, pantryItems],
  )

  const unmatchedIngredients = useMemo(() => {
    const used = (recipe.usedIngredients ?? []).filter(
      (ingredient) => ingredient?.name,
    )

    return used.filter(
      (ingredient) =>
        !matches.some((item) =>
          ingredientNamesMatch(item.name, ingredient.name),
        ),
    )
  }, [recipe.usedIngredients, matches])

  const [rows, setRows] = useState(() => buildRows(matches))

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isSubmitting, onClose])

  const selectedRows = rows.filter((row) => row.include)
  const hasInvalidPartial = selectedRows.some(
    (row) => row.mode === 'partial' && !isPartialAmountValid(row),
  )
  const canSubmit = selectedRows.length > 0 && !hasInvalidPartial && !isSubmitting

  function updateRow(pantryItemId, changes) {
    setRows((current) =>
      current.map((row) =>
        row.pantryItemId === pantryItemId ? { ...row, ...changes } : row,
      ),
    )
  }

  function handleSubmit() {
    if (!canSubmit) return

    onConfirm(
      selectedRows.map((row) => ({
        pantryItemId: row.pantryItemId,
        quantity: row.mode === 'total' ? row.available : Number(row.amount),
      })),
    )
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
      role="dialog"
    >
      <section
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Registrar consumo
            </p>
            <h2
              className="mt-1 line-clamp-2 text-xl font-bold text-primary"
              id={titleId}
            >
              {recipe.title}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Confirme os itens da sua despensa usados no preparo.
            </p>
          </div>
          <button
            aria-label="Fechar registro de consumo"
            className="icon-button shrink-0"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-secondary-container/60 p-3.5 text-xs leading-5 text-primary">
            <span className="material-symbols-outlined text-lg">info</span>
            <p>
              O consumo será registrado no histórico de movimentações. No
              consumo total, o item sai da despensa ativa; no parcial, o saldo
              restante continua disponível.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-center">
              <div>
                <span className="material-symbols-outlined text-4xl text-primary">
                  shopping_basket
                </span>
                <p className="mt-2 font-bold text-primary">
                  Nenhum item da despensa foi identificado
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Não foi possível relacionar os ingredientes desta receita aos
                  itens cadastrados no seu estoque.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const isPartialInvalid =
                  row.mode === 'partial' && !isPartialAmountValid(row)

                return (
                  <li
                    className={`rounded-xl border p-4 transition ${
                      row.include
                        ? 'border-outline-variant bg-white'
                        : 'border-outline-variant/50 bg-surface-container-low/50 opacity-70'
                    }`}
                    key={row.pantryItemId}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        aria-label={`Incluir ${row.name} no consumo`}
                        checked={row.include}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#154212]"
                        disabled={isSubmitting}
                        onChange={(event) =>
                          updateRow(row.pantryItemId, {
                            include: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="truncate font-bold text-on-surface">
                            {row.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-1 text-xs font-semibold text-on-surface-variant">
                            Disponível: {formatQuantity(row.available, row.unit)}
                          </span>
                        </div>

                        {row.include && (
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div
                              aria-label={`Tipo de consumo de ${row.name}`}
                              className="inline-flex rounded-lg border border-outline-variant bg-white p-0.5"
                              role="group"
                            >
                              <button
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                  row.mode === 'total'
                                    ? 'bg-primary text-white'
                                    : 'text-on-surface-variant hover:text-primary'
                                }`}
                                disabled={isSubmitting}
                                onClick={() =>
                                  updateRow(row.pantryItemId, { mode: 'total' })
                                }
                                type="button"
                              >
                                Consumo total
                              </button>
                              <button
                                className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                                  row.mode === 'partial'
                                    ? 'bg-primary text-white'
                                    : 'text-on-surface-variant hover:text-primary'
                                }`}
                                disabled={isSubmitting}
                                onClick={() =>
                                  updateRow(row.pantryItemId, { mode: 'partial' })
                                }
                                type="button"
                              >
                                Consumo parcial
                              </button>
                            </div>

                            {row.mode === 'partial' && (
                              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                                Quantidade usada
                                <input
                                  className={`w-28 rounded-lg border bg-white px-2.5 py-1.5 font-normal text-on-surface outline-none transition focus:ring-2 focus:ring-primary/15 ${
                                    isPartialInvalid
                                      ? 'border-red-400 focus:border-red-500'
                                      : 'border-outline-variant focus:border-primary'
                                  }`}
                                  disabled={isSubmitting}
                                  max={row.available}
                                  min="0.001"
                                  onChange={(event) =>
                                    updateRow(row.pantryItemId, {
                                      amount: event.target.value,
                                    })
                                  }
                                  placeholder={`máx. ${row.available}`}
                                  step="0.001"
                                  type="number"
                                  value={row.amount}
                                />
                                <span>{row.unit}</span>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {row.include && isPartialInvalid && (
                      <p className="mt-2 pl-7 text-xs font-semibold text-red-700">
                        Informe uma quantidade maior que zero e menor ou igual a{' '}
                        {formatQuantity(row.available, row.unit)}.
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {unmatchedIngredients.length > 0 && rows.length > 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              <strong>Não encontrados na despensa:</strong>{' '}
              {unmatchedIngredients
                .map((ingredient) => ingredient.name)
                .join(', ')}
              . Esses itens não serão registrados como consumo.
            </p>
          )}

          {error && (
            <p
              className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse items-stretch gap-2 border-t border-outline-variant bg-surface-container-low/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs font-semibold text-on-surface-variant">
            {selectedRows.length}{' '}
            {selectedRows.length === 1
              ? 'ingrediente selecionado'
              : 'ingredientes selecionados'}
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container disabled:opacity-60"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canSubmit}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">
                    progress_activity
                  </span>
                  Registrando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">
                    check
                  </span>
                  Confirmar consumo
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CookRecipeModal
