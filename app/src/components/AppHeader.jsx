import { useEffect, useRef, useState } from 'react'
import { getUserEmail, getUserName } from '../lib/auth.js'
import UserAvatar from './UserAvatar.jsx'

function AppHeader({ user, onSignOut }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!isMenuOpen) return undefined

    function handlePointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  async function handleSignOut() {
    setIsSigningOut(true)

    try {
      await onSignOut()
    } finally {
      setIsSigningOut(false)
      setIsMenuOpen(false)
    }
  }

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

          <div className="relative" ref={menuRef}>
            <button
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menu da conta"
              className="flex items-center gap-2 rounded-full p-1 transition hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onClick={() => setIsMenuOpen((current) => !current)}
              type="button"
            >
              <UserAvatar className="h-9 w-9" textClassName="text-sm" user={user} />
              <span className="material-symbols-outlined hidden text-xl text-on-surface-variant sm:block">
                expand_more
              </span>
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-outline-variant bg-white shadow-xl"
                role="menu"
              >
                <div className="flex items-center gap-3 border-b border-outline-variant/60 p-4">
                  <UserAvatar
                    className="h-11 w-11"
                    textClassName="text-lg"
                    user={user}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {getUserName(user)}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {getUserEmail(user)}
                    </p>
                  </div>
                </div>

                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  role="menuitem"
                  type="button"
                >
                  <span className="material-symbols-outlined text-xl">
                    logout
                  </span>
                  {isSigningOut ? 'Saindo...' : 'Sair da conta'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AppHeader
