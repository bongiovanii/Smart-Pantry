import { useEffect, useId, useState } from 'react'
import WeekPlanner from './WeekPlanner.jsx'
import { listWeeklyPlan } from '../services/mealPlan.js'
import { formatWeekRange } from '../lib/week.js'

function PlanHistoryModal({ isOpen, week, onClose, onOpenRecipe }) {
  const titleId = useId()
  const [plan, setPlan] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !week?.weekStart) return undefined

    let isActive = true

    setIsLoading(true)
    setError('')

    listWeeklyPlan(week.weekStart)
      .then((entries) => {
        if (isActive) setPlan(entries)
      })
      .catch((requestError) => {
        if (isActive) {
          setError(
            requestError.message ||
              'Não foi possível carregar as refeições desta semana.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isOpen, week?.weekStart])

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !week) return null

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
    >
      <section
        aria-labelledby={titleId}
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-6xl sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Histórico · Semana {week.weekIndex} do ciclo
            </p>
            <h2 className="mt-1 text-lg font-bold text-primary" id={titleId}>
              {formatWeekRange(week.weekStart)}
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              {week.templateName
                ? `Template aplicado: ${week.templateName}`
                : 'Semana sem template aplicado'}
              {' · '}
              {week.mealCount}{' '}
              {week.mealCount === 1 ? 'refeição' : 'refeições'}
            </p>
          </div>
          <button
            aria-label="Fechar histórico da semana"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <WeekPlanner
            compact
            emptyMessage="Nenhuma refeição registrada"
            error={error}
            eyebrow=""
            isLoading={isLoading}
            onOpenRecipe={onOpenRecipe}
            plan={plan}
            readOnly
            sectionId=""
            showCount={false}
            title=""
            weekStart={week.weekStart}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low/50 px-5 py-4 sm:px-6">
          <button
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
      </section>
    </div>
  )
}

export default PlanHistoryModal
