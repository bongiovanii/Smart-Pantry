// Endereço oficial do endpoint que procura receitas pelos ingredientes disponíveis.
// Globals disponibilizados pelo runtime Deno das Supabase Edge Functions.
declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const SPOONACULAR_ENDPOINT =
  'https://api.spoonacular.com/recipes/findByIngredients'

// Limites definidos pelo Smart Pantry para controlar tamanho da requisição e cota.
const MAX_INGREDIENTS = 20
const DEFAULT_RECIPE_LIMIT = 6
const MAX_RECIPE_LIMIT = 12

// A Spoonacular reconhece os ingredientes deste endpoint em inglês.
// Mantemos os nomes originais em português no banco e traduzimos somente
// a cópia enviada à API externa.
const INGREDIENT_TRANSLATIONS: Record<string, string> = {
  acucar: 'sugar',
  alho: 'garlic',
  arroz: 'rice',
  'arroz branco': 'white rice',
  'arroz integral': 'brown rice',
  aveia: 'oats',
  azeite: 'olive oil',
  bacon: 'bacon',
  banana: 'banana',
  batata: 'potato',
  'batata doce': 'sweet potato',
  berinjela: 'eggplant',
  beterraba: 'beetroot',
  brocolis: 'broccoli',
  cafe: 'coffee',
  carne: 'beef',
  cenoura: 'carrot',
  cebola: 'onion',
  chocolate: 'chocolate',
  couve: 'kale',
  creme: 'cream',
  ervilha: 'peas',
  espinafre: 'spinach',
  farinha: 'flour',
  'farinha de trigo': 'wheat flour',
  feijao: 'beans',
  'feijao branco': 'white beans',
  'feijao carioca': 'pinto beans',
  'feijao preto': 'black beans',
  frango: 'chicken',
  iogurte: 'yogurt',
  laranja: 'orange',
  leite: 'milk',
  lentilha: 'lentils',
  limao: 'lemon',
  linguica: 'sausage',
  maca: 'apple',
  macarrao: 'pasta',
  manteiga: 'butter',
  mandioca: 'cassava',
  milho: 'corn',
  morango: 'strawberry',
  ovo: 'egg',
  ovos: 'eggs',
  pao: 'bread',
  peixe: 'fish',
  pera: 'pear',
  pimentao: 'bell pepper',
  presunto: 'ham',
  queijo: 'cheese',
  repolho: 'cabbage',
  sal: 'salt',
  tomate: 'tomato',
  uva: 'grapes',
}

// Headers CORS permitem que o frontend aberto no navegador chame a função.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Cria respostas JSON sempre com os mesmos headers.
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

// Limpa, limita e remove ingredientes repetidos recebidos do frontend.
function normalizeIngredients(value: unknown) {
  // O corpo precisa conter um array. Outros tipos produzem uma lista vazia.
  if (!Array.isArray(value)) return []

  // Mantemos apenas strings, removemos espaços e descartamos nomes vazios.
  const names = value
    .filter((ingredient): ingredient is string => typeof ingredient === 'string')
    .map((ingredient) => ingredient.trim())
    .filter(Boolean)
    .map((ingredient) => {
      // Remove acentos apenas para localizar a chave do dicionário.
      const translationKey = ingredient
        .toLocaleLowerCase('pt-BR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')

      // Ingredientes ainda não mapeados continuam funcionando caso o usuário
      // já os tenha cadastrado em inglês.
      return INGREDIENT_TRANSLATIONS[translationKey] ?? ingredient
    })

  // Set remove duplicados e slice impede requisições excessivamente grandes.
  return [...new Set(names)].slice(0, MAX_INGREDIENTS)
}

// Garante que a quantidade de receitas fique entre 1 e o máximo permitido.
function normalizeLimit(value: unknown) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return DEFAULT_RECIPE_LIMIT

  return Math.min(
    Math.max(Math.trunc(numericValue), 1),
    MAX_RECIPE_LIMIT,
  )
}

