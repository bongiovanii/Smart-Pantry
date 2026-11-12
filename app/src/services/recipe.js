// Importamos o cliente do Supabase já configurado no projeto.
// A aplicação chamará uma Edge Function do Supabase em vez de acessar
// qualquer API de terceiros diretamente, mantendo as chaves privadas no servidor.
import { normalizeRecipeFromApi } from '../lib/recipeRecord.js'
import { isSupabaseConfigured, supabase } from '../lib/supabase.js'

// Nome da Edge Function responsável por gerar receitas via Gemini API.
const RECIPE_FUNCTION_NAME = 'recipe-suggestions'

// Quantidade padrão de receitas exibidas no carrossel.
const DEFAULT_RECIPE_LIMIT = 6

// Limite máximo aceito pelo frontend para evitar respostas grandes demais.
const MAX_RECIPE_LIMIT = 12

/**
 * Converte os itens recebidos em uma lista limpa de nomes de ingredientes.
 *
 * A função aceita tanto objetos da tabela pantry_items:
 *   { id: '...', name: 'Tomate' }
 *
 * quanto strings simples:
 *   'Tomate'
 */
function normalizeIngredientNames(ingredients) {
  // Array.isArray verifica se o valor recebido é realmente uma lista.
  if (!Array.isArray(ingredients)) {
    throw new TypeError('Os ingredientes devem ser enviados em uma lista.')
  }

  // map percorre a lista e transforma cada item somente em seu nome.
  const names = ingredients.map((ingredient) => {
    // Se o item já for uma string, podemos utilizá-lo diretamente.
    if (typeof ingredient === 'string') return ingredient

    // O operador ?. evita um erro caso ingredient seja null ou undefined.
    return ingredient?.name ?? ''
  })

  // O segundo map remove espaços e padroniza o texto em letras minúsculas.
  const normalizedNames = names.map((name) =>
    name.trim().toLocaleLowerCase('pt-BR'),
  )

  // filter remove nomes vazios que não devem ser enviados para a API.
  const validNames = normalizedNames.filter(Boolean)

  // Set guarda somente valores únicos. Depois usamos o spread (...)
  // para converter o Set novamente em um array.
  return [...new Set(validNames)]
}

/**
 * Garante que a quantidade solicitada fique entre 1 e MAX_RECIPE_LIMIT.
 */
function normalizeLimit(limit) {
  // Number converte valores como "6" para o número 6.
  const numericLimit = Number(limit)

  // Se o valor não for um número válido, usamos o limite padrão.
  if (!Number.isFinite(numericLimit)) return DEFAULT_RECIPE_LIMIT

  // Math.trunc remove casas decimais; Math.min e Math.max aplicam os limites.
  return Math.min(Math.max(Math.trunc(numericLimit), 1), MAX_RECIPE_LIMIT)
}

/**
 * Extrai a mensagem devolvida pela Edge Function.
 *
 * O SDK do Supabase guarda a resposta HTTP em `error.context`; sem isso, o
 * frontend exibiria sempre o mesmo texto genérico e esconderia a causa real
 * (modelo indisponível, cota excedida, chave inválida etc.).
 */
async function getFunctionErrorMessage(error) {
  const fallback = 'Não foi possível carregar as receitas.'

  try {
    const context = error?.context

    if (context && typeof context.clone === 'function') {
      const payload = await context.clone().json()

      if (payload?.error) {
        const detail =
          import.meta.env.DEV && payload?.detail
            ? ` Detalhe: ${payload.detail}`
            : ''
        return `${payload.error}${detail}`
      }
    }
  } catch {
    // Se a resposta não for JSON, mantemos a mensagem genérica.
  }

  return fallback
}

/**
 * Busca receitas que aproveitem os ingredientes cadastrados na despensa.
 *
 * A Edge Function consulta primeiro a biblioteca do usuário (cache-first) e
 * só chama o Gemini quando a biblioteca não cobre a quantidade pedida.
 *
 * @param {Array<string | { name: string }>} ingredients itens da despensa
 * @param {{ limit?: number }} options configurações opcionais da busca
 * @returns {Promise<{
 *   recipes: Array,
 *   source: 'cache' | 'mixed' | 'ai',
 *   cacheHits: number,
 *   generated: number,
 *   remainingGenerationsToday: number | null,
 *   limitReached: boolean,
 * }>} receitas e metadados da geração
 */
