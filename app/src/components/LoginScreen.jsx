function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function LoginScreen({ mode = 'login', onBack, onGoogle, isLoading, error }) {
  const isSignUp = mode === 'signup'

  return (
    <div className="flex min-h-dvh flex-col bg-background text-on-background">
      <header className="border-b border-outline-variant bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white">
              <span className="material-symbols-outlined text-xl">kitchen</span>
            </div>
            <div>
              <p className="text-base font-bold leading-5 text-primary">
                Smart Pantry
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                Dispensa Inteligente
              </p>
            </div>
          </div>

          <button
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-primary transition hover:bg-surface-container-low"
            onClick={onBack}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">
              arrow_back
            </span>
            Voltar
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="surface-card p-6 sm:p-8">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary-container text-primary">
              <span className="material-symbols-outlined text-2xl">
                {isSignUp ? 'person_add' : 'login'}
              </span>
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              {isSignUp ? 'Crie sua conta' : 'Entre na sua conta'}
            </h1>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              {isSignUp
                ? 'Use sua conta Google para começar a organizar sua despensa e salvar suas receitas.'
                : 'Use sua conta Google para acessar sua despensa, suas receitas e seu histórico.'}
            </p>

            {error && (
              <p
                className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant bg-white px-4 py-3.5 text-sm font-bold text-on-surface shadow-sm transition hover:bg-surface-container-low disabled:cursor-wait disabled:opacity-70"
              disabled={isLoading}
              onClick={onGoogle}
              type="button"
            >
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin text-xl text-primary">
                  progress_activity
                </span>
              ) : (
                <GoogleIcon />
              )}
              {isLoading
                ? 'Conectando ao Google...'
                : isSignUp
                  ? 'Criar conta com Google'
                  : 'Entrar com Google'}
            </button>

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-surface-container-low p-3.5 text-xs leading-5 text-on-surface-variant">
              <span className="material-symbols-outlined text-lg text-primary">
                shield_lock
              </span>
              <p>
                Seus dados ficam vinculados apenas à sua conta. Não usamos senha
                própria: a autenticação é feita com segurança pelo Google.
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-on-surface-variant">
            Ao continuar, você concorda com o uso responsável dos dados para o
            funcionamento do Smart Pantry.
          </p>
        </div>
      </main>
    </div>
  )
}

export default LoginScreen
