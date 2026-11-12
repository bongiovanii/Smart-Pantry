import { useEffect, useId, useState } from 'react'
import WeekPlanner from './WeekPlanner.jsx'
import TemplateItemModal from './TemplateItemModal.jsx'
import {
  listTemplateItems,
  removeTemplateItem,
  upsertTemplateItem,
} from '../services/mealPlanTemplates.js'

function TemplateEditorModal({
  isOpen,
  template,
  onClose,
  onOpenRecipe,
  onChanged,
}) {
  const titleId = useId()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [pickerDay, setPickerDay] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !template?.id) return undefined

    let isActive = true

    listTemplateItems(template.id)
      .then((result) => {
        if (isActive) {
          setItems(result)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (isActive) {
          setLoadError(
            error.message || 'Não foi possível carregar as refeições do template.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [isOpen, template?.id])

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting && !pickerDay) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, isSubmitting, pickerDay, onClose])

  if (!isOpen || !template) return null

  async function handleSelect({ dayOfWeek, mealType, recipe }) {
    setIsSubmitting(true)
    setActionError('')

    try {
      const saved = await upsertTemplateItem(template.id, {
        dayOfWeek,
        mealType,
        recipe,
      })

      setItems((current) => [
        ...current.filter(
          (item) =>
            !(
              item.dayOfWeek === saved.dayOfWeek &&
              item.mealType === saved.mealType
            ),
        ),
        saved,
      ])
      setPickerDay('')
      setNotice(`"${saved.recipe.title}" adicionada ao template.`)
      onChanged?.()
    } catch (error) {
      setActionError(
        error.message || 'Não foi possível adicionar a refeição ao template.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemove(entry) {
    setActionError('')

    try {
      await removeTemplateItem(entry.itemId)
      setItems((current) =>
        current.filter((item) => item.itemId !== entry.itemId),
      )
      setNotice(`"${entry.recipe.title}" removida do template.`)
      onChanged?.()
    } catch (error) {
      setActionError(
        error.message || 'Não foi possível remover a refeição do template.',
      )
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting && !pickerDay) {
          onClose()
        }
      }}
      role="dialog"
    >
      <section
        aria-labelledby={titleId}
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-6xl sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Editando template · Semana {template.weekIndex} do ciclo
            </p>
            <h2
              className="mt-1 truncate text-lg font-bold text-primary"
              id={titleId}
            >
              {template.name}
            </h2>
            {template.description && (
              <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                {template.description}
              </p>
            )}
          </div>
          <button
            aria-label="Fechar editor de template"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-on-surface-variant">
              Clique em <strong>+</strong> para adicionar uma receita em cada dia.
              O template não altera a semana atual.
            </p>
            <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
              {items.length}{' '}
              {items.length === 1 ? 'refeição' : 'refeições'}
            </span>
          </div>

          {notice && (
            <p
              className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900"
              role="status"
            >
              {notice}
            </p>
          )}

          {actionError && (
            <p
              className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              {actionError}
            </p>
          )}

          <WeekPlanner
            compact
            emptyMessage="Sem refeição"
            error={loadError}
            eyebrow=""
            isLoading={isLoading}
            onAddMeal={setPickerDay}
            onOpenRecipe={onOpenRecipe}
            onRemoveMeal={handleRemove}
            onRetry={() => {
              setLoadError('')
              setIsLoading(true)
              listTemplateItems(template.id)
                .then(setItems)
                .catch((error) =>
                  setLoadError(
                    error.message ||
                      'Não foi possível carregar as refeições do template.',
                  ),
                )
                .finally(() => setIsLoading(false))
            }}
            plan={items}
            sectionId=""
            showCount={false}
            title=""
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-outline-variant bg-surface-container-low/50 px-5 py-4 sm:px-6">
          <button
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-container"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Concluir edição
          </button>
        </div>
      </section>

      <TemplateItemModal
        dayOfWeek={pickerDay}
        error={actionError}
        isOpen={Boolean(pickerDay)}
        isSubmitting={isSubmitting}
        lockBody={false}
        onClose={() => setPickerDay('')}
        onSelect={handleSelect}
      />
    </div>
  )
}

export default TemplateEditorModal
