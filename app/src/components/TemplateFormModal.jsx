import { useEffect, useId, useState } from 'react'

const MODE_TITLES = {
  create: 'Novo template',
  edit: 'Editar template',
  save: 'Salvar semana como template',
}

const MODE_SUBTITLES = {
  create: 'Escolha a semana do ciclo e dê um nome para o template.',
  edit: 'Atualize o nome ou a descrição do template.',
  save: 'A semana atual será copiada para um template do ciclo.',
}

function TemplateFormModal({
  isOpen,
  mode = 'create',
  template = null,
  weekIndex = 1,
  availableWeeks = [1, 2, 3, 4],
  onClose,
  onSubmit,
  isSubmitting = false,
  error = '',
}) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedWeek, setSelectedWeek] = useState(weekIndex)

  useEffect(() => {
    if (!isOpen) return

    setName(template?.name || '')
    setDescription(template?.description || '')
    setSelectedWeek(template?.weekIndex || weekIndex || 1)
  }, [isOpen, template?.id, template?.name, template?.description, template?.weekIndex, weekIndex])

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

  const canSubmit = name.trim().length > 0 && !isSubmitting

  function handleSubmit(event) {
    event.preventDefault()

    if (!canSubmit) return

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      weekIndex: selectedWeek,
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
              Templates de planejamento
            </p>
            <h2 className="mt-1 text-lg font-bold text-primary" id={titleId}>
              {MODE_TITLES[mode] || MODE_TITLES.create}
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              {MODE_SUBTITLES[mode] || MODE_SUBTITLES.create}
            </p>
          </div>
          <button
            aria-label="Fechar formulário de template"
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
          {mode === 'create' ? (
            <fieldset>
              <legend className="text-sm font-bold text-on-surface">
                Semana do ciclo
              </legend>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((week) => {
                  const isAvailable = availableWeeks.includes(week)

                  return (
                    <button
                      aria-pressed={selectedWeek === week}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition ${
                        selectedWeek === week
                          ? 'border-primary bg-primary text-white'
                          : 'border-outline-variant bg-white text-on-surface-variant hover:border-primary/40 hover:text-primary'
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                      disabled={!isAvailable || isSubmitting}
                      key={week}
                      onClick={() => setSelectedWeek(week)}
                      type="button"
                    >
                      Semana {week}
                    </button>
                  )
                })}
              </div>
              {availableWeeks.length === 0 && (
                <p className="mt-2 text-xs text-amber-800">
                  Você já tem 4 templates. Exclua um para criar outro.
                </p>
              )}
            </fieldset>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">
                calendar_view_week
              </span>
              Semana {selectedWeek} do ciclo
            </div>
          )}

          <label className="mt-5 block">
            <span className="text-sm font-bold text-on-surface">
              Nome do template
            </span>
            <input
              autoFocus
              className="mt-2 w-full rounded-xl border border-outline-variant bg-white px-3 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              disabled={isSubmitting}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Semana corrida, Semana vegetariana..."
              type="text"
              value={name}
            />
            <span className="mt-1 block text-right text-[11px] text-outline">
              {name.length}/80
            </span>
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-bold text-on-surface">
              Descrição <span className="font-normal text-on-surface-variant">(opcional)</span>
            </span>
            <textarea
              className="mt-2 min-h-24 w-full resize-y rounded-xl border border-outline-variant bg-white px-3 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              disabled={isSubmitting}
              maxLength={500}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Conte o que esse template tem de especial..."
              value={description}
            />
            <span className="mt-1 block text-right text-[11px] text-outline">
              {description.length}/500
            </span>
          </label>

          {mode === 'save' && (
            <p className="mt-4 rounded-xl bg-surface-container-low p-3 text-xs leading-5 text-on-surface-variant">
              Se já existir um template para a semana atual, ele será
              atualizado com as refeições desta semana.
            </p>
          )}

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
            disabled={!canSubmit}
            onClick={handleSubmit}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">
              {mode === 'save' ? 'bookmark_add' : 'save'}
            </span>
            {isSubmitting
              ? 'Salvando...'
              : mode === 'save'
                ? 'Salvar como template'
                : 'Salvar template'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default TemplateFormModal