// Converte o retorno externo para o contrato interno usado pelo recipe.js.
function normalizeRecipe(recipe: Record<string, unknown>) {
  return {
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    usedIngredientCount: recipe.usedIngredientCount ?? 0,
    missedIngredientCount: recipe.missedIngredientCount ?? 0,
    usedIngredients: recipe.usedIngredients ?? [],
    missedIngredients: recipe.missedIngredients ?? [],
    unusedIngredients: recipe.unusedIngredients ?? [],
  }
}

// Deno.serve cria o servidor HTTP executado pelo ambiente de Edge Functions.
Deno.serve(async (request) => {
  // O navegador envia OPTIONS antes do POST para validar o CORS.
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // A função aceita somente POST porque os dados chegam no corpo da requisição.
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405)
  }

  // A chave fica armazenada nos secrets do Supabase e só existe no servidor.
  const spoonacularApiKey = Deno.env.get('SPOONACULAR_API_KEY')

  // Não revelamos detalhes da chave quando ela estiver ausente.
  if (!spoonacularApiKey) {
    console.error('SPOONACULAR_API_KEY não foi configurada.')
    return jsonResponse(
      { error: 'O serviço de receitas não está configurado.' },
      500,
    )
  }

  try {
    // request.json transforma o JSON enviado pelo recipe.js em um objeto.
    const body = await request.json()
    const ingredients = normalizeIngredients(body?.ingredients)
    const limit = normalizeLimit(body?.limit)

    // Uma consulta sem ingredientes não teria utilidade para o usuário.
    if (ingredients.length === 0) {
      return jsonResponse(
        { error: 'Informe pelo menos um ingrediente.' },
        400,
      )
    }

    // URL e URLSearchParams cuidam da codificação segura dos parâmetros.
    const spoonacularUrl = new URL(SPOONACULAR_ENDPOINT)
    spoonacularUrl.searchParams.set('ingredients', ingredients.join(','))
    spoonacularUrl.searchParams.set('number', String(limit))
    spoonacularUrl.searchParams.set('ranking', '1')
    spoonacularUrl.searchParams.set('ignorePantry', 'true')

    // A chave é enviada no header e nunca retorna para o navegador.
    const spoonacularResponse = await fetch(spoonacularUrl, {
      headers: {
        Accept: 'application/json',
        'x-api-key': spoonacularApiKey,
      },
    })

    // Tentamos ler o JSON mesmo em erros para registrar um diagnóstico útil.
    const spoonacularData = await spoonacularResponse.json()

    if (!spoonacularResponse.ok) {
      console.error('Erro retornado pela Spoonacular.', {
        status: spoonacularResponse.status,
        response: spoonacularData,
      })

      // 429 indica excesso de chamadas; 402 costuma indicar cota esgotada.
      if (
        spoonacularResponse.status === 402 ||
        spoonacularResponse.status === 429
      ) {
        return jsonResponse(
          { error: 'A cota do serviço de receitas está indisponível.' },
          503,
        )
      }

      return jsonResponse(
        { error: 'A Spoonacular não conseguiu processar a consulta.' },
        502,
      )
    }

    // findByIngredients deve retornar diretamente um array de receitas.
    if (!Array.isArray(spoonacularData)) {
      console.error('Resposta inesperada da Spoonacular.', spoonacularData)
      return jsonResponse(
        { error: 'O serviço de receitas retornou uma resposta inválida.' },
        502,
      )
    }

    // map converte cada receita externa para o formato do Smart Pantry.
    const recipes = spoonacularData.map(normalizeRecipe)

    return jsonResponse({ recipes })
  } catch (error) {
    // Erros de JSON, rede ou programação são registrados apenas no servidor.
    console.error('Falha inesperada em recipe-suggestions.', error)

    return jsonResponse(
      { error: 'Não foi possível consultar as receitas.' },
      500,
    )
  }
})
