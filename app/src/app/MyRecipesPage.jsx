import { useEffect, useMemo, useState } from 'react'
import FavoriteButton from '../components/FavoriteButton.jsx'
import { normalizeRecipeTitle } from '../lib/recipeNormalization.js'
import { listFavoriteRecipes } from '../services/recipeLibrary.js'
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

function MyRecipesPage({
  refreshToken,
  onGoToPantry,
  onOpenRecipe,
  isFavorite,
  onToggleFavorite,
  favoriteTitles,
}) {
  const [activeTab, setActiveTab] = useState('inventario') // 'inventario' | 'favoritas' | 'historico'
  const [recipes, setRecipes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')

  const [favorites, setFavorites] = useState([])
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true)
  const [favoritesError, setFavoritesError] = useState('')
  const [favoritesSort, setFavoritesSort] = useState('recent') // 'recent' | 'title'
  const [favoritesVersion, setFavoritesVersion] = useState(0)

  function loadRecipes() {
    setIsLoading(true)
    setLoadError('')

    listCookedRecipes()
      .then((data) => {
        setRecipes(data)
      })
      .catch((error) => {
        setLoadError(
          error.message || 'Não foi possível carregar suas receitas.',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  function loadFavorites() {
    setIsLoadingFavorites(true)
    setFavoritesError('')

    listFavoriteRecipes()
      .then((data) => {
        setFavorites(data)
      })
      .catch((error) => {
        setFavoritesError(
          error.message || 'Não foi possível carregar suas receitas favoritas.',
        )
      })
      .finally(() => {
        setIsLoadingFavorites(false)
      })
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

  useEffect(() => {
    let isActive = true

    listFavoriteRecipes()
      .then((data) => {
        if (isActive) {
          setFavorites(data)
          setFavoritesError('')
        }
      })
      .catch((error) => {
        if (isActive) {
          setFavoritesError(
            error.message || 'Não foi possível carregar suas receitas favoritas.',
          )
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingFavorites(false)
      })

    return () => {
      isActive = false
    }
  }, [refreshToken, favoritesVersion])

  async function handleToggleFavorite(recipe) {
    if (onToggleFavorite) {
      await onToggleFavorite(recipe)
      setFavoritesVersion((v) => v + 1)
    }
  }

  function checkIsFavorite(recipe) {
    if (typeof isFavorite === 'function') return isFavorite(recipe)
    if (favoriteTitles && recipe?.title) {
      return favoriteTitles.has(normalizeRecipeTitle(recipe.title))
    }
    return Boolean(recipe?.isFavorite)
  }

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

  const filteredFavorites = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    let list = favorites

    if (term) {
      list = list.filter((recipe) => {
        const title = recipe.title.toLocaleLowerCase('pt-BR')
        const category = (recipe.category || '').toLocaleLowerCase('pt-BR')
        return title.includes(term) || category.includes(term)
      })
    }

    if (favoritesSort === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    }

    // Default: recentes
    return [...list].sort((a, b) => {
      const timeA = new Date(a.favoritedAt || a.createdAt || 0).getTime()
      const timeB = new Date(b.favoritedAt || b.createdAt || 0).getTime()
      return timeB - timeA
    })
  }, [favorites, search, favoritesSort])

  const lastCookedAt = recipes[0]?.cookedAt

  return (
    <div>
      {/* Cabeçalho com Apresentação e Métricas */}
      <section className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <article className="surface-card flex flex-col justify-center p-5 sm:p-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
            Seu histórico culinário
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Minhas receitas
          </h1>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">
            Gerencie seu inventário de receitas preparadas, explore suas favoritas
            e consulte o histórico completo de execuções da sua despensa.
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-secondary-container/60 p-3 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/70">
                Preparos
              </p>
              <p className="mt-1 text-2xl font-bold text-primary sm:text-3xl">
                {isLoading ? '—' : recipes.length}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                execuções feitas
              </p>
            </div>

            <div className="rounded-xl bg-surface-container-low p-3 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/70">
                Inventário
              </p>
              <p className="mt-1 text-2xl font-bold text-primary sm:text-3xl">
                {isLoading ? '—' : inventory.length}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                pratos diferentes
              </p>
            </div>

            <div className="rounded-xl bg-surface-container-low p-3 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-red-700/80">
                Favoritas
              </p>
              <p className="mt-1 text-2xl font-bold text-red-600 sm:text-3xl">
                {isLoadingFavorites ? '—' : favorites.length}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                salvas com coração
              </p>
            </div>

            <div className="rounded-xl bg-surface-container-low p-3 sm:p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary/70">
                Última vez
              </p>
              <p className="mt-1 truncate text-xs font-bold leading-6 text-primary sm:text-sm">
                {isLoading
                  ? '—'
                  : lastCookedAt
                    ? formatDateTime(lastCookedAt)
                    : 'Nenhum preparo'}
              </p>
              <p className="text-[11px] text-on-surface-variant">
                preparo recente
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
              {search && (
                <button
                  aria-label="Limpar busca"
                  className="text-xs font-bold text-outline hover:text-on-surface"
                  onClick={() => setSearch('')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </span>
          </label>
        </article>
      </section>

      {/* Navegação entre as Abas Internas */}
      <section className="mt-8 border-b border-outline-variant/30">
        <div className="flex gap-2 overflow-x-auto pb-px">
          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'inventario'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
            onClick={() => setActiveTab('inventario')}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">kitchen</span>
            Inventário
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold">
              {inventory.length}
            </span>
          </button>

          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'favoritas'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
            onClick={() => setActiveTab('favoritas')}
            type="button"
          >
            <span
              className="material-symbols-outlined text-lg text-red-600"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              favorite
            </span>
            Favoritas
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold">
              {favorites.length}
            </span>
          </button>

          <button
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
              activeTab === 'historico'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-transparent text-on-surface-variant hover:text-primary'
            }`}
            onClick={() => setActiveTab('historico')}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">history</span>
            Histórico
            <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold">
              {recipes.length}
            </span>
          </button>
        </div>
      </section>

      {/* ABA 1: INVENTÁRIO */}
      {activeTab === 'inventario' && (
        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                Inventário de preparos
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
                  Confirme o preparo de uma receita sugerida e ela aparecerá
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
                <div
                  aria-label={`Ver detalhes da receita ${recipe.title}`}
                  className="surface-card group relative overflow-hidden text-left transition duration-300 hover:-translate-y-1 hover:border-primary/30"
                  key={recipe.id || recipe.title}
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

                    <FavoriteButton
                      className="absolute right-2 top-2"
                      isFavorite={checkIsFavorite(recipe)}
                      onToggle={handleToggleFavorite}
                      recipe={recipe}
                    />
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
                      {recipe.caloriesPerServing > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">
                            local_fire_department
                          </span>
                          {recipe.caloriesPerServing} kcal
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">
                          history
                        </span>
                        {formatDateTime(recipe.lastCookedAt)}
                      </span>
                    </div>

                    <button
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary transition hover:underline"
                      onClick={() => onOpenRecipe(recipe)}
                      type="button"
                    >
                      Ver detalhes
                      <span className="material-symbols-outlined text-base">
                        arrow_forward
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABA 2: FAVORITAS */}
      {activeTab === 'favoritas' && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700/80">
                Seu livro de receitas preferidas
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                Receitas favoritas
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                <span>Ordenar:</span>
                <select
                  className="rounded-lg border border-outline-variant bg-white px-2.5 py-1.5 text-xs font-bold text-on-surface shadow-sm outline-none focus:border-primary"
                  onChange={(event) => setFavoritesSort(event.target.value)}
                  value={favoritesSort}
                >
                  <option value="recent">Mais recentes</option>
                  <option value="title">Ordem alfabética (A-Z)</option>
                </select>
              </label>

              {!isLoadingFavorites &&
                !favoritesError &&
                favorites.length > 0 && (
                  <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-primary">
                    {filteredFavorites.length}{' '}
                    {filteredFavorites.length === 1 ? 'favorita' : 'favoritas'}
                  </span>
                )}
            </div>
          </div>

          {isLoadingFavorites && (
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

          {!isLoadingFavorites && favoritesError && (
            <div
              className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
              role="alert"
            >
              <p className="font-bold">
                Não foi possível carregar as receitas favoritas.
              </p>
              <p className="mt-1">{favoritesError}</p>
              <button
                className="mt-3 font-bold underline"
                onClick={loadFavorites}
                type="button"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {!isLoadingFavorites &&
            !favoritesError &&
            favorites.length === 0 && (
              <div className="surface-card grid min-h-56 place-items-center p-8 text-center">
                <div className="max-w-md">
                  <span
                    className="material-symbols-outlined text-5xl text-red-500"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                  >
                    favorite
                  </span>
                  <p className="mt-3 text-lg font-bold text-primary">
                    Você ainda não tem receitas favoritas
                  </p>
                  <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                    Clique no ícone de coração em qualquer receita sugerida na
                    despensa, no planejamento ou no inventário para salvá-la aqui.
                  </p>
                  <button
                    className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container"
                    onClick={onGoToPantry}
                    type="button"
                  >
                    Ver receitas sugeridas
                  </button>
                </div>
              </div>
            )}

          {!isLoadingFavorites &&
            !favoritesError &&
            favorites.length > 0 &&
            filteredFavorites.length === 0 && (
              <div className="surface-card grid min-h-40 place-items-center p-6 text-center">
                <div>
                  <span className="material-symbols-outlined text-4xl text-outline">
                    search_off
                  </span>
                  <p className="mt-2 font-bold text-primary">
                    Nenhuma receita favorita encontrada
                  </p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Tente buscar por outro termo ou categoria.
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

          {!isLoadingFavorites &&
            !favoritesError &&
            filteredFavorites.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredFavorites.map((recipe) => (
                  <article
                    aria-label={`Receita favorita ${recipe.title}`}
                    className="surface-card group relative overflow-hidden text-left transition duration-300 hover:-translate-y-1 hover:border-primary/30"
                    key={recipe.id || recipe.title}
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

                      <FavoriteButton
                        className="absolute right-2 top-2"
                        isFavorite={checkIsFavorite(recipe)}
                        onToggle={handleToggleFavorite}
                        recipe={recipe}
                      />
                    </div>

                    <div className="p-4">
                      <h3 className="truncate text-base font-bold text-on-surface sm:text-lg">
                        {recipe.title}
                      </h3>
                      <p className="mt-1 text-xs capitalize text-on-surface-variant">
                        {recipe.category || 'outros'}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-outline-variant/30 pt-2.5 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-base">
                            schedule
                          </span>
                          {recipe.time}
                        </span>
                        {recipe.caloriesPerServing > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              local_fire_department
                            </span>
                            {recipe.caloriesPerServing} kcal
                          </span>
                        )}
                        {recipe.servings > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">
                              group
                            </span>
                            {recipe.servings} porções
                          </span>
                        )}
                      </div>

                      <button
                        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary transition hover:underline"
                        onClick={() => onOpenRecipe(recipe)}
                        type="button"
                      >
                        Ver detalhes
                        <span className="material-symbols-outlined text-base">
                          arrow_forward
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
        </section>
      )}

      {/* ABA 3: HISTÓRICO */}
      {activeTab === 'historico' && (
        <section className="mt-8">
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

            {recipes.length === 0 ? (
              <p className="mt-4 text-sm text-on-surface-variant">
                Nenhum preparo registrado ainda. Confirme o preparo de uma receita
                sugerida para criar seu histórico.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-outline-variant/40">
                {recipes.slice(0, 50).map((recipe) => (
                  <li
                    className="flex items-center justify-between gap-4 py-3"
                    key={recipe.historyId || `${recipe.id}-${recipe.cookedAt}`}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:text-primary"
                      onClick={() => onOpenRecipe(recipe)}
                      type="button"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary-container text-primary">
                        <span className="material-symbols-outlined text-lg">
                          restaurant
                        </span>
                      </span>
                      <span className="truncate text-sm font-semibold text-on-surface">
                        {recipe.title}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-on-surface-variant">
                        {formatDateTime(recipe.cookedAt)}
                      </span>
                      <FavoriteButton
                        isFavorite={checkIsFavorite(recipe)}
                        onToggle={handleToggleFavorite}
                        recipe={recipe}
                        size="sm"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {recipes.length > 50 && (
              <p className="mt-3 text-xs text-on-surface-variant">
                Exibindo os 50 preparos mais recentes.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default MyRecipesPage
