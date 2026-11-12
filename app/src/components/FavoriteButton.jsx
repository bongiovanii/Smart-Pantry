function FavoriteButton({
  recipe,
  isFavorite = false,
  onToggle,
  className = '',
  size = 'md',
  disabled = false,
}) {
  const title = recipe?.title || 'receita'
  const sizeClasses =
    size === 'sm'
      ? 'h-7 w-7 text-base'
      : size === 'lg'
        ? 'h-10 w-10 text-2xl'
        : 'h-9 w-9 text-xl'

  const iconSizeClasses =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'

  return (
    <button
      aria-label={
        isFavorite
          ? `Remover ${title} dos favoritos`
          : `Adicionar ${title} aos favoritos`
      }
      aria-pressed={isFavorite}
      className={`grid place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 active:scale-95 disabled:pointer-events-none disabled:opacity-50 ${sizeClasses} ${className}`}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onToggle?.(recipe)
      }}
      title={isFavorite ? 'Remover dos favoritos' : 'Favoritar receita'}
      type="button"
    >
      <span
        className={`material-symbols-outlined transition-colors duration-200 ${iconSizeClasses} ${
          isFavorite
            ? 'text-red-600'
            : 'text-on-surface-variant hover:text-red-600'
        }`}
        style={{
          fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        favorite
      </span>
    </button>
  )
}

export default FavoriteButton