export async function listRecipesByIngredients(ingredients, options = {}) {
  // O frontend só pode chamar a função se o cliente Supabase estiver pronto.
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'O Supabase não está configurado para consultar as receitas.',
    )
  }

  // Preparamos os nomes antes de enviá-los ao backend.
  const ingredientNames = normalizeIngredientNames(ingredients)

  // Sem ingredientes não há o que pesquisar. O objeto vazio mantém o mesmo
  // contrato de retorno usado quando a consulta é concluída.
  if (ingredientNames.length === 0) {
    return {
      recipes: [],
      source: 'cache',
      cacheHits: 0,
      generated: 0,
      remainingGenerationsToday: null,
      limitReached: false,
    }
  }

  // options.limit usa o valor informado pelo chamador ou o padrão definido.
  const limit = normalizeLimit(options.limit ?? DEFAULT_RECIPE_LIMIT)

  // await pausa somente esta função enquanto o Supabase responde.
  // functions.invoke realiza uma requisição POST para a Edge Function.
  const { data, error } = await supabase.functions.invoke(
    RECIPE_FUNCTION_NAME,
    {
      // body é convertido para JSON automaticamente pelo SDK do Supabase.
      body: {
        ingredients: ingredientNames,
        limit,
      },
    },
  )

  // O SDK coloca falhas de rede ou da Edge Function na propriedade error.
  if (error) {
    throw new Error(await getFunctionErrorMessage(error), {
      cause: error,
    })
  }

  // Aceitamos os dois formatos abaixo para facilitar a evolução do backend:
  //   { recipes: [...], source, cacheHits, generated }
  //   [...]
  const payload = Array.isArray(data) ? { recipes: data } : (data ?? {})
  const recipes = payload.recipes

  // Uma resposta fora do contrato é tratada como erro, evitando quebrar a UI.
  if (!Array.isArray(recipes)) {
    throw new Error('A resposta do serviço de receitas é inválida.')
  }

  const remaining = payload.remainingGenerationsToday

  return {
    recipes: recipes.map(normalizeRecipeFromApi),
    source: payload.source || 'ai',
    cacheHits: Number(payload.cacheHits ?? 0),
    generated: Number(payload.generated ?? recipes.length),
    remainingGenerationsToday:
      remaining == null || !Number.isFinite(Number(remaining))
        ? null
        : Number(remaining),
    limitReached: Boolean(payload.limitReached),
  }
}

/**
 * Retorna os detalhes completos de uma receita.
 *
 * Com a migração para o Gemini, todos os dados (steps, servings, ingredientes)
 * já vêm embutidos na resposta inicial de listRecipesByIngredients.
 * Esta função simplesmente normaliza o objeto de receita recebido,
 * mantendo o contrato de interface esperado pelo RecipeDetailModal.
 *
 * @param {Object} recipe Objeto de receita já normalizado (vindo do card)
 * @returns {Promise<Object>} Dados completos da receita prontos para exibição
 */
export async function getRecipeDetails(recipe) {
  if (!recipe || typeof recipe !== 'object') {
    throw new Error('Dados da receita não fornecidos.')
  }

  // Retorna uma Promise resolvida imediatamente — sem requisição adicional.
  // O Gemini já entregou steps, servings e ingredientes na primeira chamada.
  return Promise.resolve({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    readyInMinutes: recipe.readyInMinutes ?? 0,
    servings: recipe.servings ?? 0,
    caloriesPerServing: recipe.caloriesPerServing ?? 0,
    steps: recipe.steps ?? [],
    usedIngredients: recipe.usedIngredients ?? [],
    missedIngredients: recipe.missedIngredients ?? [],
    imageQuery: recipe.imageQuery ?? '',
    imageSource: recipe.imageSource ?? '',
    imageAuthor: recipe.imageAuthor ?? '',
    imageLicense: recipe.imageLicense ?? '',
    imageLicenseUrl: recipe.imageLicenseUrl ?? '',
    imageSourceUrl: recipe.imageSourceUrl ?? '',
  })
}

