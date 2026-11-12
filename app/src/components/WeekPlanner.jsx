import FavoriteButton from './FavoriteButton.jsx'
import { DAY_LABELS, MEAL_TYPES, WEEK_DAYS } from '../lib/mealPlan.js'
import { formatShortDate, getDateForDay } from '../lib/week.js'

function MealCard({
  entry,
  onOpenRecipe,
  onRemove,
  readOnly = false,
  isFavorite = false,
  onToggleFavorite,
}) {
  const { recipe } = entry
  const hasRemove = !readOnly && typeof onRemove === 'function'
  const hasFav = typeof onToggleFavorite === 'function'
  const prClass = hasRemove && hasFav ? 'pr-16' : hasRemove || hasFav ? 'pr-9' : ''

  return (
    <div className="relative">
      <button
        aria-label={`Ver detalhes de ${recipe.title}`}
        className={`flex w-full flex-col gap-1 rounded-xl border border-secondary-container bg-secondary-container/40 p-3 text-left transition hover:border-primary/40 ${prClass}`}
        onClick={() => onOpenRecipe?.(recipe)}
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

      {(hasFav || hasRemove) && (
        <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
          {hasFav && (
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              recipe={recipe}
              size="sm"
            />
          )}
          {hasRemove && (
            <button
              aria-label={`Remover ${recipe.title} do planejamento`}
              className="grid h-7 w-7 place-items-center rounded-lg text-on-surface-variant transition hover:bg-red-50 hover:text-red-700"
              onClick={() => onRemove(entry)}
              title="Remover do planejamento"
              type="button"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      )}
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
  isFavorite,
  onToggleFavorite,
  eyebrow = 'Sua semana',
  title = 'Planejamento semanal',
  description = '',
  readOnly = false,
  sectionId = 'planejamento',
  weekStart = '',
  emptyMessage = '',
  compact = false,
  showCount = true,
}) {
  const canEdit = !readOnly && typeof onAddMeal === 'function'
  const showHeader = Boolean(eyebrow || title)

  return (
    <section
      className={compact ? '' : 'mt-9 lg:mt-12'}
      id={sectionId || undefined}
    >
      {showHeader && (
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow && (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-on-surface-variant">
                {description}
              </p>
            )}
          </div>
          {showCount && !isLoading && !error && (
            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
              {plan.length}{' '}
              {plan.length === 1
                ? 'refeição planejada'
                : 'refeições planejadas'}
            </span>
          )}
        </div>
      )}

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
          {onRetry && (
            <button
              className="mt-3 font-bold underline"
              onClick={onRetry}
              type="button"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && (
        <div className="week-grid">
          {WEEK_DAYS.map((day, dayIndex) => {
            const entries = plan
              .filter((entry) => entry.dayOfWeek === day)
              .sort(
                (a, b) =>
                  MEAL_TYPES.indexOf(a.mealType) -
                  MEAL_TYPES.indexOf(b.mealType),
              )
            const dayDate = weekStart
              ? formatShortDate(getDateForDay(weekStart, dayIndex))
              : ''

            return (
              <article className="day-column" key={day}>
                <p className="border-b border-primary/10 pb-2 text-center text-xs font-bold tracking-widest text-on-surface-variant">
                  {DAY_LABELS[day]}
                  {dayDate && (
                    <span className="mt-0.5 block text-[10px] font-semibold tracking-normal text-outline">
                      {dayDate}
                    </span>
                  )}
                </p>

                <div className="flex flex-1 flex-col gap-2">
                  {entries.map((entry) => (
                    <MealCard
                      entry={entry}
                      isFavorite={
                        typeof isFavorite === 'function'
                          ? isFavorite(entry.recipe)
                          : Boolean(entry.recipe?.isFavorite)
                      }
                      key={entry.planId}
                      onOpenRecipe={onOpenRecipe}
                      onRemove={onRemoveMeal}
                      onToggleFavorite={onToggleFavorite}
                      readOnly={readOnly}
                    />
                  ))}

                  {canEdit && (
                    <button
                      aria-label={`Adicionar refeição para ${DAY_LABELS[day]}`}
                      className="grid min-h-20 flex-1 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface text-outline transition hover:bg-surface-container-low hover:text-primary"
                      onClick={() => onAddMeal(day)}
                      type="button"
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  )}

                  {!canEdit && entries.length === 0 && (
                    <p className="grid min-h-20 flex-1 place-items-center rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low/30 px-2 text-center text-[11px] text-outline">
                      {emptyMessage || 'Nenhuma refeição'}
                    </p>
                  )}
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
