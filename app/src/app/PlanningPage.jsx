import { useEffect, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PlanHistoryModal from '../components/PlanHistoryModal.jsx'
import TemplateEditorModal from '../components/TemplateEditorModal.jsx'
import TemplateFormModal from '../components/TemplateFormModal.jsx'
import WeekPlanner from '../components/WeekPlanner.jsx'
import { formatWeekRange } from '../lib/week.js'
import {
  listPlanHistory,
  startNewMealPlanCycle,
} from '../services/mealPlan.js'
import {
  applyTemplate,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  listTemplates,
  saveCurrentWeekAsTemplate,
  updateTemplate,
} from '../services/mealPlanTemplates.js'

const HISTORY_PAGE_SIZE = 20

function TemplateCard({
  template,
  isDuplicating,
  onApply,
  onEdit,
  onRename,
  onDuplicate,
  onDelete,
}) {
  const progress = Math.min(100, Math.round((template.mealCount / 28) * 100))

  return (
    <article className="surface-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-secondary-container px-2.5 py-1 text-[11px] font-bold text-primary">
            Semana {template.weekIndex} do ciclo
          </span>
          <h3 className="mt-2 truncate text-lg font-bold text-primary">
            {template.name}
          </h3>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-on-surface-variant">
            {template.description || 'Sem descrição.'}
          </p>
        </div>
        <span className="shrink-0 text-right text-xs font-semibold text-on-surface-variant">
          {template.mealCount}
          <span className="block text-[10px] font-normal text-outline">de 28</span>
        </span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-white transition hover:bg-primary-container"
          onClick={() => onApply(template)}
          type="button"
        >
          <span className="material-symbols-outlined text-base">play_arrow</span>
          Aplicar
        </button>
        <button
          className="flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-white px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-surface-container-low"
          onClick={() => onEdit(template)}
          type="button"
        >
          <span className="material-symbols-outlined text-base">edit</span>
          Editar
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 border-t border-outline-variant/60 pt-2">
        <button
          className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
          onClick={() => onRename(template)}
          type="button"
        >
          Renomear
        </button>
        <button
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-on-surface-variant transition hover:bg-surface-container hover:text-primary disabled:opacity-50"
          disabled={isDuplicating}
          onClick={() => onDuplicate(template)}
          type="button"
        >
          <span className="material-symbols-outlined text-sm">content_copy</span>
          {isDuplicating ? 'Duplicando...' : 'Duplicar'}
        </button>
        <button
          className="rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-700 transition hover:bg-red-50"
          onClick={() => onDelete(template)}
          type="button"
        >
          Excluir
        </button>
      </div>
    </article>
  )
}

function PlanningPage({
  plan = [],
  planContext = null,
  isPlanLoading = false,
  planError = '',
  onRetryPlan,
  onReloadPlan,
  onAddMeal,
  onRemoveMeal,
  onOpenRecipe,
  onNotice,
}) {
  const [templates, setTemplates] = useState([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [templatesError, setTemplatesError] = useState('')
  const [templatesVersion, setTemplatesVersion] = useState(0)
  const [actionError, setActionError] = useState('')
  const [duplicatingId, setDuplicatingId] = useState('')

  const [formState, setFormState] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSavingForm, setIsSavingForm] = useState(false)

  const [editorTemplate, setEditorTemplate] = useState(null)

  const [applyTarget, setApplyTarget] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyError, setApplyError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [isCycleConfirmOpen, setIsCycleConfirmOpen] = useState(false)
  const [isStartingCycle, setIsStartingCycle] = useState(false)
  const [cycleError, setCycleError] = useState('')

  const [history, setHistory] = useState({
    weeks: [],
    totalCount: 0,
    totalPages: 1,
    page: 1,
    pageSize: HISTORY_PAGE_SIZE,
  })
  const [historyPage, setHistoryPage] = useState(1)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [historyVersion, setHistoryVersion] = useState(0)
  const [historyTarget, setHistoryTarget] = useState(null)

  const weekIndex = planContext?.weekIndex ?? 1
  const weekStart = planContext?.weekStart ?? ''
  const availableWeeks = [1, 2, 3, 4].filter(
    (week) => !templates.some((template) => template.weekIndex === week),
  )

  useEffect(() => {
    let isActive = true

    setIsLoadingTemplates(true)
    setTemplatesError('')

    listTemplates()
      .then((result) => {
        if (isActive) setTemplates(result)
      })
      .catch((error) => {
        if (isActive) {
          setTemplatesError(
            error.message || 'Não foi possível carregar seus templates.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingTemplates(false)
      })

    return () => {
      isActive = false
    }
  }, [templatesVersion])

  useEffect(() => {
    let isActive = true

    setIsLoadingHistory(true)
    setHistoryError('')

    listPlanHistory({ page: historyPage, pageSize: HISTORY_PAGE_SIZE })
      .then((result) => {
        if (isActive) setHistory(result)
      })
      .catch((error) => {
        if (isActive) {
          setHistoryError(
            error.message || 'Não foi possível carregar o histórico.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingHistory(false)
      })

    return () => {
      isActive = false
    }
  }, [historyPage, historyVersion])

  function reloadTemplates() {
    setTemplatesVersion((current) => current + 1)
  }

  function reloadHistory() {
    setHistoryVersion((current) => current + 1)
  }

  function openCreateForm() {
    setActionError('')

    if (availableWeeks.length === 0) {
      setActionError(
        'Você já tem 4 templates. Exclua um template para criar outro.',
      )
      return
    }

    setFormError('')
    setFormState({
      mode: 'create',
      weekIndex: availableWeeks[0],
      availableWeeks,
    })
  }

  function openRenameForm(template) {
    setFormError('')
    setFormState({
      mode: 'edit',
      template,
      weekIndex: template.weekIndex,
      availableWeeks,
    })
  }

  function openSaveForm() {
    setFormError('')
    setFormState({
      mode: 'save',
      weekIndex,
      availableWeeks,
    })
  }

  async function handleFormSubmit(values) {
    if (!formState) return

    setIsSavingForm(true)
    setFormError('')

    try {
      if (formState.mode === 'create') {
        const created = await createTemplate(values)
        onNotice?.(
          `Template "${created.name}" criado para a semana ${created.weekIndex} do ciclo.`,
        )
      } else if (formState.mode === 'edit') {
        const updated = await updateTemplate(formState.template.id, values)
        onNotice?.(`Template "${updated.name}" atualizado.`)
      } else {
        const saved = await saveCurrentWeekAsTemplate(values)
        onNotice?.(`Semana atual salva no template "${saved.name}".`)
      }

      setFormState(null)
      reloadTemplates()
      reloadHistory()
    } catch (error) {
      setFormError(error.message || 'Não foi possível salvar o template.')
    } finally {
      setIsSavingForm(false)
    }
  }

  async function handleApply() {
    if (!applyTarget) return

    const templateName = applyTarget.name
    setIsApplying(true)
    setApplyError('')

    try {
      const result = await applyTemplate(applyTarget.id)
      setApplyTarget(null)
      onNotice?.(
        `Template "${templateName}" aplicado à semana atual (${result.mealCount} refeições).`,
      )
      onReloadPlan?.()
      reloadTemplates()
      reloadHistory()
    } catch (error) {
      setApplyError(error.message || 'Não foi possível aplicar o template.')
    } finally {
      setIsApplying(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return

    const templateName = deleteTarget.name
    setIsDeleting(true)
    setDeleteError('')

    try {
      await deleteTemplate(deleteTarget.id)
      setDeleteTarget(null)
      onNotice?.(`Template "${templateName}" excluído.`)
      reloadTemplates()
      reloadHistory()
    } catch (error) {
      setDeleteError(error.message || 'Não foi possível excluir o template.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDuplicate(template) {
    setDuplicatingId(template.id)
    setActionError('')

    try {
      const copy = await duplicateTemplate(template.id)
      onNotice?.(
        `Template "${template.name}" duplicado para a semana ${copy.weekIndex} do ciclo.`,
      )
      reloadTemplates()
    } catch (error) {
      setActionError(
        error.message || 'Não foi possível duplicar o template.',
      )
    } finally {
      setDuplicatingId('')
    }
  }

  async function handleStartNewCycle() {
    setIsStartingCycle(true)
    setCycleError('')

    try {
      await startNewMealPlanCycle()
      setIsCycleConfirmOpen(false)
      onNotice?.(
        'Novo ciclo iniciado. A semana atual voltou a ser a semana 1 de 4.',
      )
      onReloadPlan?.()
      reloadHistory()
    } catch (error) {
      setCycleError(error.message || 'Não foi possível iniciar um novo ciclo.')
    } finally {
      setIsStartingCycle(false)
    }
  }

  return (
    <div>
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Planejamento
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Seu planejamento
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Organize a semana atual e reuse até 4 templates, um para cada
              semana do ciclo. O ciclo se repete a cada 4 semanas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-surface-container-low disabled:opacity-50"
              disabled={plan.length === 0 || isPlanLoading}
              onClick={openSaveForm}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">bookmark_add</span>
              Salvar como template
            </button>
            <button
              className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-surface-container-low"
              onClick={() => {
                setCycleError('')
                setIsCycleConfirmOpen(true)
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">restart_alt</span>
              Novo ciclo
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-outline-variant bg-white px-4 py-3">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">
            Semana {weekIndex} de 4
          </span>
          {weekStart && (
            <span className="text-sm font-semibold text-on-surface-variant">
              {formatWeekRange(weekStart)}
            </span>
          )}
          {planContext?.appliedTemplateName && (
            <span className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-primary">
              <span className="material-symbols-outlined text-sm">bookmark</span>
              Template da semana: {planContext.appliedTemplateName}
            </span>
          )}
        </div>
      </section>

      <WeekPlanner
        description="Clique em + para adicionar uma refeição a qualquer dia."
        error={planError}
        eyebrow="Semana atual"
        isLoading={isPlanLoading}
        onAddMeal={onAddMeal}
        onOpenRecipe={onOpenRecipe}
        onRemoveMeal={onRemoveMeal}
        onRetry={onRetryPlan}
        plan={plan}
        sectionId="planejamento-semana-atual"
        title="Refeições da semana"
        weekStart={weekStart}
      />

      <section className="mt-9 lg:mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Recorrência
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Meus templates
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Até 4 templates, um por semana do ciclo. Aplicar substitui a
              semana atual; editar a semana não altera o template.
            </p>
          </div>
          <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
            {templates.length} de 4 templates
          </span>
        </div>

        {actionError && (
          <p
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {actionError}
          </p>
        )}

        {isLoadingTemplates && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                className="surface-card min-h-56 animate-pulse bg-surface-container-low"
                key={item}
              />
            ))}
          </div>
        )}

        {!isLoadingTemplates && templatesError && (
          <div
            className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            <p className="font-bold">Não foi possível carregar seus templates.</p>
            <p className="mt-1">{templatesError}</p>
            <button
              className="mt-3 font-bold underline"
              onClick={reloadTemplates}
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoadingTemplates && !templatesError && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <TemplateCard
                isDuplicating={duplicatingId === template.id}
                key={template.id}
                onApply={setApplyTarget}
                onDelete={setDeleteTarget}
                onDuplicate={handleDuplicate}
                onEdit={setEditorTemplate}
                onRename={openRenameForm}
                template={template}
              />
            ))}

            {templates.length < 4 && (
              <button
                className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/40 p-5 text-center text-primary transition hover:bg-surface-container-low"
                onClick={openCreateForm}
                type="button"
              >
                <span className="material-symbols-outlined mb-2 text-3xl">add</span>
                <span className="text-sm font-bold">Novo template</span>
                <span className="mt-1 text-xs text-on-surface-variant">
                  {availableWeeks.length === 1
                    ? 'Falta 1 semana no ciclo'
                    : `Semanas livres: ${availableWeeks.join(', ')}`}
                </span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* __PART2__ */}
    </div>
  )
}

export default PlanningPage
