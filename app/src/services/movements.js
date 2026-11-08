import { getCurrentSession } from '../lib/session.js'
import { supabase } from '../lib/supabase.js'

const RPC_NAME = 'consume_recipe_ingredients'

/**
 * Valida e normaliza os itens escolhidos pelo usuário.
 *
 * A interface envia objetos no formato:
 *   { pantryItemId: 'uuid', quantity: 1.5 }
 */
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error(
      'Selecione pelo menos um ingrediente para registrar o consumo.',
    )
  }

  const seenIds = new Set()

  return items.map((item) => {
    const pantryItemId = item?.pantryItemId ?? item?.pantry_item_id
    const quantity = Number(item?.quantity)

    if (!pantryItemId) {
      throw new Error('Um dos ingredientes selecionados não possui identificador.')
    }

    if (seenIds.has(pantryItemId)) {
      throw new Error('O mesmo ingrediente foi selecionado mais de uma vez.')
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error('Informe uma quantidade consumida maior que zero.')
    }

    seenIds.add(pantryItemId)

    return {
      pantry_item_id: pantryItemId,
      quantity,
    }
  })
}

/**
 * Monta o snapshot salvo em user_recipes. Guardar os campos necessários para
 * renderizar a receita novamente evita depender do Gemini para abrir o
 * histórico em "Minhas receitas".
 */
function buildRecipeSnapshot(recipe, fallbackId, fallbackTitle) {
  return {
    id: recipe?.id || fallbackId || '',
    title: String(recipe?.title ?? fallbackTitle ?? '').trim(),
    image: recipe?.image || '',
    category: recipe?.category || '',
    readyInMinutes: recipe?.readyInMinutes ?? 0,
    servings: recipe?.servings ?? 0,
    caloriesPerServing: recipe?.caloriesPerServing ?? 0,
    usedIngredients: recipe?.usedIngredients ?? [],
    missedIngredients: recipe?.missedIngredients ?? [],
    steps: recipe?.steps ?? [],
    imageQuery: recipe?.imageQuery || '',
    imageSource: recipe?.imageSource || '',
    imageAuthor: recipe?.imageAuthor || '',
    imageLicense: recipe?.imageLicense || '',
    imageLicenseUrl: recipe?.imageLicenseUrl || '',
    imageSourceUrl: recipe?.imageSourceUrl || '',
  }
}

/**
 * Registra o consumo dos ingredientes de uma receita e salva a receita no
 * histórico do usuário.
 *
 * A função do banco executa tudo em uma transação: grava as movimentações do
 * tipo `consumption`, atualiza o saldo/status dos itens e insere o snapshot em
 * `user_recipes`. Se alguma etapa falhar, nada é persistido.
 *
 * @param {{
 *   recipe?: Object,
 *   recipeId?: string,
 *   recipeTitle?: string,
 *   items: Array<{ pantryItemId: string, quantity: number }>,
 * }} payload
 * @returns {Promise<Array>} itens da despensa já atualizados pelo banco
 */
export async function consumeRecipeIngredients({
  recipe = null,
  recipeId = null,
  recipeTitle = '',
  items,
}) {
  await getCurrentSession()

  const snapshot = buildRecipeSnapshot(recipe, recipeId, recipeTitle)

  if (!snapshot.title) {
    throw new Error('Informe o nome da receita consumida.')
  }

  if (!snapshot.id) {
    throw new Error('Não foi possível identificar a receita consumida.')
  }

  const { data, error } = await supabase.rpc(RPC_NAME, {
    p_recipe_id: snapshot.id,
    p_recipe_title: snapshot.title,
    p_items: normalizeItems(items),
    p_recipe: snapshot,
  })

  if (error) throw error

  return Array.isArray(data) ? data : []
}
