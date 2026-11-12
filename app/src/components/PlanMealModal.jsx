import { useEffect, useId, useState } from 'react'
import {
  DEFAULT_RECIPE_IMAGE,
  handleRecipeImageError,
} from '../lib/recipeRecord.js'
import { DAY_LABELS, MEAL_TYPES, WEEK_DAYS } from '../lib/mealPlan.js'

function PlanMealModal({
  isOpen,
  recipe = null,
  recipes = [],
  dayOfWeek: initialDay = '',
  onClose,
  onConfirm,
  isSubmitting = false,
  error = '',
}) {
  const titleId = useId()
  const [selectedDay, setSelectedDay] = useState(initialDay || WEEK_DAYS[0])
  const [selectedMeal, setSelectedMeal] = useState(
    MEAL_TYPES.includes('Almoço') ? 'Almoço' : MEAL_TYPES[0],
  )
  const [selectedRecipeId, setSelectedRecipeId] = useState(
    recipe?.id || recipes[0]?.id || '',
  )

  useEffect(() => {
    if (!isOpen) return

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

  const selectedRecipe =
    recipe ?? recipes.find((item) => item.id === selectedRecipeId) ?? null

  function handleSubmit(event) {
    event.preventDefault()

    if (!selectedRecipe) return

    onConfirm({
      dayOfWeek: selectedDay,
      mealType: selectedMeal,
      recipe: selectedRecipe,
    })
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
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Planejamento semanal
            </p>
            <h2
              className="mt-1 text-lg font-bold text-primary"
              id={titleId}
            >
              Adicionar ao planejamento
            </h2>
          </div>
          <button
            aria-label="Fechar planejamento"
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
          {/* Receita escolhida */}
          {recipe ? (
            <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low/60 p-3">
              <img
                alt={recipe.title}
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
                onError={handleRecipeImageError}
                src={recipe.image || DEFAULT_RECIPE_IMAGE}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-on-surface">
                  {recipe.title}
                </p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {recipe.time}
                  {recipe.caloriesPerServing > 0
                    ? ` · ${recipe.caloriesPerServing} kcal`
                    : ''}
                </p>
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-bold text-on-surface">
                Receita sugerida
              </span>
              <select
                className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                disabled={recipes.length === 0}
                onChange={(event) => setSelectedRecipeId(event.target.value)}
                value={selectedRecipeId}
              >
                {recipes.length === 0 && (
                  <option value="">Nenhuma receita sugerida disponível</option>
                )}
                {recipes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              {recipes.length === 0 && (
                <p className="mt-2 text-xs text-on-surface-variant">
                  Cadastre ingredientes na despensa para receber sugestões antes
                  de planejar uma refeição.
                </p>
              )}
            </label>
          )}

          {/* Dia da semana */}
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-on-surface">
              Dia da semana
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {WEEK_DAYS.map((day) => (
                <button
                  aria-pressed={selectedDay === day}
                  className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                    selectedDay === day
                      ? 'border-primary bg-primary text-white'
                      : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:text-primary'
                  }`}
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  type="button"
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Tipo de refeição */}
          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-on-surface">
              Refeição
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((meal) => (
                <button
                  aria-pressed={selectedMeal === meal}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                    selectedMeal === meal
                      ? 'border-primary bg-secondary-container text-primary'
                      : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:text-primary'
                  }`}
                  key={meal}
                  onClick={() => setSelectedMeal(meal)}
                  type="button"
                >
                  {meal}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
            Se já existir uma refeição neste dia e horário, ela será
            substituída pela receita escolhida.
          </p>

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
            disabled={isSubmitting || !selectedRecipe}
            onClick={handleSubmit}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">
              calendar_month
            </span>
            {isSubmitting ? 'Salvando...' : 'Salvar no planejamento'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default PlanMealModal
