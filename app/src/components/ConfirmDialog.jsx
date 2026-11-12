import { useEffect, useId } from 'react'

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  icon = 'help',
  isSubmitting = false,
  error = '',
  onCancel,
  onConfirm,
  children,
}) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, isSubmitting, onCancel])

  if (!isOpen) return null

  const isDanger = tone === 'danger'

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-on-background/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel()
      }}
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div
          className={`flex items-center gap-3 ${
            isDanger ? 'text-red-700' : 'text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-3xl">{icon}</span>
          <h3
            className="text-lg font-bold text-on-surface"
            id={titleId}
          >
            {title}
          </h3>
        </div>

        {description && (
          <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}

        {children}

        {error && (
          <p
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-surface-container-low"
            disabled={isSubmitting}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-60 ${
              isDanger
                ? 'bg-red-700 hover:bg-red-800'
                : 'bg-primary hover:bg-primary-container'
            }`}
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
