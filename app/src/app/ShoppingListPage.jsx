import { useEffect, useMemo, useState } from 'react'
import PurchaseItemModal from '../components/PurchaseItemModal.jsx'
import ShoppingItemModal from '../components/ShoppingItemModal.jsx'
import { formatQuantity } from '../lib/format.js'
import {
  addShoppingItem,
  extractMealPlanMissingItems,
  getShoppingSuggestions,
  listShoppingItems,
  markShoppingItemPurchased,
  removeShoppingItem,
  updateShoppingItem,
} from '../services/shoppingList.js'

function ShoppingListPage({
  weeklyPlan = [],
  pantryItems = [],
  onGoToPantry,
  onNotice,
}) {
  const [items, setItems] = useState([])
  const [purchasedItems, setPurchasedItems] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeCategory, setActiveCategory] = useState('todas')
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [purchasingItem, setPurchasingItem] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPurchased, setShowPurchased] = useState(false)

  // Carrega lista pendente, comprados recentes e sugestões
  useEffect(() => {
    let isActive = true

    Promise.all([
      listShoppingItems({ status: 'pending' }),
      listShoppingItems({ status: 'purchased' }).catch(() => []),
      getShoppingSuggestions(90).catch(() => []),
    ])
      .then(([pendingList, purchasedList, smartSuggestions]) => {
        if (isActive) {
          setItems(pendingList)
          setPurchasedItems(purchasedList)
          setSuggestions(smartSuggestions)
          setError('')
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(
            err.message || 'Não foi possível carregar a sua lista de compras.',
          )
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  async function loadData() {
    setIsLoading(true)
    setError('')

    try {
      const [pendingList, purchasedList, smartSuggestions] = await Promise.all([
        listShoppingItems({ status: 'pending' }),
        listShoppingItems({ status: 'purchased' }).catch(() => []),
        getShoppingSuggestions(90).catch(() => []),
      ])

      setItems(pendingList)
      setPurchasedItems(purchasedList)
      setSuggestions(smartSuggestions)
    } catch (err) {
      setError(
        err.message || 'Não foi possível carregar a sua lista de compras.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Extrai itens faltantes do planejamento que ainda não constam na despensa nem na lista
  const missingPlanItems = useMemo(() => {
    return extractMealPlanMissingItems(weeklyPlan, pantryItems, items)
  }, [weeklyPlan, pantryItems, items])

  // Filtra itens pendentes por categoria
  const filteredItems = useMemo(() => {
    if (activeCategory === 'todas') return items
    return items.filter((item) => item.category === activeCategory)
  }, [items, activeCategory])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return ['todas', ...Array.from(set)]
  }, [items])

  async function handleSaveItem(formData) {
    setIsSubmitting(true)
    try {
      if (editingItem) {
        const updated = await updateShoppingItem(editingItem.id, formData)
        setItems((curr) =>
          curr.map((i) => (i.id === updated.id ? updated : i)),
        )
        onNotice?.(`"${updated.name}" atualizado na lista de compras.`)
      } else {
        const created = await addShoppingItem(formData)
        setItems((curr) => {
          const exists = curr.some((i) => i.id === created.id)
          return exists
            ? curr.map((i) => (i.id === created.id ? created : i))
            : [created, ...curr]
        })
        onNotice?.(`"${created.name}" adicionado à lista de compras.`)
      }
      setIsItemModalOpen(false)
      setEditingItem(null)
    } catch (err) {
      alert(err.message || 'Não foi possível salvar o item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveItem(item) {
    if (!confirm(`Remover "${item.name}" da lista de compras?`)) return

    try {
      await removeShoppingItem(item.id)
      setItems((curr) => curr.filter((i) => i.id !== item.id))
      onNotice?.(`"${item.name}" removido da lista.`)
    } catch (err) {
      alert(err.message || 'Não foi possível remover o item.')
    }
  }

  async function handleAddSuggestion(suggestion) {
    try {
      const created = await addShoppingItem({
        name: suggestion.name,
        category: suggestion.category || 'outros',
        unit: suggestion.unit,
        quantity: suggestion.suggestedQuantity || 1,
        source: 'suggestion',
      })

      setItems((curr) => {
        const exists = curr.some((i) => i.id === created.id)
        return exists
          ? curr.map((i) => (i.id === created.id ? created : i))
          : [created, ...curr]
      })

      // Remove da lista de sugestões visíveis
      setSuggestions((curr) =>
        curr.filter((s) => s.nameNormalized !== suggestion.nameNormalized),
      )

      onNotice?.(`"${created.name}" adicionado à lista de compras!`)
    } catch (err) {
      alert(err.message || 'Não foi possível adicionar a sugestão.')
    }
  }

  async function handleAddMissingPlanItem(missing) {
    try {
      const created = await addShoppingItem({
        name: missing.name,
        category: missing.category || 'outros',
        unit: missing.unit,
        quantity: missing.quantity || 1,
        source: 'meal_plan',
        note: `Para receita: ${missing.recipeTitles.join(', ')}`,
      })

      setItems((curr) => {
        const exists = curr.some((i) => i.id === created.id)
        return exists
          ? curr.map((i) => (i.id === created.id ? created : i))
          : [created, ...curr]
      })

      onNotice?.(
        `"${created.name}" do planejamento adicionado à lista de compras!`,
      )
    } catch (err) {
      alert(err.message || 'Não foi possível adicionar o ingrediente.')
    }
  }

  async function handleConfirmPurchase(options) {
    if (!purchasingItem) return
    setIsSubmitting(true)

    try {
      const updated = await markShoppingItemPurchased(
        purchasingItem.id,
        options,
      )

      setItems((curr) => curr.filter((i) => i.id !== purchasingItem.id))
      setPurchasedItems((curr) => [updated, ...curr])
      setPurchasingItem(null)

      onNotice?.(
        options.addToPantry
          ? `"${updated.name}" comprado e adicionado ao estoque da despensa!`
          : `"${updated.name}" marcado como comprado.`,
      )
    } catch (err) {
      alert(err.message || 'Não foi possível confirmar a compra.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReAddPurchased(purchased) {
    try {
      const created = await addShoppingItem({
        name: purchased.name,
        category: purchased.category,
        unit: purchased.unit,
        quantity: purchased.quantity || 1,
        source: 'manual',
      })

      setItems((curr) => {
        const exists = curr.some((i) => i.id === created.id)
        return exists
          ? curr.map((i) => (i.id === created.id ? created : i))
          : [created, ...curr]
      })

      onNotice?.(`"${created.name}" readicionado à lista de compras!`)
    } catch (err) {
      alert(err.message || 'Não foi possível readicionar o item.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
              Compras inteligentes
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-primary sm:text-3xl">
              Minha lista de compras
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Planeje suas compras com sugestões baseadas no consumo da sua casa,
              ingredientes faltantes do cardápio semanal e itens manuais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-xs font-bold text-primary transition hover:bg-surface-container-low"
              onClick={onGoToPantry}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">kitchen</span>
              Ver despensa
            </button>

            <button
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary-container"
              onClick={() => {
                setEditingItem(null)
                setIsItemModalOpen(true)
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Novo item
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
          <div className="surface-card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-2xl">
                checklist
              </span>
            </span>
            <div>
              <p className="text-xl font-bold text-primary">{items.length}</p>
              <p className="text-xs text-on-surface-variant">Itens para comprar</p>
            </div>
          </div>

          <div className="surface-card flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary-container text-primary">
              <span className="material-symbols-outlined text-2xl">
                auto_awesome
              </span>
            </span>
            <div>
              <p className="text-xl font-bold text-primary">
                {suggestions.length + missingPlanItems.length}
              </p>
              <p className="text-xs text-on-surface-variant">Sugestões ativas</p>
            </div>
          </div>

          <div className="surface-card col-span-2 flex items-center gap-3 p-4 sm:col-span-1">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <span className="material-symbols-outlined text-2xl">
                shopping_cart_checkout
              </span>
            </span>
            <div>
              <p className="text-xl font-bold text-primary">
                {purchasedItems.length}
              </p>
              <p className="text-xs text-on-surface-variant">
                Comprados recentemente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Erro global */}
      {error && (
        <div
          className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-800"
          role="alert"
        >
          {error}
          <button
            className="ml-2 underline font-bold"
            onClick={loadData}
            type="button"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Seção 1: Itens faltantes do Planejamento Semanal */}
      {missingPlanItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-primary">
              calendar_month
            </span>
            <h2 className="text-base font-bold text-primary">
              Para o seu planejamento semanal
            </h2>
            <span className="rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {missingPlanItems.length}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant">
            Ingredientes que faltam na sua despensa para executar o cardápio
            desta semana:
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missingPlanItems.map((missing) => (
              <article
                className="surface-card flex flex-col justify-between border-l-4 border-l-primary p-4"
                key={`${missing.nameNormalized}-${missing.unit}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-primary">
                      {missing.name}
                    </h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                      {formatQuantity(missing.quantity, missing.unit)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-on-surface-variant line-clamp-2">
                    Necessário em: {missing.recipeTitles.join(', ')}
                  </p>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-container"
                    onClick={() => handleAddMissingPlanItem(missing)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">
                      add_shopping_cart
                    </span>
                    Adicionar à lista
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Seção 2: Sugestões inteligentes do histórico */}
      {suggestions.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-primary">
              auto_awesome
            </span>
            <h2 className="text-base font-bold text-primary">
              Sugestões baseadas no seu consumo
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
              {suggestions.length}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {suggestions.slice(0, 8).map((sug) => (
              <article
                className="surface-card flex flex-col justify-between p-4"
                key={`${sug.nameNormalized}-${sug.unit}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-primary">
                      {sug.name}
                    </h3>
                    <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-primary">
                      {formatQuantity(sug.suggestedQuantity, sug.unit)}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] font-semibold text-amber-800">
                    {sug.reason}
                  </p>
                  <p className="mt-0.5 text-[10px] text-on-surface-variant">
                    Estoque atual: {formatQuantity(sug.currentStock, sug.unit)}
                  </p>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    className="flex items-center gap-1 rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/5"
                    onClick={() => handleAddSuggestion(sug)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">
                      add
                    </span>
                    Adicionar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Seção 3: Itens da Lista de Compras (Pendentes) */}
      <section className="surface-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-4">
          <div>
            <h2 className="text-lg font-bold text-primary">Itens para comprar</h2>
            <p className="text-xs text-on-surface-variant">
              Marque o item ao comprar para atualizar sua despensa
            </p>
          </div>

          {categories.length > 2 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <button
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    activeCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-surface-container text-on-surface-variant hover:text-primary'
                  }`}
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  type="button"
                >
                  {cat === 'todas'
                    ? 'Todas'
                    : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">
              progress_activity
            </span>
            <p className="mt-2 text-xs">Carregando sua lista de compras...</p>
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline">
              shopping_cart
            </span>
            <p className="mt-2 text-sm font-bold text-primary">
              Sua lista de compras está vazia
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-outline leading-relaxed">
              Adicione itens manualmente ou aproveite as sugestões automáticas
              acima para abastecer sua despensa.
            </p>
            <button
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-container"
              onClick={() => {
                setEditingItem(null)
                setIsItemModalOpen(true)
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Adicionar primeiro item
            </button>
          </div>
        )}

        {!isLoading && items.length > 0 && filteredItems.length === 0 && (
          <p className="py-6 text-center text-xs text-on-surface-variant">
            Nenhum item encontrado nesta categoria.
          </p>
        )}

        {!isLoading && filteredItems.length > 0 && (
          <ul className="divide-y divide-outline-variant/40" role="list">
            {filteredItems.map((item) => (
              <li
                className="flex items-center justify-between gap-3 py-3 transition hover:bg-surface-container-low/50 px-2 rounded-xl"
                key={item.id}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    aria-label={`Marcar ${item.name} como comprado`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 border-outline-variant text-transparent transition hover:border-emerald-600 hover:text-emerald-600"
                    onClick={() => setPurchasingItem(item)}
                    title="Confirmar compra"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">
                      check
                    </span>
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-on-surface">
                        {item.name}
                      </p>
                      {item.source === 'meal_plan' && (
                        <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-primary">
                          Planejamento
                        </span>
                      )}
                      {item.source === 'suggestion' && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Sugestão
                        </span>
                      )}
                    </div>
                    {item.note && (
                      <p className="truncate text-xs text-on-surface-variant">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-bold text-primary">
                    {formatQuantity(item.quantity, item.unit)}
                  </span>

                  <button
                    aria-label={`Editar ${item.name}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition hover:bg-surface-container hover:text-primary"
                    onClick={() => {
                      setEditingItem(item)
                      setIsItemModalOpen(true)
                    }}
                    title="Editar item"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      edit
                    </span>
                  </button>

                  <button
                    aria-label={`Remover ${item.name}`}
                    className="grid h-8 w-8 place-items-center rounded-lg text-on-surface-variant transition hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleRemoveItem(item)}
                    title="Remover item"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      delete
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Seção 4: Comprados recentemente (expansível) */}
      {purchasedItems.length > 0 && (
        <section className="surface-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-emerald-700">
                shopping_cart_checkout
              </span>
              <h2 className="text-base font-bold text-primary">
                Comprados recentemente
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900">
                {purchasedItems.length}
              </span>
            </div>

            <button
              className="text-xs font-bold text-primary hover:underline"
              onClick={() => setShowPurchased((curr) => !curr)}
              type="button"
            >
              {showPurchased ? 'Ocultar' : 'Exibir'}
            </button>
          </div>

          {showPurchased && (
            <ul className="divide-y divide-outline-variant/40 pt-2" role="list">
              {purchasedItems.slice(0, 15).map((purchased) => (
                <li
                  className="flex items-center justify-between gap-3 py-2.5"
                  key={purchased.id}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-base text-emerald-600">
                      check_circle
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-on-surface line-through decoration-on-surface-variant/40">
                        {purchased.name}
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {formatQuantity(purchased.quantity, purchased.unit)}
                      </p>
                    </div>
                  </div>

                  <button
                    className="flex items-center gap-1 rounded-lg border border-outline-variant px-2 py-1 text-[11px] font-semibold text-primary transition hover:bg-surface-container"
                    onClick={() => handleReAddPurchased(purchased)}
                    title="Adicionar novamente à lista"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xs">
                      replay
                    </span>
                    Comprar de novo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Modais */}
      <ShoppingItemModal
        error=""
        isOpen={isItemModalOpen}
        isSubmitting={isSubmitting}
        item={editingItem}
        onClose={() => {
          setIsItemModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSaveItem}
      />

      {purchasingItem && (
        <PurchaseItemModal
          error=""
          isOpen={true}
          isSubmitting={isSubmitting}
          item={purchasingItem}
          onClose={() => setPurchasingItem(null)}
          onConfirm={handleConfirmPurchase}
        />
      )}
    </div>
  )
}

export default ShoppingListPage
