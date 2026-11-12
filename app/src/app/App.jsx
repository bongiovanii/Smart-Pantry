import { useEffect, useRef, useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import CookRecipeModal from '../components/CookRecipeModal.jsx'
import FeatureCard from '../components/FeatureCard.jsx'
import IngredientModal from '../components/IngredientModal.jsx'
import PlanMealModal from '../components/PlanMealModal.jsx'
import RecipeDetailModal from '../components/RecipeDetailModal.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import WeekPlanner from '../components/WeekPlanner.jsx'
import MyRecipesPage from './MyRecipesPage.jsx'
import { getUserEmail, getUserName } from '../lib/auth.js'
import { formatQuantity } from '../lib/format.js'
import { getDayLabel } from '../lib/mealPlan.js'
import {
  assignMealToDay,
  listWeeklyPlan,
  removeMealPlan,
} from '../services/mealPlan.js'
import { consumeRecipeIngredients } from '../services/movements.js'
import {
  archivePantryItem,
  createPantryItem,
  listPantryItems,
  updatePantryItem,
} from '../services/pantry.js'
import { listRecipesByIngredients } from '../services/recipe.js'


const sidebarItems = [
  {
    id: 'despensa',
    label: 'Minha despensa',
    icon: 'kitchen',
    view: 'despensa',
    section: 'despensa',
  },
  {
    id: 'receitas',
    label: 'Minhas receitas',
    icon: 'menu_book',
    view: 'minhas-receitas',
  },
  {
    id: 'planejamento',
    label: 'Planejamento',
    icon: 'calendar_month',
    view: 'despensa',
    section: 'planejamento',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    icon: 'settings',
    view: 'despensa',
    section: 'configuracoes',
  },
]

const mobileItems = [
  {
    id: 'despensa',
    label: 'Despensa',
    icon: 'kitchen',
    view: 'despensa',
    section: 'despensa',
  },
  {
    id: 'receitas',
    label: 'Receitas',
    icon: 'menu_book',
    view: 'minhas-receitas',
  },
  {
    id: 'planejamento',
    label: 'Planejar',
    icon: 'calendar_month',
    view: 'despensa',
    section: 'planejamento',
  },
  {
    id: 'configuracoes',
    label: 'Ajustes',
    icon: 'settings',
    view: 'despensa',
    section: 'configuracoes',
  },
]

function isNavItemActive(item, activeView) {
  if (item.view === 'minhas-receitas') return activeView === 'minhas-receitas'
  return item.id === 'despensa' && activeView === 'despensa'
}

function Sidebar({ activeView, onNavigate, onNewIngredient, user }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-outline-variant bg-white p-6 lg:flex">
      <div className="mb-10 flex items-center gap-3">
        <UserAvatar
          className="h-11 w-11"
          textClassName="text-lg"
          user={user}
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-primary">
            {getUserName(user)}
          </p>
          <p className="truncate text-xs text-on-surface-variant">
            {getUserEmail(user)}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2" aria-label="Navegação principal">
        {sidebarItems.map((item) => (
          <button
            className={`side-link w-full text-left ${
              isNavItemActive(item, activeView) ? 'side-link-active' : ''
            }`}
            key={item.id}
            onClick={() => onNavigate(item.view, item.section)}
            type="button"
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </button>
        ))}
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

function MobileNavigation({ activeView, onNavigate }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-outline-variant bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_18px_rgba(25,28,27,0.08)] lg:hidden">
      {mobileItems.map((item) => (
        <button
          className={`mobile-nav-item ${
            isNavItemActive(item, activeView) ? 'mobile-nav-active' : ''
          }`}
          key={item.id}
          onClick={() => onNavigate(item.view, item.section)}
          type="button"
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

function formatExpiration(date) {
  if (!date) return 'Sem validade informada'

  return `Validade: ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )}`
}

function App({ user, onSignOut }) {
  const [ingredients, setIngredients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeView, setActiveView] = useState('despensa')
  const [cookedRecipesVersion, setCookedRecipesVersion] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deletingItem, setDeletingItem] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [recipes, setRecipes] = useState([])
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [isRecipesLoading, setIsRecipesLoading] = useState(false)
  const [recipeError, setRecipeError] = useState('')
  const lastRecipeRequest = useRef('')
  const [cookRecipe, setCookRecipe] = useState(null)
  const [isConsuming, setIsConsuming] = useState(false)
  const [consumeError, setConsumeError] = useState('')
  const [notice, setNotice] = useState('')
  const [weeklyPlan, setWeeklyPlan] = useState([])
  const [isPlanLoading, setIsPlanLoading] = useState(true)
  const [planLoadError, setPlanLoadError] = useState('')
  const [planTarget, setPlanTarget] = useState(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [planSubmitError, setPlanSubmitError] = useState('')

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

  async function loadWeeklyPlan() {
    setIsPlanLoading(true)
    setPlanLoadError('')

    try {
      setWeeklyPlan(await listWeeklyPlan())
    } catch (error) {
      setPlanLoadError(
        error.message || 'Não foi possível carregar o planejamento semanal.',
      )
    } finally {
      setIsPlanLoading(false)
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

  // Carrega o planejamento semanal salvo do usuário.
  useEffect(() => {
    let isActive = true

    listWeeklyPlan()
      .then((entries) => {
        if (isActive) {
          setWeeklyPlan(entries)
          setPlanLoadError('')
        }
      })
      .catch((error) => {
        if (isActive) {
          setPlanLoadError(
            error.message ||
              'Não foi possível carregar o planejamento semanal.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsPlanLoading(false)
      })

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

    // Evita repetir a mesma chamada, economizando a cota do Gemini.
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

  // Remove o aviso de sucesso automaticamente, sem exigir ação do usuário.
  useEffect(() => {
    if (!notice) return undefined

    const timer = setTimeout(() => setNotice(''), 7000)
    return () => clearTimeout(timer)
  }, [notice])

  function openNewModal() {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  function openEditModal(item) {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  async function handleSaveIngredient(form) {
    setIsSaving(true)

    try {
      if (editingItem) {
        const updated = await updatePantryItem(editingItem.id, form)
        setIngredients((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        )
      } else {
        const newItem = await createPantryItem(form)
        setIngredients((current) => [newItem, ...current])
      }
      setIsModalOpen(false)
      setEditingItem(null)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deletingItem) return
    setIsDeleting(true)

    try {
      await archivePantryItem(deletingItem.id)
      setIngredients((current) =>
        current.filter((item) => item.id !== deletingItem.id),
      )
      setDeletingItem(null)
    } catch (error) {
      alert(error.message || 'Não foi possível remover o ingrediente.')
    } finally {
      setIsDeleting(false)
    }
  }

  function handleNavigate(view, sectionId) {
    setActiveView(view)

    // Aguarda a troca de tela antes de posicionar a rolagem.
    window.setTimeout(() => {
      if (sectionId && view === 'despensa') {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }, 0)
  }

  function handlePlanRecipe(recipe) {
    setSelectedRecipe(null)
    setPlanSubmitError('')
    setPlanTarget({ recipe })
  }

  function handleAddMeal(dayOfWeek) {
    setPlanSubmitError('')
    setPlanTarget({ dayOfWeek })
  }

  async function handleConfirmPlan({ dayOfWeek, mealType, recipe }) {
    setIsPlanning(true)
    setPlanSubmitError('')

    try {
      const saved = await assignMealToDay({ dayOfWeek, mealType, recipe })

      // Substitui apenas o slot salvo, preservando as demais refeições.
      setWeeklyPlan((current) => [
        ...current.filter(
          (entry) =>
            !(
              entry.dayOfWeek === saved.dayOfWeek &&
              entry.mealType === saved.mealType
            ),
        ),
        saved,
      ])
      setPlanTarget(null)
      setNotice(
        `"${saved.recipe.title}" adicionada ao planejamento de ${getDayLabel(
          saved.dayOfWeek,
        )} (${saved.mealType}).`,
      )
    } catch (error) {
      setPlanSubmitError(
        error.message ||
          'Não foi possível salvar a refeição no planejamento.',
      )
    } finally {
      setIsPlanning(false)
    }
  }

  async function handleRemoveMeal(entry) {
    try {
      await removeMealPlan(entry.planId)
      setWeeklyPlan((current) =>
        current.filter((item) => item.planId !== entry.planId),
      )
      setNotice(`"${entry.recipe.title}" removida do planejamento.`)
    } catch (error) {
      alert(
        error.message || 'Não foi possível remover a refeição do planejamento.',
      )
    }
  }

  function handleCookRecipe(recipe) {
    setSelectedRecipe(null)
    setConsumeError('')
    setCookRecipe(recipe)
  }

  async function handleConfirmCook(items) {
    if (!cookRecipe || items.length === 0) return

    setIsConsuming(true)
    setConsumeError('')

    try {
      const updatedItems = await consumeRecipeIngredients({
        recipe: cookRecipe,
        recipeId: cookRecipe.id,
        recipeTitle: cookRecipe.title,
        items,
      })

      // A RPC devolve as linhas já atualizadas. Aplicamos no estado local para
      // refletir o novo saldo sem precisar recarregar toda a despensa.
      const updatedById = new Map(
        updatedItems.map((item) => [item.id, item]),
      )

      setIngredients((current) =>
        current
          .map((item) => updatedById.get(item.id) ?? item)
          .filter(
            (item) => Number(item.quantity) > 0 && !item.archived_at,
          ),
      )

      const recipeTitle = cookRecipe.title
      setCookRecipe(null)
      setCookedRecipesVersion((current) => current + 1)
      setNotice(
        `Receita "${recipeTitle}" registrada em Minhas receitas. Sua despensa foi atualizada.`,
      )
    } catch (error) {
      setConsumeError(
        error.message || 'Não foi possível registrar o consumo da receita.',
      )
    } finally {
      setIsConsuming(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background text-on-background">
      <Sidebar
        activeView={activeView}
        onNavigate={handleNavigate}
        onNewIngredient={openNewModal}
        user={user}
      />

      <div className="min-h-dvh lg:ml-64">
        <AppHeader onSignOut={onSignOut} user={user} />

        <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 lg:px-12 lg:pb-12 lg:pt-8">
          {activeView === 'minhas-receitas' ? (
            <MyRecipesPage
              onGoToPantry={() => handleNavigate('despensa', 'despensa')}
              onOpenRecipe={setSelectedRecipe}
              refreshToken={cookedRecipesVersion}
            />
          ) : (
            <>
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
                onClick={openNewModal}
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
                  <ul
                    aria-label="Itens da despensa"
                    className="inventory-list grid gap-3 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
                    tabIndex={0}
                  >
                    {ingredients.map((ingredient) => (
                      <li
                        className="flex flex-col justify-between rounded-xl border border-outline-variant bg-white p-4 transition hover:border-primary/30"
                        key={ingredient.id}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-on-surface">
                                {ingredient.name}
                              </p>
                              <p className="mt-1 text-xs capitalize text-on-surface-variant">
                                {ingredient.category}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-bold text-primary">
                              {formatQuantity(ingredient.quantity, ingredient.unit)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-outline-variant/30 pt-2.5">
                          <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-base">event</span>
                            {formatExpiration(ingredient.expiration_date)}
                          </p>

                          <div className="flex items-center gap-1">
                            <button
                              aria-label={`Editar ${ingredient.name}`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
                              onClick={() => openEditModal(ingredient)}
                              title="Editar ingrediente"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-lg">edit</span>
                            </button>
                            <button
                              aria-label={`Remover ${ingredient.name}`}
                              className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition hover:bg-red-50 hover:text-red-700"
                              onClick={() => setDeletingItem(ingredient)}
                              title="Remover ingrediente"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </div>
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
                <FeatureCard
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  onPlan={() => handlePlanRecipe(recipe)}
                  {...recipe}
                />
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

          <WeekPlanner
            error={planLoadError}
            isLoading={isPlanLoading}
            onAddMeal={handleAddMeal}
            onOpenRecipe={setSelectedRecipe}
            onRemoveMeal={handleRemoveMeal}
            onRetry={loadWeeklyPlan}
            plan={weeklyPlan}
          />
            </>
          )}
        </main>
      </div>

      <MobileNavigation
        activeView={activeView}
        onNavigate={handleNavigate}
      />
      <IngredientModal
        key={isModalOpen ? (editingItem ? `edit-${editingItem.id}` : 'new') : 'closed'}
        editingItem={editingItem}
        isOpen={isModalOpen}
        isSaving={isSaving}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSaveIngredient}
      />

      {deletingItem && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/45 p-4 backdrop-blur-[2px]"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-700">
              <span className="material-symbols-outlined text-3xl">delete</span>
              <h3 className="text-lg font-bold text-on-surface">Remover ingrediente</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              Deseja remover <strong>{deletingItem.name}</strong> da sua despensa? O item será arquivado do seu estoque atual.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-outline-variant px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-surface-container-low"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800 disabled:opacity-60"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                type="button"
              >
                {isDeleting ? 'Removendo...' : 'Confirmar remoção'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRecipe && (
        <RecipeDetailModal
          key={selectedRecipe.id}
          isOpen={true}
          onClose={() => setSelectedRecipe(null)}
          onCook={handleCookRecipe}
          onPlan={handlePlanRecipe}
          recipe={selectedRecipe}
        />
      )}

      {cookRecipe && (
        <CookRecipeModal
          key={cookRecipe.id}
          error={consumeError}
          isSubmitting={isConsuming}
          onClose={() => {
            if (isConsuming) return
            setCookRecipe(null)
            setConsumeError('')
          }}
          onConfirm={handleConfirmCook}
          pantryItems={ingredients}
          recipe={cookRecipe}
        />
      )}

      {planTarget && (
        <PlanMealModal
          dayOfWeek={planTarget.dayOfWeek}
          error={planSubmitError}
          isOpen={true}
          isSubmitting={isPlanning}
          onClose={() => {
            if (isPlanning) return
            setPlanTarget(null)
            setPlanSubmitError('')
          }}
          onConfirm={handleConfirmPlan}
          recipe={planTarget.recipe ?? null}
          recipes={recipes}
        />
      )}

      {notice && (
        <div
          className="fixed bottom-24 left-4 right-4 z-[60] flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 shadow-lg sm:left-auto sm:right-6 sm:max-w-sm lg:bottom-6"
          role="status"
        >
          <span className="material-symbols-outlined text-xl text-emerald-700">
            check_circle
          </span>
          <p className="flex-1 leading-5">{notice}</p>
          <button
            aria-label="Fechar aviso"
            className="shrink-0 text-emerald-800 transition hover:text-emerald-950"
            onClick={() => setNotice('')}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default App
