function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white lg:hidden">
            <span className="material-symbols-outlined text-xl">kitchen</span>
          </div>
          <div>
            <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant sm:block">
              Smart Pantry
            </p>
            <p className="text-lg font-bold tracking-tight text-primary sm:text-xl">
              Dispensa Inteligente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button className="icon-button" aria-label="Notificações">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="icon-button hidden sm:grid" aria-label="Perfil">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
