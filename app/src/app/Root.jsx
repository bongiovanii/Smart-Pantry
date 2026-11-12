import { lazy, Suspense, useEffect, useState } from 'react'
import LandingPage from '../components/LandingPage.jsx'
import LoginScreen from '../components/LoginScreen.jsx'
import PantryLoadingState from '../components/PantryLoadingState.jsx'
import {
  getSession,
  onAuthStateChange,
  signInWithGoogle,
  signOut,
} from '../lib/auth.js'

// O aplicativo autenticado é carregado sob demanda para que a landing page
// continue leve para visitantes que ainda não entraram.
const App = lazy(() => import('./App.jsx'))

/**
 * Lê erros devolvidos pelo OAuth na URL. O Supabase pode usar a query string
 * ou o hash, dependendo do provedor e do fluxo.
 */
function readOAuthError() {
  const sources = [
    new URLSearchParams(window.location.search),
    new URLSearchParams(window.location.hash.replace(/^#/, '')),
  ]

  for (const params of sources) {
    const description = params.get('error_description')
    const code = params.get('error_code')
    const error = params.get('error')

    if (description) return description.replace(/\+/g, ' ')
    if (code) return `Não foi possível concluir o login (${code}).`
    if (error) return 'Não foi possível concluir o login com o Google.'
  }

  return ''
}

function LoadingScreen() {
  return (
    <PantryLoadingState
      message="Carregando o Smart Pantry..."
      size="fullscreen"
      submessage="Sincronizando despensa e receitas sustentáveis"
    />
  )
}

function Root() {
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState(() =>
    readOAuthError() ? 'login' : 'loading',
  )
  const [loginMode, setLoginMode] = useState('login')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState(readOAuthError)

  useEffect(() => {
    let isActive = true

    function cleanAuthUrl() {
      if (window.location.search || window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    // O OAuth pode devolver erros na query string ou no hash. O estado inicial
    // já reflete esse erro; aqui apenas limpamos a URL para não reaparecer.
    if (readOAuthError()) cleanAuthUrl()

    const { data } = onAuthStateChange((nextSession, event) => {
      if (!isActive) return

      if (nextSession) {
        setSession(nextSession)
        setScreen('app')
        setIsAuthenticating(false)
        setAuthError('')
        // O código PKCE já foi trocado pela sessão; pode sair da URL.
        cleanAuthUrl()
        return
      }

      if (event === 'SIGNED_OUT') {
        setSession(null)
        setScreen('landing')
        setIsAuthenticating(false)
      }
    })

    getSession()
      .then((currentSession) => {
        if (!isActive) return

        if (currentSession) {
          setSession(currentSession)
          setScreen('app')
          cleanAuthUrl()
        } else {
          setScreen((current) => (current === 'loading' ? 'landing' : current))
        }
      })
      .catch((error) => {
        if (!isActive) return

        setAuthError(
          error.message ||
            'Não foi possível verificar sua sessão. Tente novamente.',
        )
        setScreen('landing')
      })

    return () => {
      isActive = false
      data.subscription.unsubscribe()
    }
  }, [])

  function goToLogin(mode) {
    setLoginMode(mode)
    setAuthError('')
    setScreen('login')
  }

  async function handleGoogleLogin() {
    setAuthError('')
    setIsAuthenticating(true)

    try {
      // O navegador é redirecionado para o Google. Ao voltar, o Supabase
      // detecta a sessão na URL e onAuthStateChange abre o aplicativo.
      await signInWithGoogle({ redirectTo: window.location.origin })
    } catch (error) {
      setAuthError(
        error.message || 'Não foi possível iniciar o login com o Google.',
      )
      setIsAuthenticating(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (error) {
      setAuthError(error.message || 'Não foi possível encerrar a sessão.')
    } finally {
      setSession(null)
      setIsAuthenticating(false)
      setScreen('landing')
    }
  }

  if (screen === 'loading') return <LoadingScreen />

  if (screen === 'app' && session) {
    // A chave por usuário descarta todo o estado da conta anterior ao trocar de
    // sessão, evitando que a despensa de um usuário apareça para outro.
    return (
      <Suspense fallback={<LoadingScreen />}>
        <App
          key={session.user.id}
          user={session.user}
          onSignOut={handleSignOut}
        />
      </Suspense>
    )
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        error={authError}
        isLoading={isAuthenticating}
        mode={loginMode}
        onBack={() => {
          setAuthError('')
          setScreen('landing')
        }}
        onGoogle={handleGoogleLogin}
      />
    )
  }

  return (
    <LandingPage
      onLogin={() => goToLogin('login')}
      onSignUp={() => goToLogin('signup')}
    />
  )
}

export default Root
