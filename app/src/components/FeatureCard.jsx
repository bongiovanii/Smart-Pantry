function FeatureCard({ title, time, ingredients, image, imageSource, onClick }) {
  return (
    <article
      aria-label={`Ver detalhes da receita ${title}`}
      className="surface-card group min-h-56 cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-container-high">
        <img
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={image}
          alt={title}
        />
        {imageSource === 'wikimedia-commons' && (
          <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
            Foto: Wikimedia Commons
          </span>
        )}
        <button
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-on-surface-variant shadow-sm backdrop-blur transition hover:text-primary"
          aria-label={`Favoritar ${title}`}
          onClick={(event) => {
            event.stopPropagation()
            // Funcionalidade de favoritar prevista
          }}
          type="button"
        >
          <span className="material-symbols-outlined text-xl">favorite</span>
        </button>
      </div>
      <div className="p-4">
        <h3 className="truncate text-base font-bold text-on-surface sm:text-lg">{title}</h3>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs font-medium text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">schedule</span>
              {time}
            </span>
            <span aria-hidden="true">•</span>
            <span>{ingredients}</span>
          </div>
          <span className="text-[11px] font-bold text-primary opacity-0 transition group-hover:opacity-100 hidden sm:inline">
            Ver detalhes →
          </span>
        </div>
      </div>
    </article>
  )
}

export default FeatureCard
