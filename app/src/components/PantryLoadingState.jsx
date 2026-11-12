function PantryLoadingState({
  message = 'Carregando...',
  submessage,
  size = 'md',
  className = '',
}) {
  const isFullscreen = size === 'fullscreen'
  const isSm = size === 'sm'
  const isLg = size === 'lg' || isFullscreen

  const imgSizeClass = isSm
    ? 'h-8 w-8'
    : isLg
      ? 'h-16 w-16 sm:h-20 sm:w-20'
      : 'h-12 w-12 sm:h-14 sm:w-14'

  const content = (
    <div
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${className}`}
      role="status"
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-2 animate-pulse rounded-full bg-secondary-container/70 blur-md" />
        <img
          alt="Smart Pantry"
          className={`relative ${imgSizeClass} animate-pulse object-contain transition-transform duration-700`}
          src="/logo-icon-smart-pantry.png"
        />
      </div>
      {message && (
        <p
          className={`font-bold text-primary ${
            isSm ? 'mt-2 text-xs' : isLg ? 'mt-4 text-base' : 'mt-3 text-sm'
          }`}
        >
          {message}
        </p>
      )}
      {submessage && (
        <p className="mt-1 max-w-xs text-xs text-on-surface-variant">
          {submessage}
        </p>
      )}
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background px-4">
        <div className="surface-card flex flex-col items-center gap-4 p-8 shadow-md sm:p-10">
          {content}
        </div>
      </div>
    )
  }

  return content
}

export default PantryLoadingState
