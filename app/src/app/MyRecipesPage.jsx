import { useEffect, useMemo, useState } from 'react'
import { listCookedRecipes } from '../services/userRecipes.js'

function formatDateTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function MyRecipesPage({ refreshToken, onGoToPantry, onOpenRecipe }) {
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  async function loadRecipes() {
    setIsLoading(true)
    setLoadError('')

    try {
      setRecipes(await listCookedRecipes())
    } catch (error) {
      setLoadError(
        error.message || 'Não foi possível carregar suas receitas.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    listCookedRecipes()
      .then((data) => {
        if (isActive) {
          setRecipes(data)
          setLoadError('')
        }
      })
      .catch((error) => {
        if (isActive) {
          setLoadError(
            error.message || 'Não foi possível carregar suas receitas.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [refreshToken])

  // Agrupa as execuções por receita para formar o inventário. Cada linha do
  // banco continua sendo um preparo individual e aparece no histórico abaixo.
  const inventory = useMemo(() => {
    const grouped = new Map()

    for (const recipe of recipes) {
      const key = recipe.id || recipe.title
      const existing = grouped.get(key)

      if (existing) {
        existing.timesCooked += 1
      } else {
        grouped.set(key, {
          ...recipe,
          timesCooked: 1,
          lastCookedAt: recipe.cookedAt,
        })
      }
    }

    return [...grouped.values()]
  }, [recipes])

  const filteredInventory = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    if (!term) return inventory

    return inventory.filter((recipe) => {
      const title = recipe.title.toLocaleLowerCase('pt-BR')
      const category = (recipe.category || '').toLocaleLowerCase('pt-BR')
      return title.includes(term) || category.includes(term)
    })
  }, [inventory, search])

  const lastCookedAt = recipes[0]?.cookedAt

  return (
    <div>
      <section className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <article className="surface-card flex flex-col justify-center p-5 sm:p-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
            Seu histórico culinário
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Minhas receitas
          </h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Todas as receitas que você preparou ficam registradas aqui, com
            ingredientes, modo de preparo e data de cada execução.
          </p>

          <button
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-container"
            onClick={onGoToPantry}
            type="button"
          >
            <span className="material-symbols-outlined text-xl">kitchen</span>
            Ir para a despensa
          </button>
        </article>

        <article className="surface-card p-5 sm:p-6 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary-container/60 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary/70">
                Preparos
              </p>
              <p className="mt-2 text-3xl font-bold text-primary">
                {isLoading ? '—' : recipes.length}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                registros de execução
              </p>
            </div>

            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary/70">
                Receitas
              </p>
              <p className="mt-2 text-3xl font-bold text-primary">
                {isLoading ? '—' : inventory.length}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                pratos diferentes
              </p>
            </div>

            <div className="rounded-xl bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary/70">
                Última vez
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-primary">
                {isLoading
                  ? '—'
                  : lastCookedAt
                    ? formatDateTime(lastCookedAt)
                    : 'Nenhum preparo'}
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                receita mais recente
              </p>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="sr-only">Buscar nas minhas receitas</span>
            <span className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
              <span className="material-symbols-outlined text-xl text-on-surface-variant">
                search
              </span>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-outline"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou categoria..."
                type="search"
                value={search}
              />
            </span>
          </label>
        </article>
      </section>

      <section className="mt-9 lg:mt-12">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Inventário
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Receitas preparadas
            </h2>
          </div>
          {!isLoading && !loadError && inventory.length > 0 && (
            <span className="shrink-0 rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">
              {filteredInventory.length}{' '}
              {filteredInventory.length === 1 ? 'receita' : 'receitas'}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <article
                className="surface-card min-h-64 overflow-hidden"
                key={item}
              >
                <div className="aspect-video bg-surface-container-low" />
                <div className="space-y-3 p-4" aria-hidden="true">
                  <div className="h-4 w-3/4 rounded bg-surface-container" />
                  <div className="h-3 w-1/2 rounded bg-surface-container" />
                  <div className="h-3 w-2/3 rounded bg-surface-container" />
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && loadError && (
          <div
            className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            <p className="font-bold">Não foi possível carregar suas receitas.</p>
            <p className="mt-1">{loadError}</p>
            <button
              className="mt-3 font-bold underline"
              onClick={loadRecipes}
              type="button"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!isLoading && !loadError && recipes.length === 0 && (
          <div className="surface-card grid min-h-56 place-items-center p-6 text-center">
            <div>
              <span className="material-symbols-outlined text-5xl text-primary">
                menu_book
              </span>
              <p className="mt-3 text-lg font-bold text-primary">
                Você ainda não preparou nenhuma receita
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">
                Confirme o consumo de uma receita sugerida e ela aparecerá
                automaticamente neste inventário.
              </p>
              <button
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
                onClick={onGoToPantry}
                type="button"
              >
                Ver receitas sugeridas
              </button>
            </div>
          </div>
        )}

        {!isLoading &&
          !loadError &&
          inventory.length > 0 &&
          filteredInventory.length === 0 && (
            <div className="surface-card grid min-h-40 place-items-center p-6 text-center">
              <div>
                <span className="material-symbols-outlined text-4xl text-outline">
                  search_off
                </span>
                <p className="mt-2 font-bold text-primary">
                  Nenhuma receita encontrada
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Tente buscar por outro nome ou categoria.
                </p>
                <button
                  className="mt-3 text-sm font-bold text-primary underline"
                  onClick={() => setSearch('')}
                  type="button"
                >
                  Limpar busca
                </button>
              </div>
            </div>
          )}

        {!isLoading && !loadError && filteredInventory.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredInventory.map((recipe) => (
              <button
                aria-label={`Ver detalhes da receita ${recipe.title}`}
                className="surface-card group overflow-hidden text-left transition duration-300 hover:-translate-y-1 hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                key={recipe.id || recipe.title}
                onClick={() => onOpenRecipe(recipe)}
                type="button"
              >
                <div className="relative aspect-video overflow-hidden bg-surface-container-high">
                  {recipe.image ? (
                    <img
                      alt={recipe.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      src={recipe.image}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-outline">
                      <span className="material-symbols-outlined text-5xl">
                        restaurant
                      </span>
                    </div>
                  )}

                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm backdrop-blur">
                    Preparada {recipe.timesCooked}x
                  </span>
                </div>

                <div className="p-4">
                  <h3 className="truncate text-base font-bold text-on-surface sm:text-lg">
                    {recipe.title}
                  </h3>
                  <p className="mt-1 text-xs capitalize text-on-surface-variant">
                    {recipe.category}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-outline-variant/30 pt-2.5 text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        schedule
                      </span>
                      {recipe.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">
                        history
                      </span>
                      {formatDateTime(recipe.lastCookedAt)}
                    </span>
                  </div>

                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">
                    Ver detalhes
                    <span className="material-symbols-outlined text-base">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {!isLoading && !loadError && recipes.length > 0 && (
        <section className="mt-9 lg:mt-12">
          <div className="surface-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                  Linha do tempo
                </p>
                <h2 className="mt-1 text-xl font-bold text-primary">
                  Histórico de preparos
                </h2>
              </div>
              <span className="text-xs font-semibold text-on-surface-variant">
                {recipes.length}{' '}
                {recipes.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <ul className="mt-4 divide-y divide-outline-variant/40">
              {recipes.slice(0, 20).map((recipe) => (
                <li key={recipe.historyId}>
                  <button
                    className="flex w-full items-center justify-between gap-4 py-3 text-left transition hover:text-primary"
                    onClick={() => onOpenRecipe(recipe)}
                    type="button"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-container text-primary">
                        <span className="material-symbols-outlined text-lg">
                          restaurant
                        </span>
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {recipe.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-on-surface-variant">
                      {formatDateTime(recipe.cookedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {recipes.length > 20 && (
              <p className="mt-3 text-xs text-on-surface-variant">
                Exibindo os 20 preparos mais recentes.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default MyRecipesPage
