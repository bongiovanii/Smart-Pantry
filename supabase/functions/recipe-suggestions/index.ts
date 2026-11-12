// Globals disponibilizados pelo runtime Deno das Supabase Edge Functions.
declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

// Modelo usado para gerar as receitas. O gemini-2.0-flash foi desligado
// pela Google em 01/06/2026. O 3.1 Flash-Lite é o modelo estável mais
// econômico disponível para o projeto.
// Pode ser sobrescrito pelo secret GEMINI_MODEL sem precisar alterar o código.
const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite'

// Quando o modelo principal está sobrecarregado, a Google responde 429/5xx.
// Tentamos modelos alternativos antes de devolver erro ao aplicativo.
const DEFAULT_GEMINI_FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
]

// Formato mínimo consumido da resposta do Gemini.
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  error?: { message?: string }
}

// Endpoint REST do Gemini (generateContent API v1beta — sem SDK, compatível com Deno).
function buildGeminiEndpoint(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

// O Gemini pode responder 429/5xx em picos temporários de demanda.
// Tentamos novamente com uma pequena espera antes de devolver erro ao app.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
// 404 também permite tentar outro modelo quando o nome não existe na conta.
const MODEL_FALLBACK_STATUS = new Set([404, ...RETRYABLE_STATUS])
const MAX_GEMINI_ATTEMPTS = 2

// Monta a lista de modelos na ordem de preferência:
// 1. GEMINI_MODEL (secret) ou o padrão;
// 2. GEMINI_FALLBACK_MODELS (secret opcional, separado por vírgulas);
// 3. fallbacks padrão do projeto.
function getGeminiModels() {
  const primary =
    Deno.env.get('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL
  const configuredFallbacks = (
    Deno.env.get('GEMINI_FALLBACK_MODELS') ?? ''
  )
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)

  return [
    ...new Set([
      primary,
      ...configuredFallbacks,
      ...DEFAULT_GEMINI_FALLBACK_MODELS,
    ]),
  ]
}

async function fetchGeminiWithRetry(
  model: string,
  apiKey: string,
  payload: unknown,
) {
  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    const response = await fetch(buildGeminiEndpoint(model), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // A chave vai no header (e não na URL) para não aparecer em logs.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    let data: GeminiResponse | null = null

    try {
      data = (await response.json()) as GeminiResponse
    } catch {
      // Alguns erros de gateway vêm sem corpo JSON. O status ainda permite
      // decidir entre repetir ou tentar outro modelo.
      data = null
    }

    if (!RETRYABLE_STATUS.has(response.status) || attempt === MAX_GEMINI_ATTEMPTS) {
      return { response, data }
    }

    console.warn('Gemini indisponível; tentando novamente.', {
      model,
      status: response.status,
      attempt,
    })

    await new Promise((resolve) => setTimeout(resolve, 800 * attempt))
  }

  throw new Error('Não foi possível concluir a chamada ao Gemini.')
}

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

// ============================================================
// Imagens reais das receitas (Wikimedia Commons + Supabase Storage)
// ============================================================

const WIKIMEDIA_COMMONS_ENDPOINT = 'https://commons.wikimedia.org/w/api.php'
const WIKIMEDIA_USER_AGENT =
  'SmartPantryTCC/1.0 (https://github.com/bongiovanii/Smart-Pantry; projeto educacional)'
const RECIPE_IMAGE_BUCKET = 'recipe-images'
const IMAGE_CACHE_TTL_DAYS = 30
const IMAGE_FETCH_TIMEOUT_MS = 15000
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

// Consultas de fallback quando o Gemini não informar uma imageQuery útil.
const CATEGORY_IMAGE_QUERIES: Record<string, string> = {
  frango: 'frango assado brasileiro',
  carne: 'carne bovina brasileira',
  peixe: 'peixe assado',
  massa: 'macarrão brasileiro',
  arroz: 'arroz brasileiro',
  salada: 'salada brasileira',
  sopa: 'sopa brasileira',
  sobremesa: 'sobremesa brasileira',
  lanche: 'lanche brasileiro',
  outros: 'culinária brasileira',
}

type CommonsImage = {
  imageUrl: string
  mime: string
  pageId: number
  title: string
  sourcePageUrl: string
  author: string
  license: string
  licenseUrl: string
}

type ResolvedRecipeImage = {
  image: string
  imageQuery: string
  imageAuthor: string
  imageLicense: string
  imageLicenseUrl: string
  imageSourceUrl: string
  imageSource: string
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16)),
    )
}

