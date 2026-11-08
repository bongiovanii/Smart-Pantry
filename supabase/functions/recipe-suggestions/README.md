# Edge Function `recipe-suggestions`

Esta função recebe nomes de ingredientes do frontend, consulta a API Gemini
(Google AI Studio) e devolve receitas normalizadas em PT-BR, sem expor a chave
da API no navegador.

## Secrets obrigatórios

Cadastre as chaves no projeto remoto:

```powershell
npx supabase secrets set GEMINI_API_KEY="SUA_CHAVE"
```

Opcionalmente, é possível trocar o modelo sem alterar o código:

```powershell
npx supabase secrets set GEMINI_MODEL="gemini-3.1-flash-lite"
```

O modelo padrão é `gemini-3.1-flash-lite`, o mais econômico disponível para
geração de receitas estruturadas em JSON. O `gemini-2.0-flash` usado
anteriormente foi desligado pela Google em 01/06/2026.

Também é possível cadastrar os secrets pelo painel em **Edge Functions >
Secrets**.

## Sobrecarga do Gemini e fallback entre modelos

Em picos de demanda a Google responde com erros temporários, por exemplo:

```text
This model is currently experiencing high demand. Spikes in demand are
usually temporary. Please try again later.
```

Antes, esse caso era convertido em `HTTP 502` e o aplicativo exibia um erro
genérico. Agora a função:

1. repete a chamada até 2 vezes no mesmo modelo, com espera progressiva;
2. se o erro persistir (`429`, `500`, `502`, `503`, `504` ou `404`), tenta os
   modelos de fallback em sequência;
3. se todos falharem por sobrecarga, responde `HTTP 503` com uma mensagem
   amigável;
4. só responde `502` para erros não temporários, como requisição inválida ou
   configuração incorreta.

A ordem de preferência é:

1. `GEMINI_MODEL` (secret) ou `gemini-3.1-flash-lite`;
2. `GEMINI_FALLBACK_MODELS` (secret opcional, separado por vírgulas);
3. fallbacks padrão do código: `gemini-3.5-flash-lite` e `gemini-3.6-flash`.

Para ajustar os fallbacks sem alterar o código:

```powershell
npx supabase secrets set GEMINI_FALLBACK_MODELS="gemini-3.5-flash-lite,gemini-3.6-flash"
```

O arquivo `index.ts` registra no log qual modelo respondeu e quando o fallback
foi necessário. O frontend já trata o `503` como indisponibilidade temporária e
permite nova tentativa.

Para testes locais, copie `supabase/functions/.env.example` para
`supabase/functions/.env`, preencha a chave e execute:

```powershell
npx supabase functions serve recipe-suggestions --env-file supabase/functions/.env
```

O arquivo `.env` é ignorado pelo Git.

## Implantação

Com o projeto previamente vinculado pelo `supabase link`, execute:

```powershell
npx supabase functions deploy recipe-suggestions
```

O arquivo `supabase/config.toml` mantém `verify_jwt = true`, portanto somente
chamadas com uma sessão Supabase válida chegam ao código da função.

## Imagens das receitas

Cada receita recebe um campo `imageQuery` gerado pelo Gemini (nome popular do
prato, em 2 a 5 palavras). A função usa esse termo para buscar uma foto no
Wikimedia Commons, baixar a imagem e armazená-la no bucket público
`recipe-images` do Supabase Storage.

- `public.recipe_image_cache` guarda a URL pública e os metadados de autoria e
  licença, com validade de 30 dias.
- A chave do cache é a consulta normalizada (sem acentos, minúsculas).
- Apenas licenças CC0, domínio público, GFDL e CC BY / CC BY-SA são aceitas.
- Se a busca falhar, a receita mantém a imagem genérica da categoria
  (`imageSource = "unsplash-fallback"`).
- O frontend exibe o crédito do Wikimedia Commons no card e no modal.

A migração que cria a tabela de cache e o bucket está em
`supabase/migrations/20261105180000_recipe_images_cache.sql`.
