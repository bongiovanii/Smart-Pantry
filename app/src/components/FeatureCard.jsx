function FeatureCard({ title, time, ingredients, image }) {
  return (
    <article className="surface-card group min-h-56 cursor-pointer overflow-hidden transition duration-300 hover:-translate-y-1">
      <div className="relative aspect-video overflow-hidden bg-surface-container-high">
        <img
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          src={image}
          alt={title}
        />
        <button
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-on-surface-variant shadow-sm backdrop-blur transition hover:text-primary"
          aria-label={`Favoritar ${title}`}
        >
          <span className="material-symbols-outlined text-xl">favorite</span>
        </button>
      </div>
      <div className="p-4">
        <h3 className="truncate text-base font-bold text-on-surface sm:text-lg">{title}</h3>
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base">schedule</span>
            {time}
          </span>
          <span aria-hidden="true">•</span>
          <span>{ingredients}</span>
        </div>
      </div>
    </article>
  )
}

export default FeatureCard