// O Wikimedia Commons devolve autor e licença com HTML; removemos as tags
// antes de enviar ao frontend para evitar markup inesperado nos cards.
function stripHtml(value: unknown) {
  if (typeof value !== 'string') return ''
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function slugify(value: string) {
  const slug = stripAccents(value)
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return slug || 'imagem'
}

function buildImageCacheKey(query: string) {
  return stripAccents(query)
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeImageQuery(value: unknown, category: string) {
  const fallback =
    CATEGORY_IMAGE_QUERIES[category] ?? CATEGORY_IMAGE_QUERIES.outros

  if (typeof value !== 'string') return fallback

  const cleaned = value
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned ? cleaned.slice(0, 80) : fallback
}

function isAllowedLicense(license: string) {
  if (!license) return true

  const value = license.toLocaleLowerCase('en')

  return (
    value.startsWith('cc0') ||
    value.startsWith('public domain') ||
    value.startsWith('gfdl') ||
    (value.startsWith('cc by') &&
      !value.includes('-nc') &&
      !value.includes('-nd'))
  )
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function getSupabaseServiceConfig() {
  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!url || !serviceRoleKey) return null

  return {
    url: url.replace(/\/$/, ''),
    serviceRoleKey,
  }
}

async function getCachedRecipeImage(cacheKey: string) {
  const config = getSupabaseServiceConfig()
  if (!config) return null

  try {
    const url =
      `${config.url}/rest/v1/recipe_image_cache` +
      `?select=*&query=eq.${encodeURIComponent(cacheKey)}&limit=1`

    const response = await fetchWithTimeout(url, {
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
      },
    })

    if (!response.ok) return null

    const rows = await response.json()
    if (!Array.isArray(rows) || rows.length === 0) return null

    const row = rows[0]
    const updatedAt = Date.parse(row.updated_at ?? row.created_at ?? '')

    if (Number.isFinite(updatedAt)) {
      const ageDays = (Date.now() - updatedAt) / 86_400_000
      if (ageDays > IMAGE_CACHE_TTL_DAYS) return null
    }

    return row
  } catch (error) {
    console.warn('Falha ao consultar o cache de imagens.', {
      cacheKey,
      error,
    })
    return null
  }
}

async function saveCachedRecipeImage(row: Record<string, unknown>) {
  const config = getSupabaseServiceConfig()
  if (!config) return

  try {
    const response = await fetchWithTimeout(
      `${config.url}/rest/v1/recipe_image_cache?on_conflict=query`,
      {
        method: 'POST',
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify([row]),
      },
    )

    if (!response.ok) {
      console.warn('Não foi possível salvar o cache de imagens.', {
        status: response.status,
        body: await response.text(),
      })
    }
  } catch (error) {
    console.warn('Falha ao salvar o cache de imagens.', error)
  }
}

async function uploadRecipeImage(
  storagePath: string,
  bytes: ArrayBuffer,
  contentType: string,
) {
  const config = getSupabaseServiceConfig()

  if (!config) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não está disponível.')
  }

  const response = await fetchWithTimeout(
    `${config.url}/storage/v1/object/${RECIPE_IMAGE_BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body: bytes,
    },
  )

  if (!response.ok) {
    throw new Error(
      `Falha no upload da imagem (${response.status}): ${await response.text()}`,
    )
  }

  return `${config.url}/storage/v1/object/public/${RECIPE_IMAGE_BUCKET}/${storagePath}`
}

async function searchCommonsImage(query: string) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '8',
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '800',
  })

  const response = await fetchWithTimeout(
    `${WIKIMEDIA_COMMONS_ENDPOINT}?${params}`,
    {
      headers: {
        'User-Agent': WIKIMEDIA_USER_AGENT,
        Accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Wikimedia Commons retornou ${response.status}.`)
  }

  const data = await response.json()
  const pages = data?.query?.pages

  if (!pages || typeof pages !== 'object') return null

  const candidates = Object.values(pages).sort(
    (a: any, b: any) => (a.index ?? 0) - (b.index ?? 0),
  )

  for (const page of candidates as any[]) {
    const info = page?.imageinfo?.[0]
    if (!info) continue

    const mime = typeof info.mime === 'string' ? info.mime : ''
    if (!/^image\/(jpeg|png|webp)$/i.test(mime)) continue

    const metadata = info.extmetadata ?? {}
    const license = stripHtml(metadata?.LicenseShortName?.value ?? '')

    if (!isAllowedLicense(license)) continue

    const imageUrl = info.thumburl || info.url
    if (typeof imageUrl !== 'string' || !imageUrl) continue

    return {
      imageUrl,
      mime,
      pageId: Number(page.pageid) || 0,
      title: String(page.title ?? ''),
      sourcePageUrl: String(info.descriptionurl ?? ''),
      author: stripHtml(
        metadata?.Artist?.value ?? metadata?.Credit?.value ?? '',
      ),
      license: license || 'Wikimedia Commons',
      licenseUrl: stripHtml(metadata?.LicenseUrl?.value ?? ''),
    } satisfies CommonsImage
  }

  return null
}

