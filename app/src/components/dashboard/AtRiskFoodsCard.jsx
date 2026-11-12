import { getAtRiskUrgency } from '../../lib/consumptionMetrics.js'

function getFoodEmoji(category, name = '') {
  const cleanName = String(name).toLowerCase()
  if (cleanName.includes('tomate')) return '🍅'
  if (cleanName.includes('pao')) return '🍞'
  if (cleanName.includes('ovo')) return '🥚'
  if (cleanName.includes('leite') || cleanName.includes('queijo')) return '🧀'
  if (cleanName.includes('maca') || cleanName.includes('fruta')) return '🍎'
  if (cleanName.includes('banana')) return '🍌'
  if (cleanName.includes('carne') || cleanName.includes('frango')) return '🥩'
  if (cleanName.includes('arroz') || cleanName.includes('feijao')) return '🍚'

  const cat = String(category).toLowerCase()
  if (cat.includes('horti')) return '🥬'
  if (cat.includes('panific')) return '🥖'
  if (cat.includes('latici')) return '🥛'
  if (cat.includes('carne')) return '🍗'
  return '🥫'
}

/**
 * Painel de Alimentos em Risco com atalho direto para receitas que aproveitam o ingrediente.
 */
export default function AtRiskFoodsCard({
  items = [],
  onFindRecipesForIngredient,
  onViewAllSuggestions,
}) {
  return (
    <div className="surface-card flex h-full flex-col justify-between p-5">
      <div>
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <span className="material-symbols-outlined text-xl">
                warning
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Alimentos em Risco
              </h3>
              <p className="text-xs text-on-surface-variant">
                Vencimento iminente ou expirado
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        <div className="mt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <span className="material-symbols-outlined text-2xl">
                  check_circle
                </span>
              </div>
              <h4 className="mt-3 text-sm font-bold text-on-surface">
                Tudo sob controle!
              </h4>
              <p className="mt-1 max-w-xs text-xs text-on-surface-variant">
                Nenhum ingrediente da despensa está com vencimento próximo nos
                próximos 3 dias.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.slice(0, 5).map((item) => {
                const urgency = getAtRiskUrgency(item.expiration_date)
                const emoji = getFoodEmoji(item.category, item.name)

                return (
                  <div
                    className="flex flex-col gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 p-3 transition hover:border-outline-variant hover:bg-surface-container-low sm:flex-row sm:items-center sm:justify-between"
                    key={item.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-xs">
                        {emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate text-sm font-bold text-on-surface">
                            {item.name}
                          </h4>
                          <span className="text-xs text-on-surface-variant">
                            ({item.quantity} {item.unit})
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-bold ${urgency.badgeClass}`}
                          >
                            {urgency.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition shadow-xs ${urgency.actionClass}`}
                      onClick={() => onFindRecipesForIngredient?.(item)}
                      title={`Buscar receitas que usem ${item.name}`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">
                        restaurant_menu
                      </span>
                      <span>Ver receitas para aproveitar</span>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4 border-t border-outline-variant/30 pt-3">
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-surface-container-low py-2.5 text-xs font-bold text-primary transition hover:bg-secondary-container"
            onClick={onViewAllSuggestions}
            type="button"
          >
            <span>Ver todas as receitas sugeridas</span>
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
