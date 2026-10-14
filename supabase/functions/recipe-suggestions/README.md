# Edge Function `recipe-suggestions`

Esta função recebe nomes de ingredientes do frontend, consulta a Spoonacular e devolve receitas normalizadas sem expor a chave da API no navegador.

## Secret obrigatório

Cadastre a chave no projeto remoto:

```powershell
npx supabase secrets set SPOONACULAR_API_KEY="SUA_CHAVE"
```

Também é possível cadastrá-la pelo painel em **Edge Functions > Secrets** usando:

```text
Nome: SPOONACULAR_API_KEY
Valor: sua chave da Spoonacular
```

Para testes locais, copie `supabase/functions/.env.example` para `supabase/functions/.env`, preencha a chave e execute:

```powershell
npx supabase functions serve recipe-suggestions --env-file supabase/functions/.env
```

O arquivo `.env` é ignorado pelo Git.

## Implantação

Com o projeto previamente vinculado pelo `supabase link`, execute:

```powershell
npx supabase functions deploy recipe-suggestions
```

O arquivo `supabase/config.toml` mantém `verify_jwt = true`, portanto somente chamadas com uma sessão Supabase válida chegam ao código da função.
