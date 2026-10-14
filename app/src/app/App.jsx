import { useEffect, useRef, useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import IngredientModal from '../components/IngredientModal.jsx'
import { createPantryItem, listPantryItems } from '../services/pantry.js'
import { listRecipesByIngredients } from '../services/recipe.js'


const week = [
  { day: 'SEG', meal: 'Macarrão com tomate e manjericão', type: 'Jantar' },
  { day: 'TER' },
  { day: 'QUA' },
  { day: 'QUI' },
  { day: 'SEX' },
  { day: 'SÁB', meal: 'Salada de jardim', type: 'Almoço' },
  { day: 'DOM' },
]

const unitLabels = {
  un: 'un',
  g: 'g',
  kg: 'kg',
  ml: 'ml',
  l: 'l',
  pacote: 'pacote',
  caixa: 'caixa',
  lata: 'lata',
}

function Sidebar({ onNewIngredient }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant bg-white p-6 lg:flex">
      <div className="mb-10 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary-container text-primary">
          <span className="material-symbols-outlined">person</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-primary">Gerente de cozinha</p>
          <p className="truncate text-xs text-on-surface-variant">Minha casa</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2" aria-label="Navegação principal">
        <a className="side-link side-link-active" href="#despensa">
          <span className="material-symbols-outlined">kitchen</span>
          Minha despensa
        </a>
        <a className="side-link" href="#receitas">
          <span className="material-symbols-outlined">restaurant_menu</span>
          Receitas
        </a>
        <a className="side-link" href="#planejamento">
          <span className="material-symbols-outlined">calendar_month</span>
          Planejamento
        </a>
        <a className="side-link" href="#configuracoes">
          <span className="material-symbols-outlined">settings</span>
          Configurações
        </a>
      </nav>

      <button
        className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
        onClick={onNewIngredient}
        type="button"
      >
        <span className="material-symbols-outlined text-xl">add</span>
        Novo ingrediente
      </button>
    </aside>
  )
}

function MobileNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-outline-variant bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(25,28,27,0.08)] lg:hidden">
      <a className="mobile-nav-item mobile-nav-active" href="#despensa">
        <span className="material-symbols-outlined">kitchen</span>
        <span>Despensa</span>
      </a>
      <a className="mobile-nav-item" href="#receitas">
        <span className="material-symbols-outlined">restaurant_menu</span>
        <span>Receitas</span>
      </a>
      <a className="mobile-nav-item" href="#planejamento">
        <span className="material-symbols-outlined">calendar_month</span>
        <span>Planejar</span>
      </a>
      <a className="mobile-nav-item" href="#configuracoes">
        <span className="material-symbols-outlined">settings</span>
        <span>Ajustes</span>
      </a>
    </nav>
  )
}

function formatQuantity(quantity, unit) {
  const value = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
    Number(quantity),
  )
  return `${value} ${unitLabels[unit] || unit}`
}

function formatExpiration(date) {
  if (!date) return 'Sem validade informada'

  return `Validade: ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )}`
}

