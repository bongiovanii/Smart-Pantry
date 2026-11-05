// Importamos o cliente do Supabase já configurado no projeto.
// A aplicação chamará uma Edge Function do Supabase em vez de acessar
// qualquer API de terceiros diretamente, mantendo as chaves privadas no servidor.
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
 * Converte uma receita retornada pelo Gemini (via Edge Function) para o
 * formato usado na tela. Inclui steps e servings que agora vêm embutidos
 * na primeira resposta, eliminando a necessidade de uma segunda requisição.
 */
function normalizeRecipe(recipe) {
  // As contagens chegam como inteiros do Gemini, mas garantimos número por segurança.
  const usedIngredientCount = Number(recipe.usedIngredientCount ?? 0)
  const missedIngredientCount = Number(recipe.missedIngredientCount ?? 0)
  const readyInMinutes = Number(recipe.readyInMinutes ?? 0)
  const servings = Number(recipe.servings ?? 0)

  // Retornamos um novo objeto contendo todos os dados necessários para o app,
  // incluindo steps e servings que antes exigiam uma segunda chamada à API.
  return {
    id: recipe.id,
    title: recipe.title || 'Receita sem nome',
    image: recipe.image || '',
    category: recipe.category || 'outros',
    readyInMinutes,
    servings,
    time: readyInMinutes > 0 ? `${readyInMinutes} min` : 'Tempo não informado',
    usedIngredientCount,
    missedIngredientCount,
    usedIngredients: recipe.usedIngredients ?? [],
    missedIngredients: recipe.missedIngredients ?? [],
    // steps vem embutido do Gemini — sem segunda requisição necessária.
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    ingredients: `${usedIngredientCount} ingrediente${usedIngredientCount === 1 ? '' : 's'} da despensa`,
  }
}

/**
 * Busca receitas que aproveitem os ingredientes cadastrados na despensa.
 *
 * @param {Array<string | { name: string }>} ingredients itens da despensa
 * @param {{ limit?: number }} options configurações opcionais da busca
 * @returns {Promise<Array>} lista de receitas pronta para o React renderizar
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

  // Sem ingredientes não há o que pesquisar. Retornar [] simplifica o React,
  // pois ele poderá tratar o resultado como qualquer outra lista vazia.
  if (ingredientNames.length === 0) return []

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
    throw new Error('Não foi possível carregar as receitas.', {
      cause: error,
    })
  }

  // Aceitamos os dois formatos abaixo para facilitar a evolução do backend:
  //   { recipes: [...] }
  //   [...]
  const recipes = Array.isArray(data) ? data : data?.recipes

  // Uma resposta fora do contrato é tratada como erro, evitando quebrar a UI.
  if (!Array.isArray(recipes)) {
    throw new Error('A resposta do serviço de receitas é inválida.')
  }

  // map converte cada item da resposta para o formato interno do Smart Pantry.
  return recipes.map(normalizeRecipe)
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
    steps: recipe.steps ?? [],
    usedIngredients: recipe.usedIngredients ?? [],
    missedIngredients: recipe.missedIngredients ?? [],
  })
}