async function downloadAndStoreCommonsImage(
  candidate: CommonsImage,
  cacheKey: string,
) {
  const response = await fetchWithTimeout(candidate.imageUrl, {
    headers: {
      'User-Agent': WIKIMEDIA_USER_AGENT,
      Accept: 'image/*',
    },
  })

  if (!response.ok) {
    throw new Error(`Falha ao baixar a imagem (${response.status}).`)
  }

  const contentType =
    response.headers.get('content-type') ?? candidate.mime

  if (!contentType.toLocaleLowerCase('en').startsWith('image/')) {
    throw new Error(`Tipo de imagem não suportado: ${contentType}`)
  }

  const bytes = await response.arrayBuffer()

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error(`Tamanho de imagem inválido: ${bytes.byteLength} bytes.`)
  }

  const extension = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : 'jpg'

  const storagePath =
    `recipes/${slugify(cacheKey)}-${candidate.pageId}.${extension}`

  const publicUrl = await uploadRecipeImage(
    storagePath,
    bytes,
    contentType.split(';')[0],
  )

  return { publicUrl, storagePath }
}

async function resolveRecipeImage(
  recipe: Record<string, unknown>,
): Promise<ResolvedRecipeImage> {
  const category =
    typeof recipe.category === 'string' ? recipe.category : 'outros'
  const query = normalizeImageQuery(
    recipe.imageQuery ?? recipe.title,
    category,
  )
  const cacheKey = buildImageCacheKey(query)
  const fallbackImage = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.outros

  try {
    const cached = await getCachedRecipeImage(cacheKey)

    if (cached?.image_url) {
      return {
        image: cached.image_url,
        imageQuery: query,
        imageAuthor: cached.author ?? '',
        imageLicense: cached.license ?? '',
        imageLicenseUrl: cached.license_url ?? '',
        imageSourceUrl: cached.source_page_url ?? '',
        imageSource: cached.source ?? 'wikimedia-commons',
      }
    }

    const candidate = await searchCommonsImage(query)

    if (!candidate) {
      throw new Error(
        'Nenhuma imagem compatível encontrada no Wikimedia Commons.',
      )
    }

    const stored = await downloadAndStoreCommonsImage(candidate, cacheKey)

    await saveCachedRecipeImage({
      query: cacheKey,
      image_url: stored.publicUrl,
      storage_path: stored.storagePath,
      source_page_url: candidate.sourcePageUrl,
      author: candidate.author,
      license: candidate.license,
      license_url: candidate.licenseUrl,
      source: 'wikimedia-commons',
      updated_at: new Date().toISOString(),
    })

    return {
      image: stored.publicUrl,
      imageQuery: query,
      imageAuthor: candidate.author,
      imageLicense: candidate.license,
      imageLicenseUrl: candidate.licenseUrl,
      imageSourceUrl: candidate.sourcePageUrl,
      imageSource: 'wikimedia-commons',
    }
  } catch (error) {
    console.warn('Usando imagem de fallback para a receita.', {
      query,
      category,
      error,
    })

    return {
      image: fallbackImage,
      imageQuery: query,
      imageAuthor: '',
      imageLicense: '',
      imageLicenseUrl: '',
      imageSourceUrl: '',
      imageSource: 'unsplash-fallback',
    }
  }
}

