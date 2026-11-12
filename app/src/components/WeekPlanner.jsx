import { DAY_LABELS, MEAL_TYPES, WEEK_DAYS } from '../lib/mealPlan.js'

function MealCard({ entry, onOpenRecipe, onRemove }) {
  const { recipe } = entry

  return (
    <div className="relative">
      <button
        aria-label={`Ver detalhes de ${recipe.title}`}
        className="flex w-full flex-col gap-1 rounded-xl border border-secondary-container bg-secondary-container/40 p-3 pr-9 text-left transition hover:border-primary/40"
        onClick={() => onOpenRecipe(recipe)}
        type="button"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/70">
          {entry.mealType}
        </span>
        <span className="line-clamp-2 text-sm font-semibold leading-5 text-on-surface">
          {recipe.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span>
            {recipe.time}
          </span>
          {recipe.caloriesPerServing > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                local_fire_department
              </span>
              {recipe.caloriesPerServing} kcal
            </span>
          )}
        </span>
      </button>

      <button
        aria-label={`Remover ${recipe.title} do planejamento`}
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg text-on-surface-variant transition hover:bg-red-50 hover:text-red-700"
        onClick={() => onRemove(entry)}
        title="Remover do planejamento"
        type="button"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  )
}

function WeekPlanner({
  plan = [],
  isLoading = false,
  error = '',
  onRetry,
  onAddMeal,
  onRemoveMeal,
  onOpenRecipe,
}) {
  return (
    <section id="planejamento" className="mt-9 lg:mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
            Sua semana
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Planejamento semanal
          </h2>
        </div>
        {!isLoading && !error && (
          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
            {plan.length}{' '}
            {plan.length === 1 ? 'refeição planejada' : 'refeições planejadas'}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="week-grid" aria-live="polite">
          {WEEK_DAYS.map((day) => (
            <article className="day-column" key={day}>
              <p className="border-b border-primary/10 pb-2 text-center text-xs font-bold tracking-widest text-on-surface-variant">
                {DAY_LABELS[day]}
              </p>
              <div className="min-h-24 flex-1 animate-pulse rounded-xl bg-surface-container-low" />
            </article>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <p className="font-bold">
            Não foi possível carregar o planejamento semanal.
          </p>
          <p className="mt-1">{error}</p>
          <button
            className="mt-3 font-bold underline"
            onClick={onRetry}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="week-grid">
          {WEEK_DAYS.map((day) => {
            const entries = plan
              .filter((entry) => entry.dayOfWeek === day)
              .sort(
                (a, b) =>
                  MEAL_TYPES.indexOf(a.mealType) -
                  MEAL_TYPES.indexOf(b.mealType),
              )

            return (
              <article className="day-column" key={day}>
                <p className="border-b border-primary/10 pb-2 text-center text-xs font-bold tracking-widest text-on-surface-variant">
                  {DAY_LABELS[day]}
                </p>

                <div className="flex flex-1 flex-col gap-2">
                  {entries.map((entry) => (
                    <MealCard
                      entry={entry}
                      key={entry.planId}
                      onOpenRecipe={onOpenRecipe}
                      onRemove={onRemoveMeal}
                    />
                  ))}

                  <button
                    aria-label={`Adicionar refeição para ${DAY_LABELS[day]}`}
                    className="grid min-h-20 flex-1 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface text-outline transition hover:bg-surface-container-low hover:text-primary"
                    onClick={() => onAddMeal(day)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default WeekPlanner
