import { useEffect, useId } from 'react'
import FavoriteButton from './FavoriteButton.jsx'

// Com a migração para o Gemini, os passos de preparo (steps), tempo e porções
// chegam embutidos no objeto recipe retornado pela Edge Function.
// Não há necessidade de uma segunda requisição para buscar detalhes.

function RecipeDetailModal({
  isOpen,
  recipe,
  onClose,
  onCook,
  onPlan,
  isFavorite = false,
  onToggleFavorite,
}) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !recipe) return null

  // Todos os dados já estão disponíveis no objeto recipe desde a primeira chamada ao Gemini.
  const usedIngredients = recipe.usedIngredients ?? []
  const missedIngredients = recipe.missedIngredients ?? []
  const steps = recipe.steps ?? []
  const readyInMinutes = recipe.readyInMinutes || 0
  const servings = recipe.servings || 0
  const caloriesPerServing = recipe.caloriesPerServing || 0

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-on-background/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
    >
      <section
        aria-labelledby={titleId}
        className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[1.75rem]"
      >
        {/* Cabeçalho com Imagem e Botão Fechar */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-container-high sm:max-h-64">
          <img
            alt={recipe.title}
            className="h-full w-full object-cover"
            src={recipe.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute right-3 top-3 flex items-center gap-2">
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={onToggleFavorite}
              recipe={recipe}
            />
            <button
              aria-label="Fechar detalhes da receita"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-on-surface shadow-md backdrop-blur transition hover:bg-white"
              onClick={onClose}
              type="button"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="absolute bottom-3 left-4 right-4 text-white sm:bottom-4 sm:left-6 sm:right-6">
            <span className="inline-block rounded-full bg-primary/90 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              Receita Sugerida
            </span>
            <h2
              className="mt-1 line-clamp-2 text-xl font-bold leading-tight sm:text-2xl"
              id={titleId}
            >
              {recipe.title}
            </h2>
          </div>
        </div>

        {/* Corpo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {(recipe.imageSource === 'wikimedia-commons' || recipe.imageSourceUrl) && (
            <p className="mb-4 text-[11px] leading-4 text-on-surface-variant">
              Foto: {recipe.imageAuthor || 'Wikimedia Commons'}
              {recipe.imageLicense ? ` · ${recipe.imageLicense}` : ''}
              {recipe.imageSourceUrl && (
                <>
                  {' · '}
                  <a
                    className="underline hover:text-primary"
                    href={recipe.imageSourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    ver fonte
                  </a>
                </>
              )}
            </p>
          )}

          {/* Métricas rápidas */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1.5 text-xs font-bold text-primary">
              <span className="material-symbols-outlined text-base">schedule</span>
              {readyInMinutes > 0 ? `${readyInMinutes} minutos` : 'Tempo não informado'}
            </span>

            {caloriesPerServing > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-800">
                <span className="material-symbols-outlined text-base">
                  local_fire_department
                </span>
                {caloriesPerServing} kcal por porção
              </span>
            )}

            {servings > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-base">group</span>
                {servings} {servings === 1 ? 'porção' : 'porções'}
              </span>
            )}

            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <span className="material-symbols-outlined text-base">task_alt</span>
              {usedIngredients.length} da sua despensa
            </span>
          </div>

          {/* Ingredientes da Despensa vs Faltantes */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-900">
                <span className="material-symbols-outlined text-lg text-emerald-700">check_circle</span>
                Você já tem ({usedIngredients.length})
              </h3>
              {usedIngredients.length === 0 ? (
                <p className="mt-2 text-xs text-emerald-700/80">Nenhum ingrediente correspondente identificado.</p>
              ) : (
                <ul className="mt-2.5 space-y-1.5">
                  {usedIngredients.map((item) => (
                    <li className="flex items-center gap-2 text-xs font-medium text-emerald-950" key={item.id || item.name}>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      <span className="capitalize">{item.name}</span>
                      {item.amount && (
                        <span className="text-emerald-700">({item.amount})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
                <span className="material-symbols-outlined text-lg text-amber-700">shopping_cart</span>
                Falta comprar ({missedIngredients.length})
              </h3>
              {missedIngredients.length === 0 ? (
                <p className="mt-2 text-xs text-amber-700/80">Você já tem todos os ingredientes necessários!</p>
              ) : (
                <ul className="mt-2.5 space-y-1.5">
                  {missedIngredients.map((item) => (
                    <li className="flex items-center gap-2 text-xs font-medium text-amber-950" key={item.id || item.name}>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                      <span className="capitalize">{item.name}</span>
                      {item.amount && (
                        <span className="text-amber-700">({item.amount})</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Modo de Preparo */}
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-primary">
              <span className="material-symbols-outlined text-xl">menu_book</span>
              Modo de preparo
            </h3>

            {steps.length > 0 ? (
              <ol className="mt-3 space-y-3">
                {steps.map((step, index) => (
                  <li
                    className="flex gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 p-3.5 text-sm leading-relaxed text-on-surface"
                    key={index}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 rounded-xl bg-surface-container-low p-4 text-xs text-on-surface-variant">
                Esta receita não possui instruções passo a passo disponíveis.
              </p>
            )}
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-outline-variant bg-surface-container-low/50 px-5 py-4 sm:gap-3 sm:px-6">
          <button
            className="rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-sm font-bold text-on-surface transition hover:bg-surface-container"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>

          <button
            className="flex items-center gap-2 rounded-xl border border-primary/30 bg-white px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-secondary-container"
            onClick={() => onPlan?.(recipe)}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">
              calendar_month
            </span>
            Planejar
          </button>

          <button
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-container shadow-sm"
            onClick={() => onCook?.(recipe)}
            type="button"
          >
            <span className="material-symbols-outlined text-lg">restaurant</span>
            Cozinhar esta receita
          </button>
        </div>
      </section>
    </div>
  )
}

export default RecipeDetailModal
