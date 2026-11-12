import { useEffect, useId, useState } from 'react'
import { DAY_LABELS, MEAL_TYPES } from '../lib/mealPlan.js'
import {
  listRecipeCategories,
  listRecipeLibrary,
} from '../services/recipeLibrary.js'

function TemplateItemModal({
  isOpen,
  dayOfWeek,
  onClose,
  onSelect,
  isSubmitting = false,
  error = '',
  lockBody = true,
}) {
  const titleId = useId()
  const [mealType, setMealType] = useState(MEAL_TYPES[0])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState([])
  const [recipes, setRecipes] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    setMealType(MEAL_TYPES[0])
    setSearch('')
    setCategory('')
    setSelectedRecipe(null)
    setLoadError('')
  }, [isOpen, dayOfWeek])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    if (lockBody) document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (lockBody) document.body.style.overflow = ''
    }
  }, [isOpen, isSubmitting, onClose, lockBody])

  useEffect(() => {
    if (!isOpen) return undefined

    let isActive = true

    listRecipeCategories()
      .then((result) => {
        if (isActive) setCategories(result)
      })
      .catch(() => {
        if (isActive) setCategories([])
      })

    return () => {
      isActive = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    let isActive = true
    const timer = setTimeout(() => {
      setIsLoading(true)
      setLoadError('')

      listRecipeLibrary({ search, category, pageSize: 30 })
        .then((result) => {
          if (isActive) setRecipes(result.recipes)
        })
        .catch((requestError) => {
          if (isActive) {
            setLoadError(
              requestError.message ||
                'Não foi possível carregar sua biblioteca de receitas.',
            )
            setRecipes([])
          }
        })
        .finally(() => {
          if (isActive) setIsLoading(false)
        })
    }, 300)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [isOpen, search, category])

  if (!isOpen) return null

  function handleSearchChange(event) {
    setSearch(event.target.value)
    setSelectedRecipe(null)
  }

  function handleCategoryChange(event) {
    setCategory(event.target.value)
    setSelectedRecipe(null)
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (!selectedRecipe || isSubmitting) return

    onSelect({ dayOfWeek, mealType, recipe: selectedRecipe })
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[55] flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
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
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Template · {DAY_LABELS[dayOfWeek] || dayOfWeek}
            </p>
            <h2 className="mt-1 text-lg font-bold text-primary" id={titleId}>
              Adicionar refeição
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Escolha o tipo de refeição e uma receita da sua biblioteca.
            </p>
          </div>
          <button
            aria-label="Fechar seletor de receitas"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <form
          className="flex-1 overflow-y-auto px-5 py-5 sm:px-6"
          onSubmit={handleSubmit}
        >
          <fieldset>
            <legend className="text-sm font-bold text-on-surface">
              Refeição
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((meal) => (
                <button
                  aria-pressed={mealType === meal}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    mealType === meal
                      ? 'border-primary bg-secondary-container text-primary'
                      : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:text-primary'
                  }`}
                  disabled={isSubmitting}
                  key={meal}
                  onClick={() => setMealType(meal)}
                  type="button"
                >
                  {meal}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="relative block">
              <span className="sr-only">Buscar receita</span>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-outline">
                search
              </span>
              <input
                className="w-full rounded-xl border border-outline-variant bg-white py-3 pl-10 pr-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                disabled={isSubmitting}
                onChange={handleSearchChange}
                placeholder="Buscar por nome ou categoria..."
                type="search"
                value={search}
              />
            </label>

            <label className="block">
              <span className="sr-only">Filtrar por categoria</span>
              <select
                className="w-full rounded-xl border border-outline-variant bg-white px-3 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-48"
                disabled={isSubmitting}
                onChange={handleCategoryChange}
                value={category}
              >
                <option value="">Todas as categorias</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-outline-variant">
            {isLoading && (
              <div className="flex items-center gap-3 p-4 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-primary">
                  progress_activity
                </span>
                Carregando receitas...
              </div>
            )}

            {!isLoading && loadError && (
              <p className="p-4 text-sm text-red-800" role="alert">
                {loadError}
              </p>
            )}

            {!isLoading && !loadError && recipes.length === 0 && (
              <div className="p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-outline">
                  menu_book
                </span>
                <p className="mt-2 text-sm font-bold text-primary">
                  Nenhuma receita encontrada
                </p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Descubra receitas na despensa ou ajuste a busca.
                </p>
              </div>
            )}

            {!isLoading && !loadError && recipes.length > 0 && (
              <ul className="divide-y divide-outline-variant/60">
                {recipes.map((recipe) => {
                  const isSelected = selectedRecipe?.id === recipe.id

                  return (
                    <li key={recipe.id}>
                      <button
                        aria-pressed={isSelected}
                        className={`flex w-full items-center gap-3 p-3 text-left transition ${
                          isSelected
                            ? 'bg-secondary-container/70'
                            : 'hover:bg-surface-container-low'
                        }`}
                        disabled={isSubmitting}
                        onClick={() => setSelectedRecipe(recipe)}
                        type="button"
                      >
                        {recipe.image ? (
                          <img
                            alt={recipe.title}
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            src={recipe.image}
                          />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-surface-container text-outline">
                            <span className="material-symbols-outlined">
                              restaurant
                            </span>
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-on-surface">
                            {recipe.title}
                          </span>
                          <span className="mt-0.5 block text-xs capitalize text-on-surface-variant">
                            {recipe.category} · {recipe.time}
                          </span>
                        </span>
                        <span
                          className={`material-symbols-outlined text-xl ${
                            isSelected ? 'text-primary' : 'text-outline'
                          }`}
                        >
                          {isSelected ? 'check_circle' : 'add_circle'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {error && (
            <p
              className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </p>
          )}
        </form>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low/50 px-5 py-4 sm:px-6">
          <button
            className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container disabled:opacity-60"
            disabled={!selectedRecipe || isSubmitting}
            onClick={handleSubmit}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">playlist_add</span>
            {isSubmitting ? 'Adicionando...' : 'Adicionar ao template'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default TemplateItemModal