function App() {
  const [ingredients, setIngredients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [isRecipesLoading, setIsRecipesLoading] = useState(false)
  const [recipeError, setRecipeError] = useState('')
  const lastRecipeRequest = useRef('')

  async function loadIngredients() {
    setIsLoading(true)
    setLoadError('')

    try {
      setIngredients(await listPantryItems())
    } catch (error) {
      setLoadError(error.message || 'Não foi possível carregar a despensa.')
    } finally {
      setIsLoading(false)
    }
  }

  // Carrega a despensa uma única vez quando a aplicação é aberta.
  useEffect(() => {
    let isActive = true

    listPantryItems()
      .then((items) => {
        if (isActive) setIngredients(items)
      })
      .catch((error) => {
        if (isActive) {
          setLoadError(error.message || 'Não foi possível carregar a despensa.')
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    // Impede atualizações de estado caso o componente seja desmontado.
    return () => {
      isActive = false
    }
  }, [])

  // Busca novas sugestões sempre que os ingredientes da despensa mudam.
  useEffect(() => {
    // Criamos uma identificação estável baseada nos ingredientes atuais.
    const ingredientKey = ingredients
      .map((ingredient) =>
        ingredient.name.trim().toLocaleLowerCase('pt-BR'),
      )
      .filter(Boolean)
      .sort()
      .join('|')

    // Sem ingredientes, não precisamos consultar receitas.
    if (!ingredientKey) return

    // Evita repetir a mesma chamada, economizando a cota da Spoonacular.
    if (lastRecipeRequest.current === ingredientKey) return

    // Registra que esta combinação já está sendo consultada.
    lastRecipeRequest.current = ingredientKey
    setIsRecipesLoading(true)
    setRecipeError('')

    // Passamos os objetos da despensa diretamente para o serviço.
    listRecipesByIngredients(ingredients, { limit: 6 })
      .then((results) => {
        // Só atualizamos a tela se esta ainda for a consulta mais recente.
        if (lastRecipeRequest.current === ingredientKey) {
          setRecipes(results)
          setRecipeError('')
        }
      })
      .catch((error) => {
        if (lastRecipeRequest.current === ingredientKey) {
          setRecipeError(
            error.message || 'Não foi possível carregar as receitas.',
          )
          setRecipes([])
          setIsRecipesLoading(false)

          // Libera a combinação para uma futura tentativa.
          lastRecipeRequest.current = ''
        }
      })
      .finally(() => {
        if (lastRecipeRequest.current === ingredientKey) {
          setIsRecipesLoading(false)
        }
      })
  }, [ingredients])

  async function addIngredient(form) {
    setIsSaving(true)

    try {
      const newItem = await createPantryItem(form)
      setIngredients((current) => [newItem, ...current])
      setIsModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background text-on-background">
      <Sidebar onNewIngredient={() => setIsModalOpen(true)} />

      <div className="min-h-dvh lg:ml-64">
        <AppHeader />

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 lg:px-12 lg:pb-12 lg:pt-8">
          <section id="despensa" className="grid gap-4 lg:grid-cols-3 lg:gap-6">
            <article className="surface-card flex flex-col justify-center p-5 sm:p-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                Minha despensa
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                Cadastre seus ingredientes
              </h1>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Registre manualmente os alimentos da sua casa e mantenha o estoque atualizado.
              </p>

              <button
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                Novo ingrediente
              </button>
            </article>

            <article className="surface-card p-5 sm:p-6 lg:col-span-2">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                    Inventário
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-primary">Em estoque agora</h2>
                </div>
                {!isLoading && !loadError && (
                  <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-primary">
                    {ingredients.length} {ingredients.length === 1 ? 'item' : 'itens'}
                  </span>
                )}
              </div>

              <div aria-live="polite">
                {isLoading && (
                  <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
                    Carregando sua despensa...
                  </div>
                )}

                {!isLoading && loadError && (
                  <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800" role="alert">
                    <p className="font-bold">Não foi possível acessar a despensa.</p>
                    <p className="mt-1">{loadError}</p>
                    <button className="mt-3 font-bold underline" onClick={loadIngredients} type="button">
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!isLoading && !loadError && ingredients.length === 0 && (
                  <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-center">
                    <div>
                      <span className="material-symbols-outlined text-4xl text-primary">inventory_2</span>
                      <p className="mt-2 font-bold text-primary">Sua despensa está vazia</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Cadastre o primeiro ingrediente para começar.
                      </p>
                    </div>
                  </div>
                )}

                {!isLoading && !loadError && ingredients.length > 0 && (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {ingredients.map((ingredient) => (
                      <li className="rounded-xl border border-outline-variant bg-white p-4" key={ingredient.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-bold text-on-surface">{ingredient.name}</p>
                            <p className="mt-1 text-xs capitalize text-on-surface-variant">
                              {ingredient.category}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-bold text-primary">
                            {formatQuantity(ingredient.quantity, ingredient.unit)}
                          </span>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-base">event</span>
                          {formatExpiration(ingredient.expiration_date)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          </section>

          <section id="receitas" className="mt-9 lg:mt-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                  Aproveite o que você tem
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  Receitas sugeridas
                </h2>
              </div>
              <span className="hidden rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant sm:inline-block">
                Com base na despensa
              </span>
            </div>

            {recipeError && (
              <p
                className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800"
                role="alert"
              >
                {recipeError}
              </p>
            )}

            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <FeatureCard key={recipe.id} {...recipe} />
              ))}

              {isRecipesLoading && (
                <article className="surface-card min-h-56 overflow-hidden">
                  <div className="grid aspect-video place-items-center bg-surface-container-low">
                    <span className="material-symbols-outlined animate-spin text-5xl text-outline">
                      progress_activity
                    </span>
                  </div>
                  <div className="space-y-3 p-4" aria-hidden="true">
                    <div className="h-4 w-3/4 rounded bg-surface-container" />
                    <div className="h-3 w-1/2 rounded bg-surface-container" />
                  </div>
                </article>
              )}

              {!isRecipesLoading &&
                !recipeError &&
                ingredients.length > 0 &&
                recipes.length === 0 && (
                  <article className="surface-card grid min-h-56 place-items-center p-5 text-center">
                    <div>
                      <span className="material-symbols-outlined text-4xl text-primary">
                        search_off
                      </span>
                      <p className="mt-2 font-bold text-primary">
                        Nenhuma receita encontrada
                      </p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        Tente cadastrar outros ingredientes na despensa.
                      </p>
                    </div>
                  </article>
                )}

              <button className="surface-card flex min-h-56 flex-col items-center justify-center border-dashed p-5 text-primary transition hover:bg-surface-container-low">
                <span className="material-symbols-outlined mb-2 text-3xl">explore</span>
                <span className="text-sm font-bold">Descobrir mais receitas</span>
              </button>
            </div>
          </section>

          <section id="planejamento" className="mt-9 lg:mt-12">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                Sua semana
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                Planejamento semanal
              </h2>
            </div>

            <div className="week-grid">
              {week.map(({ day, meal, type }) => (
                <article className="day-column" key={day}>
                  <p className="border-b border-primary/10 pb-2 text-center text-xs font-bold tracking-widest text-on-surface-variant">
                    {day}
                  </p>
                  {meal ? (
                    <button className="flex min-h-24 flex-1 flex-col justify-between rounded-xl border border-secondary-container bg-secondary-container/50 p-3 text-left transition hover:border-primary/40">
                      <span className="text-sm font-semibold leading-5">{meal}</span>
                      <span className="mt-3 text-xs font-bold text-primary">{type}</span>
                    </button>
                  ) : (
                    <button
                      className="grid min-h-24 flex-1 place-items-center rounded-xl border border-dashed border-outline-variant bg-surface text-outline transition hover:bg-surface-container-low hover:text-primary"
                      aria-label={`Adicionar refeição para ${day}`}
                    >
                      <span className="material-symbols-outlined">add</span>
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      <MobileNavigation />
      <IngredientModal
        isOpen={isModalOpen}
        isSaving={isSaving}
        onClose={() => setIsModalOpen(false)}
        onSubmit={addIngredient}
      />
    </div>
  )
}

export default App
