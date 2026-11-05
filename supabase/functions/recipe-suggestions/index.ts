// Globals disponibilizados pelo runtime Deno das Supabase Edge Functions.
declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

// Endpoint REST do Gemini (generateContent API v1beta — sem SDK, compatível com Deno).
const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Limites definidos pelo Smart Pantry para controlar tamanho da requisição.
const MAX_INGREDIENTS = 20
const DEFAULT_RECIPE_LIMIT = 6
const MAX_RECIPE_LIMIT = 12

// Mapeamento de categoria para imagem de alta qualidade do Unsplash.
// Usado porque o Gemini é um modelo de linguagem e não retorna fotos.
const CATEGORY_IMAGES: Record<string, string> = {
  frango:
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80',
  carne:
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
  peixe:
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80',
  massa:
    'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=400&q=80',
  arroz:
    'https://images.unsplash.com/photo-1536304993881-ff86e3c74d3b?w=400&q=80',
  salada:
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  sopa: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80',
  sobremesa:
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80',
  lanche:
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80',
  outros:
    'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&q=80',
}

// Categorias válidas aceitas pelo schema do Gemini.
const VALID_CATEGORIES = Object.keys(CATEGORY_IMAGES)

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
// Diferente da versão anterior, NÃO traduz para inglês — o Gemini entende PT-BR nativamente.
function normalizeIngredients(value: unknown) {
  if (!Array.isArray(value)) return []

  const names = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLocaleLowerCase('pt-BR'))

  return [...new Set(names)].slice(0, MAX_INGREDIENTS)
}

// Garante que a quantidade de receitas fique entre 1 e o máximo permitido.
function normalizeLimit(value: unknown) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return DEFAULT_RECIPE_LIMIT

  return Math.min(Math.max(Math.trunc(numericValue), 1), MAX_RECIPE_LIMIT)
}

// Define o schema JSON que o Gemini deve seguir ao gerar as receitas.
// Structured Output garante que o JSON retornado tenha sempre a mesma forma.
function buildRecipeSchema() {
  return {
    type: 'object',
    properties: {
      recipes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description:
                'Identificador único da receita (slug em português, sem espaços).',
            },
            title: {
              type: 'string',
              description: 'Nome da receita em português do Brasil.',
            },
            category: {
              type: 'string',
              enum: VALID_CATEGORIES,
              description:
                'Categoria que melhor representa o prato principal desta receita.',
            },
            readyInMinutes: {
              type: 'integer',
              description: 'Tempo total de preparo em minutos.',
            },
            servings: {
              type: 'integer',
              description: 'Número de porções que a receita rende.',
            },
            usedIngredients: {
              type: 'array',
              description:
                'Ingredientes que o usuário já possui e que serão usados nesta receita.',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Nome do ingrediente em português.',
                  },
                  amount: {
                    type: 'string',
                    description:
                      'Quantidade com unidade (ex: "2 xícaras", "300g", "1 unidade").',
                  },
                },
                required: ['name', 'amount'],
              },
            },
            missedIngredients: {
              type: 'array',
              description:
                'Ingredientes necessários que o usuário NÃO possui na dispensa.',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    description: 'Nome do ingrediente em português.',
                  },
                  amount: {
                    type: 'string',
                    description:
                      'Quantidade com unidade (ex: "2 colheres", "100ml").',
                  },
                },
                required: ['name', 'amount'],
              },
            },
            steps: {
              type: 'array',
              description:
                'Passos do modo de preparo em ordem, cada um como uma instrução completa e clara.',
              items: { type: 'string' },
            },
          },
          required: [
            'id',
            'title',
            'category',
            'readyInMinutes',
            'servings',
            'usedIngredients',
            'missedIngredients',
            'steps',
          ],
        },
      },
    },
    required: ['recipes'],
  }
}

// Monta o corpo da requisição para o endpoint generateContent do Gemini.
function buildGeminiRequest(ingredients: string[], limit: number) {
  const systemInstruction = `Você é um chef especialista em culinária caseira brasileira e combate ao desperdício de alimentos.
Suas receitas são práticas, saborosas, nutritivas e aproveitam ao máximo os ingredientes disponíveis.
REGRAS OBRIGATÓRIAS:
- Responda SEMPRE em português do Brasil (pt-BR), sem nenhuma palavra em inglês.
- Priorize os ingredientes fornecidos pelo usuário como base das receitas.
- Liste apenas ingredientes extras realmente necessários em missedIngredients.
- Os passos de preparo (steps) devem ser claros, detalhados e em ordem lógica.
- Gere receitas variadas: evite repetir o mesmo tipo de prato.
- Use ingredientes e técnicas típicas da culinária brasileira.`

  const userPrompt = `Ingredientes disponíveis na minha dispensa: ${ingredients.join(', ')}.

Sugira até ${limit} receitas variadas que aproveitem esses ingredientes ao máximo.
Priorize receitas que usem a maior parte dos ingredientes listados.
Para cada receita, forneça: nome, categoria, tempo de preparo, porções, ingredientes que já tenho, ingredientes que faltam comprar e o modo de preparo passo a passo.`

  return {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      response_schema: buildRecipeSchema(),
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  }
}

