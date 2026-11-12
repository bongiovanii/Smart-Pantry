import { useEffect, useId, useState } from 'react'
import PantryLoadingState from './PantryLoadingState.jsx'
import {
  DEFAULT_RECIPE_IMAGE,
  handleRecipeImageError,
} from '../lib/recipeRecord.js'
import {
  getRecipeGenerationStatus,
  listRecipeLibrary,
} from '../services/recipeLibrary.js'
import { listRecipesByIngredients } from '../services/recipe.js'

function LibraryCard({ recipe, onOpen, onPlan }) {
  return (
    <article className="surface-card group flex flex-col overflow-hidden">
      <button
        aria-label={`Ver detalhes de ${recipe.title}`}
        className="relative aspect-video overflow-hidden bg-surface-container-high text-left"
        onClick={() => onOpen(recipe)}
        type="button"
      >
        <img
          alt={recipe.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={handleRecipeImageError}
          src={recipe.image || DEFAULT_RECIPE_IMAGE}
        />
        {recipe.origin === 'ai' && (
          <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
            Gerada agora
          </span>
        )}
        {recipe.caloriesPerServing > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-primary shadow-sm backdrop-blur">
            <span className="material-symbols-outlined text-sm">
              local_fire_department
            </span>
            {recipe.caloriesPerServing} kcal
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-bold text-on-surface">
          {recipe.title}
        </h3>
        <p className="mt-1 text-xs capitalize text-on-surface-variant">
          {recipe.category}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base">
              schedule
            </span>
            {recipe.time}
          </span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-base">
              kitchen
            </span>
            {recipe.usedIngredientCount} da despensa
          </span>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          <button
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-container"
            onClick={() => onOpen(recipe)}
            type="button"
          >
            Ver detalhes
          </button>
          <button
            aria-label={`Adicionar ${recipe.title} ao planejamento`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary"
            onClick={() => onPlan(recipe)}
            title="Adicionar ao planejamento"
            type="button"
          >
            <span className="material-symbols-outlined text-lg">
              calendar_month
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}

function DiscoverRecipesModal({
  isOpen,
  pantryItems = [],
  onClose,
  onOpenRecipe,
  onPlan,
  onRecipesGenerated,
}) {
  const titleId = useId()
  const [library, setLibrary] = useState({
    recipes: [],
    total: 0,
    page: 1,
    totalPages: 1,
  })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [generationStatus, setGenerationStatus] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isGenerating) onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, isGenerating, onClose])

  useEffect(() => {
    if (!isOpen) return undefined

    let isActive = true
    const timer = setTimeout(async () => {
      setIsLoading(true)
      setLoadError('')

      try {
        const data = await listRecipeLibrary({ search, page })
        if (isActive) setLibrary(data)
      } catch (error) {
        if (isActive) {
          setLoadError(
            error.message || 'Não foi possível carregar sua biblioteca.',
          )
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }, search ? 300 : 0)

    return () => {
      isActive = false
      clearTimeout(timer)
    }
  }, [isOpen, search, page, refreshKey])

  useEffect(() => {
    if (!isOpen) return

    getRecipeGenerationStatus()
      .then(setGenerationStatus)
      .catch(() => setGenerationStatus(null))
  }, [isOpen, refreshKey])

  async function handleGenerateMore() {
    if (isGenerating) return

    if (pantryItems.length === 0) {
      setGenerateError(
        'Cadastre pelo menos um ingrediente na despensa para gerar receitas.',
      )
      return
    }

    setIsGenerating(true)
    setGenerateError('')
    setNotice('')

    try {
      const result = await listRecipesByIngredients(pantryItems, {
        limit: 6,
        forceAi: true,
      })

      onRecipesGenerated?.(result.recipes, result)

      if (result.recipes.length === 0) {
        setNotice('Nenhuma receita nova foi encontrada para a sua despensa.')
      } else if (result.limitReached) {
        setNotice(
          'Você atingiu o limite diário. Mostrando as receitas já disponíveis na biblioteca.',
        )
      } else if (result.source === 'cache') {
        setNotice(
          `A biblioteca já tinha ${result.cacheHits} receita${result.cacheHits === 1 ? '' : 's'} compatível${result.cacheHits === 1 ? '' : 's'} com a sua despensa.`,
        )
      } else {
        setNotice(
          `${result.generated} receita${result.generated === 1 ? '' : 's'} nova${result.generated === 1 ? '' : 's'} adicionada${result.generated === 1 ? '' : 's'} à sua biblioteca.`,
        )
      }

      setPage(1)
      setRefreshKey((current) => current + 1)
    } catch (error) {
      setGenerateError(
        error.message || 'Não foi possível gerar novas receitas.',
      )
    } finally {
      setIsGenerating(false)
    }
  }

  if (!isOpen) return null

  const canGenerate =
    pantryItems.length > 0 &&
    !isGenerating &&
    (generationStatus?.remaining ?? 1) > 0

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isGenerating) onClose()
      }}
      role="dialog"
    >
      <section
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-5xl sm:rounded-[1.75rem]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Biblioteca de receitas
            </p>
            <h2 className="mt-1 text-lg font-bold text-primary" id={titleId}>
              Descobrir mais receitas
            </h2>
            <p className="mt-1 text-xs text-on-surface-variant">
              Todas as receitas geradas pela IA ficam salvas aqui e podem ser
              reaproveitadas sem gastar novos tokens.
            </p>
          </div>
          <button
            aria-label="Fechar biblioteca de receitas"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-container text-on-surface-variant transition hover:bg-surface-container-high hover:text-primary"
            disabled={isGenerating}
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="border-b border-outline-variant px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <span className="material-symbols-outlined text-xl text-on-surface-variant">
                search
              </span>
              <span className="sr-only">Buscar na biblioteca de receitas</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-outline"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Buscar por nome ou categoria..."
                type="search"
                value={search}
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canGenerate}
                onClick={handleGenerateMore}
                type="button"
              >
                {isGenerating ? (
                  <img
                    src="/logo-icon-smart-pantry.png"
                    alt=""
                    className="h-5 w-5 animate-pulse object-contain"
                  />
                ) : (
                  <span className="material-symbols-outlined text-xl">
                    auto_awesome
                  </span>
                )}
                {isGenerating ? 'Gerando...' : 'Gerar mais receitas'}
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
            <span>
              {generationStatus
                ? `${generationStatus.remaining} de ${generationStatus.limit} gerações disponíveis hoje`
                : 'Consultando limite diário...'}
            </span>
            {library.total > 0 && (
              <span>
                {library.total}{' '}
                {library.total === 1 ? 'receita salva' : 'receitas salvas'}
              </span>
            )}
          </div>

          {notice && (
            <p className="mt-3 rounded-lg bg-secondary-container/70 px-3 py-2 text-xs font-semibold text-primary">
              {notice}
            </p>
          )}

          {generateError && (
            <p
              className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800"
              role="alert"
            >
              {generateError}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {isGenerating && (
            <div className="mb-4 rounded-2xl border border-secondary-container bg-secondary-container/40 p-4">
              <PantryLoadingState
                message="Gerando novas receitas com inteligência artificial..."
                size="sm"
                submessage="Combinando os ingredientes da sua despensa com técnicas culinárias sustentáveis"
              />
            </div>
          )}

          {isLoading && (
            <div className="py-16">
              <PantryLoadingState
                message="Carregando sua biblioteca de receitas..."
                submessage="Acessando receitas salvas e compatíveis"
              />
            </div>
          )}

          {!isLoading && loadError && (
            <div
              className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              <p className="font-bold">
                Não foi possível carregar sua biblioteca.
              </p>
              <p className="mt-1">{loadError}</p>
              <button
                className="mt-3 font-bold underline"
                onClick={() => setRefreshKey((current) => current + 1)}
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoading && !loadError && library.recipes.length === 0 && (
            <div className="surface-card grid min-h-56 place-items-center p-6 text-center">
              <div>
                <span className="material-symbols-outlined text-5xl text-primary">
                  auto_awesome
                </span>
                <p className="mt-3 text-lg font-bold text-primary">
                  Sua biblioteca ainda está vazia
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Gere receitas com base na sua despensa. Elas ficarão salvas
                  aqui para as próximas consultas.
                </p>
                <button
                  className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container disabled:opacity-60"
                  disabled={!canGenerate}
                  onClick={handleGenerateMore}
                  type="button"
                >
                  Gerar minhas primeiras receitas
                </button>
              </div>
            </div>
          )}

          {!isLoading && !loadError && library.recipes.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {library.recipes.map((recipe) => (
                  <LibraryCard
                    key={recipe.id}
                    onOpen={onOpenRecipe}
                    onPlan={onPlan}
                    recipe={recipe}
                  />
                ))}
              </div>

              {library.totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-primary transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={library.page <= 1}
                    onClick={() => setPage((current) => current - 1)}
                    type="button"
                  >
                    Anterior
                  </button>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    Página {library.page} de {library.totalPages}
                  </span>
                  <button
                    className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-bold text-primary transition hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={library.page >= library.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default DiscoverRecipesModal