async function enrichRecipesWithImages(
  recipes: Record<string, unknown>[],
) {
  return Promise.all(
    recipes.map(async (recipe) => ({
      ...recipe,
      ...(await resolveRecipeImage(recipe)),
    })),
  )
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
            imageQuery: {
              type: 'string',
              description:
                'Consulta curta (2 a 5 palavras) com o nome popular do prato em português, usada para buscar uma foto real no Wikimedia Commons. Ex.: "feijoada", "pão de queijo", "arroz carreteiro".',
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
            caloriesPerServing: {
              type: 'integer',
              description:
                'Estimativa de calorias por porção, em kcal, calculada a partir dos ingredientes e das quantidades da receita.',
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
            'imageQuery',
            'category',
            'readyInMinutes',
            'servings',
            'caloriesPerServing',
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
- Use ingredientes e técnicas típicas da culinária brasileira.
- Para cada receita, informe imageQuery com o nome popular do prato em 2 a 5 palavras (ex.: "feijoada", "pão de queijo", "arroz carreteiro"), para busca de foto real.
- Estime as calorias por porção (caloriesPerServing) em kcal, de forma coerente com os ingredientes e as quantidades informadas. Use um número inteiro e não invente precisão nutricional.`

  const userPrompt = `Ingredientes disponíveis na minha dispensa: ${ingredients.join(', ')}.

Sugira até ${limit} receitas variadas que aproveitem esses ingredientes ao máximo.
Priorize receitas que usem a maior parte dos ingredientes listados.
Para cada receita, forneça: nome, imageQuery do prato, categoria, tempo de preparo, porções, calorias estimadas por porção, ingredientes que já tenho, ingredientes que faltam comprar e o modo de preparo passo a passo.`

  return {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: buildRecipeSchema(),
      temperature: 0.7,
      // Receitas completas com passos podem ser longas; 4096 truncava o JSON.
      maxOutputTokens: 8192,
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
  const caloriesPerServing = Number(recipe.caloriesPerServing ?? 0)
  const title =
    typeof recipe.title === 'string' ? recipe.title : 'Receita sem nome'

  return {
    id: typeof recipe.id === 'string' ? recipe.id : String(Date.now()),
    title,
    imageQuery:
      typeof recipe.imageQuery === 'string' && recipe.imageQuery.trim()
        ? recipe.imageQuery.trim()
        : title,
    category,
    // A imagem inicial é o fallback por categoria. Se a busca no Wikimedia
    // Commons funcionar, enrichRecipesWithImages substitui este valor.
    image: CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.outros,
    readyInMinutes,
    servings,
    // Estimativa nutricional em kcal por porção. Zero indica que o modelo não
    // informou o valor, e a interface simplesmente oculta o campo.
    caloriesPerServing:
      Number.isFinite(caloriesPerServing) && caloriesPerServing > 0
        ? Math.min(Math.round(caloriesPerServing), 5000)
        : 0,
    time: readyInMinutes > 0 ? `${readyInMinutes} min` : 'Tempo não informado',
    usedIngredients,
    missedIngredients,
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missedIngredients.length,
    ingredients: `${usedIngredients.length} ingrediente${usedIngredients.length === 1 ? '' : 's'} da despensa`,
    steps,
  }
}

// ============================================================
// Biblioteca de receitas e geração cache-first (Fase 7)
// ============================================================

const DAILY_GENERATION_LIMIT = 10
const CACHE_MIN_OVERLAP = 2

type SupabaseUserConfig = {
  url: string
  anonKey: string
}

type AuthenticatedUser = {
  id: string
  token: string
  config: SupabaseUserConfig
}

function getSupabaseUserConfig(): SupabaseUserConfig | null {
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!url || !anonKey) return null

  return { url: url.replace(/\/$/, ''), anonKey }
}

function getBearerToken(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  if (!header.toLocaleLowerCase('en').startsWith('bearer ')) return ''
  return header.slice(7).trim()
}

async function getAuthenticatedUser(
  request: Request,
): Promise<AuthenticatedUser | null> {
  const config = getSupabaseUserConfig()
  if (!config) return null

  const token = getBearerToken(request)
  if (!token) return null

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) return null

    const user = await response.json()
    if (!user?.id) return null

    return { id: String(user.id), token, config }
  } catch (error) {
    console.warn('Falha ao validar a sessão do usuário.', error)
    return null
  }
}

async function userRestRequest(
  user: AuthenticatedUser,
  path: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {},
) {
  return fetch(`${user.config.url}/rest/v1/${path}`, {
    method: options.method ?? 'GET',
    headers: {
      apikey: user.config.anonKey,
      Authorization: `Bearer ${user.token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

async function findCachedRecipes(
  user: AuthenticatedUser,
  ingredients: string[],
  limit: number,
) {
  try {
    const response = await userRestRequest(
      user,
      'rpc/find_recipes_for_pantry',
      {
        method: 'POST',
        body: { p_ingredients: ingredients, p_limit: limit },
      },
    )

    if (!response.ok) {
      console.warn('Não foi possível consultar o cache de receitas.', {
        status: response.status,
        body: await response.text(),
      })
      return []
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.warn('Falha ao consultar o cache de receitas.', error)
    return []
  }
}

function getStartOfDayInBrazil() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00-03:00`,
  )
}

async function countGenerationsToday(user: AuthenticatedUser) {
  try {
    const params = new URLSearchParams({
      select: 'id',
      user_id: `eq.${user.id}`,
      generated_at: `gte.${getStartOfDayInBrazil().toISOString()}`,
    })

    const response = await userRestRequest(
      user,
      `recipe_generations?${params.toString()}`,
    )

    if (!response.ok) return 0

    const rows = await response.json()
    return Array.isArray(rows) ? rows.length : 0
  } catch (error) {
    console.warn('Falha ao contar as gerações do dia.', error)
    return 0
  }
}

async function recordGeneration(
  user: AuthenticatedUser,
  payload: {
    requestedCount: number
    generatedCount: number
    cacheHits: number
    source: 'ai' | 'cache' | 'mixed'
  },
) {
  try {
    const response = await userRestRequest(user, 'recipe_generations', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: [
        {
          user_id: user.id,
          requested_count: payload.requestedCount,
          generated_count: payload.generatedCount,
          cache_hits: payload.cacheHits,
          source: payload.source,
        },
      ],
    })

    if (!response.ok) {
      console.warn('Não foi possível registrar a geração de receitas.', {
        status: response.status,
        body: await response.text(),
      })
    }
  } catch (error) {
    console.warn('Falha ao registrar a geração de receitas.', error)
  }
}

function normalizeRecipeText(value: unknown) {
  return stripAccents(String(value ?? ''))
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singularizeIngredientWord(word: string) {
  if (word.length <= 3) return word
  if (word.endsWith('oes') || word.endsWith('aes')) {
    return `${word.slice(0, -3)}ao`
  }
  if (word.endsWith('eis')) return `${word.slice(0, -3)}el`
  if (word.endsWith('ais')) return `${word.slice(0, -3)}al`
  if (word.endsWith('is')) return `${word.slice(0, -2)}il`
  if (word.endsWith('ns')) return `${word.slice(0, -2)}m`
  if (word.endsWith('s')) return word.slice(0, -1)
  return word
}

function normalizeIngredientName(value: unknown) {
  return normalizeRecipeText(value)
    .split(' ')
    .filter(Boolean)
    .map(singularizeIngredientWord)
    .join(' ')
}

function buildIngredientNames(recipe: Record<string, unknown>) {
  const usedIngredients = Array.isArray(recipe.usedIngredients)
    ? recipe.usedIngredients
    : []

  const names = usedIngredients
    .map((ingredient) => {
      if (typeof ingredient === 'string') return ingredient
      if (ingredient && typeof ingredient === 'object') {
        return String((ingredient as { name?: unknown }).name ?? '')
      }
      return ''
    })
    .map(normalizeIngredientName)
    .filter(Boolean)

  return [...new Set(names)]
}

function selectCacheMatches(
  rows: Record<string, unknown>[],
  ingredients: string[],
  limit: number,
) {
  const pantryNames = new Set(ingredients.map(normalizeIngredientName))
  const minOverlap = Math.min(CACHE_MIN_OVERLAP, pantryNames.size)

  return rows
    .filter((row) => {
      const names = Array.isArray(row.ingredient_names)
        ? row.ingredient_names.map(String)
        : []
      const overlap = names.filter((name) => pantryNames.has(name)).length
      return overlap >= minOverlap
    })
    .slice(0, limit)
}

function mapStoredRecipe(row: Record<string, unknown>, origin = 'library') {
  const usedIngredients = Array.isArray(row.used_ingredients)
    ? row.used_ingredients
    : []
  const missedIngredients = Array.isArray(row.missed_ingredients)
    ? row.missed_ingredients
    : []
  const steps = Array.isArray(row.steps) ? row.steps : []
  const category =
    typeof row.category === 'string' ? row.category : 'outros'
  const readyInMinutes = Number(row.ready_in_minutes ?? 0)
  const servings = Number(row.servings ?? 0)
  const caloriesPerServing = Number(row.calories_per_serving ?? 0)

  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? 'Receita sem nome'),
    image:
      typeof row.image === 'string' && row.image
        ? row.image
        : CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES.outros,
    category,
    readyInMinutes,
    servings,
    caloriesPerServing,
    time:
      readyInMinutes > 0
        ? `${readyInMinutes} min`
        : 'Tempo não informado',
    usedIngredients,
    missedIngredients,
    usedIngredientCount: usedIngredients.length,
    missedIngredientCount: missedIngredients.length,
    ingredients: `${usedIngredients.length} ingrediente${usedIngredients.length === 1 ? '' : 's'} da despensa`,
    steps,
    imageQuery: String(row.image_query ?? ''),
    imageSource: String(row.image_source ?? ''),
    imageAuthor: String(row.image_author ?? ''),
    imageLicense: String(row.image_license ?? ''),
    imageLicenseUrl: String(row.image_license_url ?? ''),
    imageSourceUrl: String(row.image_source_url ?? ''),
    origin,
  }
}

async function persistRecipes(
  user: AuthenticatedUser,
  recipes: Record<string, unknown>[],
) {
  if (recipes.length === 0) return []

  // O upsert não pode receber o mesmo título duas vezes na mesma instrução
  // (`ON CONFLICT DO UPDATE` afetaria a mesma linha em duplicidade). Por isso,
  // o lote é deduplicado antes do envio, mantendo a primeira ocorrência.
  const rowsByTitle = new Map<string, Record<string, unknown>>()

  for (const recipe of recipes) {
    const title = String(recipe.title ?? 'Receita sem nome')
    const titleNormalized = normalizeRecipeText(title)

    if (!titleNormalized || rowsByTitle.has(titleNormalized)) continue

    rowsByTitle.set(titleNormalized, {
      user_id: user.id,
      title,
      title_normalized: titleNormalized,
      category: String(recipe.category ?? 'outros'),
      image: recipe.image ? String(recipe.image) : null,
      image_query: recipe.imageQuery ? String(recipe.imageQuery) : null,
      image_source: recipe.imageSource ? String(recipe.imageSource) : null,
      image_author: recipe.imageAuthor ? String(recipe.imageAuthor) : null,
      image_license: recipe.imageLicense ? String(recipe.imageLicense) : null,
      image_license_url: recipe.imageLicenseUrl
        ? String(recipe.imageLicenseUrl)
        : null,
      image_source_url: recipe.imageSourceUrl
        ? String(recipe.imageSourceUrl)
        : null,
      ready_in_minutes: Number(recipe.readyInMinutes ?? 0),
      servings: Number(recipe.servings ?? 0),
      calories_per_serving: Number(recipe.caloriesPerServing ?? 0),
      used_ingredients: Array.isArray(recipe.usedIngredients)
        ? recipe.usedIngredients
        : [],
      missed_ingredients: Array.isArray(recipe.missedIngredients)
        ? recipe.missedIngredients
        : [],
      steps: Array.isArray(recipe.steps) ? recipe.steps : [],
      ingredient_names: buildIngredientNames(recipe),
    })
  }

  const rows = [...rowsByTitle.values()]
  if (rows.length === 0) return []

  const response = await userRestRequest(
    user,
    'recipes?on_conflict=user_id,title_normalized&select=*',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: rows,
    },
  )

  if (!response.ok) {
    throw new Error(
      `Falha ao salvar receitas na biblioteca (${response.status}): ${await response.text()}`,
    )
  }

  const savedRows = await response.json()
  if (!Array.isArray(savedRows)) return []

  const byTitle = new Map(
    savedRows.map((row: Record<string, unknown>) => [
      String(row.title_normalized ?? ''),
      row,
    ]),
  )

  return [...rowsByTitle.keys()]
    .map((titleNormalized) => byTitle.get(titleNormalized))
    .filter(Boolean) as Record<string, unknown>[]
}

function mergeRecipeLists(...lists: Record<string, unknown>[][]) {
  const byTitle = new Map<string, Record<string, unknown>>()

  for (const recipe of lists.flat()) {
    const key = normalizeRecipeText(recipe.title)
    if (key && !byTitle.has(key)) byTitle.set(key, recipe)
  }

  return [...byTitle.values()]
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

  if (!getSupabaseUserConfig()) {
    console.error('SUPABASE_URL ou SUPABASE_ANON_KEY não estão disponíveis.')
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

    // A biblioteca é por usuário: sem sessão não há como consultar nem salvar.
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return jsonResponse(
        { error: 'Entre com sua conta Google para consultar receitas.' },
        401,
      )
    }

    // 1. Cache-first: consulta a biblioteca antes de chamar o Gemini.
    // Os nomes são normalizados para casar com `ingredient_names` no banco.
    const normalizedIngredients = ingredients.map(normalizeIngredientName)
    const cachedRows = await findCachedRecipes(
      user,
      normalizedIngredients,
      limit,
    )
    const cachedRecipes = selectCacheMatches(
      cachedRows,
      normalizedIngredients,
      limit,
    ).map((row) => mapStoredRecipe(row, 'library'))

    const generationsToday = await countGenerationsToday(user)
    const remainingGenerationsToday = Math.max(
      0,
      DAILY_GENERATION_LIMIT - generationsToday,
    )

    // A biblioteca já cobre a quantidade pedida: nenhum token é gasto.
    if (cachedRecipes.length >= limit) {
      return jsonResponse({
        recipes: cachedRecipes,
        source: 'cache',
        cacheHits: cachedRecipes.length,
        generated: 0,
        remainingGenerationsToday,
        limitReached: false,
      })
    }

    if (remainingGenerationsToday <= 0) {
      // Sem cota, ainda entregamos o que a biblioteca tiver.
      if (cachedRecipes.length > 0) {
        return jsonResponse({
          recipes: cachedRecipes,
          source: 'cache',
          cacheHits: cachedRecipes.length,
          generated: 0,
          remainingGenerationsToday: 0,
          limitReached: true,
        })
      }

      return jsonResponse(
        {
          error:
            'Você atingiu o limite de 10 gerações de receitas por dia. Sua biblioteca continua disponível em “Descobrir mais receitas”.',
          remainingGenerationsToday: 0,
        },
        429,
      )
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    const geminiModels = getGeminiModels()

    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY não foi configurada nos secrets do Supabase.')
      return jsonResponse(
        { error: 'O serviço de receitas não está configurado.' },
        500,
      )
    }

    // 2. Gera apenas a diferença que a biblioteca não cobriu.
    const missingCount = limit - cachedRecipes.length
    const geminiRequest = buildGeminiRequest(ingredients, missingCount)

    // Tenta o modelo principal e, em caso de sobrecarga ou indisponibilidade,
    // tenta os modelos de fallback antes de devolver erro ao aplicativo.
    let geminiResponse: Response | null = null
    let geminiData: GeminiResponse | null = null
    let geminiModel = geminiModels[0]

    for (const model of geminiModels) {
      geminiModel = model
      const result = await fetchGeminiWithRetry(
        model,
        geminiApiKey,
        geminiRequest,
      )

      geminiResponse = result.response
      geminiData = result.data

      if (geminiResponse.ok) break

      console.error('Erro retornado pela API do Gemini.', {
        status: geminiResponse.status,
        model,
        response: geminiData,
      })

      // Erros de requisição ou de credencial não melhoram ao trocar de modelo.
      if (!MODEL_FALLBACK_STATUS.has(geminiResponse.status)) break
    }

    if (!geminiResponse?.ok) {
      const upstreamStatus = geminiResponse?.status ?? 0
      const upstreamMessage =
        geminiData?.error?.message ?? 'Erro não detalhado pelo Gemini.'

      console.error('Todas as tentativas de geração falharam.', {
        models: geminiModels,
        status: upstreamStatus,
        response: geminiData,
      })

      if (MODEL_FALLBACK_STATUS.has(upstreamStatus)) {
        return jsonResponse(
          {
            error:
              'O serviço de receitas está temporariamente sobrecarregado. Tente novamente em alguns instantes.',
          },
          503,
        )
      }

      return jsonResponse(
        {
          error: 'Não foi possível gerar sugestões de receitas.',
          upstreamStatus,
          // Ajuda a diagnosticar configuração/modelo sem expor a chave.
          detail: upstreamMessage,
        },
        502,
      )
    }

    if (geminiModel !== geminiModels[0]) {
      console.warn('Modelo principal indisponível; fallback utilizado.', {
        model: geminiModel,
      })
    }

    // O Gemini retorna o JSON gerado dentro de candidates[0].content.parts[].text.
    // Com responseMimeType: "application/json", o texto já é JSON válido.
    const rawText = (geminiData?.candidates?.[0]?.content?.parts ?? [])
      .map((part: { text?: string }) => part.text ?? '')
      .join('')

    if (!rawText) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason
      console.error('Resposta vazia ou inesperada do Gemini.', {
        finishReason,
        response: geminiData,
      })
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
    const normalizedRecipes = (parsed.recipes as Record<string, unknown>[]).map(
      normalizeGeminiRecipe,
    )

    // Busca fotos reais no Wikimedia Commons e armazena no Supabase Storage.
    // Se qualquer imagem falhar, a receita mantém o fallback por categoria.
    const enrichedRecipes = await enrichRecipesWithImages(normalizedRecipes)

    // Persiste as receitas na biblioteca para as próximas consultas e para as
    // fases seguintes (favoritas, planejamento, lista de compras e chat).
    let persistedRecipes: Record<string, unknown>[] = []

    try {
      persistedRecipes = await persistRecipes(user, enrichedRecipes)
    } catch (persistError) {
      console.error(
        'Não foi possível persistir as receitas geradas.',
        persistError,
      )
    }

    const generatedRecipes =
      persistedRecipes.length > 0
        ? persistedRecipes.map((row) => mapStoredRecipe(row, 'ai'))
        : enrichedRecipes.map((recipe) => ({ ...recipe, origin: 'ai' }))

    const combinedRecipes = mergeRecipeLists(
      cachedRecipes,
      generatedRecipes,
    ).slice(0, limit)

    await recordGeneration(user, {
      requestedCount: limit,
      generatedCount: generatedRecipes.length,
      cacheHits: cachedRecipes.length,
      source: cachedRecipes.length > 0 ? 'mixed' : 'ai',
    })

    return jsonResponse({
      recipes: combinedRecipes,
      source: cachedRecipes.length > 0 ? 'mixed' : 'ai',
      cacheHits: cachedRecipes.length,
      generated: generatedRecipes.length,
      remainingGenerationsToday: Math.max(0, remainingGenerationsToday - 1),
      limitReached: false,
    })
  } catch (error) {
    // Erros de JSON, rede ou programação são registrados apenas no servidor.
    console.error('Falha inesperada em recipe-suggestions.', error)

    return jsonResponse(
      { error: 'Não foi possível consultar as receitas.' },
      500,
    )
  }
})