// Converte o retorno do Gemini para o contrato esperado pelo recipe.js.
// Adiciona a imagem por categoria e os campos de contagem usados pelos cards.
function normalizeGeminiRecipe(recipe: Record<string, unknown>) {
  const usedIngredients = Array.isArray(recipe.usedIngredients)
    ? recipe.usedIngredients
    : []
  const missedIngredients = Array.isArray(recipe.missedIngredients)
    ? recipe.missedIngredients
    : []
  const steps = Array.isArray(recipe.steps) ? recipe.steps : []

  const category =
    typeof recipe.category === 'string' && VALID_CATEGORIES.includes(recipe.category)
      ? recipe.category
      : 'outros'

  const readyInMinutes = Number(recipe.readyInMinutes ?? 0)
  const servings = Number(recipe.servings ?? 1)

  return {
    id: typeof recipe.id === 'string' ? recipe.id : String(Date.now()),
    title: typeof recipe.title === 'string' ? recipe.title : 'Receita sem nome',
    category,
    image: CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.outros,
    readyInMinutes,
    servings,
    time: readyInMinutes > 0 ? `${readyInMinutes} min` : 'Tempo não informado',
    usedIngredients,
    missedIngredients,
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missedIngredients.length,
    ingredients: `${usedIngredients.length} ingrediente${usedIngredients.length === 1 ? '' : 's'} da despensa`,
    steps,
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

  // A chave fica armazenada nos secrets do Supabase e nunca é exposta ao cliente.
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')

  if (!geminiApiKey) {
    console.error('GEMINI_API_KEY não foi configurada nos secrets do Supabase.')
    return jsonResponse(
      { error: 'O serviço de receitas não está configurado.' },
      500,
    )
  }

  try {
    const body = await request.json()

    // Normaliza e valida a lista de ingredientes enviada pelo frontend.
    const ingredients = normalizeIngredients(body?.ingredients)
    const limit = normalizeLimit(body?.limit)

    // Uma consulta sem ingredientes não teria utilidade para o usuário.
    if (ingredients.length === 0) {
      return jsonResponse(
        { error: 'Informe pelo menos um ingrediente.' },
        400,
      )
    }

    // Monta a requisição e chama o endpoint REST do Gemini.
    const geminiRequest = buildGeminiRequest(ingredients, limit)

    const geminiResponse = await fetch(
      `${GEMINI_ENDPOINT}?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest),
      },
    )

    // Lemos o JSON mesmo em caso de erro para registrar um diagnóstico útil.
    const geminiData = await geminiResponse.json()

    if (!geminiResponse.ok) {
      console.error('Erro retornado pela API do Gemini.', {
        status: geminiResponse.status,
        response: geminiData,
      })

      // 429 = rate limit; 403 = chave inválida ou cota excedida.
      if (geminiResponse.status === 429 || geminiResponse.status === 403) {
        return jsonResponse(
          { error: 'O serviço de receitas está temporariamente indisponível. Tente novamente em instantes.' },
          503,
        )
      }

      return jsonResponse(
        { error: 'Não foi possível gerar sugestões de receitas.' },
        502,
      )
    }

    // O Gemini retorna o JSON gerado dentro de candidates[0].content.parts[0].text.
    // Com response_mime_type: "application/json", o texto já é JSON válido.
    const rawText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    if (!rawText) {
      console.error('Resposta vazia ou inesperada do Gemini.', geminiData)
      return jsonResponse(
        { error: 'O modelo não retornou receitas. Tente novamente.' },
        502,
      )
    }

    // Fazemos parse do JSON retornado pelo Gemini (Structured Output garante que seja válido).
    let parsed: { recipes?: unknown[] }
    try {
      parsed = JSON.parse(rawText)
    } catch (parseError) {
      console.error('Falha ao fazer parse do JSON retornado pelo Gemini.', {
        rawText,
        parseError,
      })
      return jsonResponse(
        { error: 'O modelo retornou uma resposta em formato inválido.' },
        502,
      )
    }

    if (!Array.isArray(parsed?.recipes)) {
      console.error('O Gemini não retornou um array de receitas.', parsed)
      return jsonResponse(
        { error: 'O serviço de receitas retornou uma resposta inválida.' },
        502,
      )
    }

    // Converte cada receita para o formato interno do Smart Pantry.
    const recipes = (parsed.recipes as Record<string, unknown>[]).map(
      normalizeGeminiRecipe,
    )

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
