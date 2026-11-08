# Smart Pantry

Aplicação mobile-first para gestão de despensas domésticas, acompanhamento de validade, registro de consumo e descarte e sugestão de receitas.

## Stack Tecnológica

- **Backend / Runtime:** Node.js (tooling e scripts) e Supabase Edge Functions (serviços serverless protegidos).
- **Interface (Frontend):** React + Vite (Tailwind CSS, design mobile-first responsivo).
- **Banco de Dados (DB):** Supabase (PostgreSQL relacional com Row Level Security).
- **Autenticação:** Supabase Auth com OAuth do Google (fluxo PKCE). A aplicação abre em uma landing page pública e exige login para acessar a despensa.
- **Geração e Consulta de Receitas:** API Spoonacular integrada atualmente via Edge Function; evolução futura planejada para migração para Inteligência Artificial generativa (modelo Open Source ou Google AI Studio / Gemini API).

## Pastas principais

- `app/`: nova aplicação React/Vite;
- `frontend/`: protótipo estático original preservado;
- `docs/`: arquitetura, metodologia e documentação de engenharia de software;
- `supabase/`: migrações e funções de servidor, criada nas próximas etapas.

## Executar a nova aplicação

```bash
cd app
npm install
npm run dev
```

## Verificações

```bash
npm run lint
npm run build
```

## Configuração local

Copie `app/.env.example` para `app/.env` e preencha somente as variáveis publicáveis do Supabase. Chaves privadas não devem ser colocadas no frontend nem versionadas.

### Autenticação com Google

1. No Google Cloud Console, crie um OAuth Client ID do tipo **Aplicativo da Web**.
2. Cadastre como origem JavaScript autorizada a URL do frontend (por exemplo, `http://localhost:5173`).
3. Cadastre como URI de redirecionamento autorizado a callback do Supabase:
   `https://<project-ref>.supabase.co/auth/v1/callback`.
4. No painel do Supabase, habilite o provider **Google** em Authentication > Providers e informe o Client ID e o Client Secret.
5. Em Authentication > URL Configuration, defina a Site URL e inclua a URL do frontend nas Redirect URLs.
6. Para rodar o Supabase local com Google, defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no ambiente antes de `supabase start`.

O aplicativo não cria mais sessões anônimas. Nenhuma chave secreta é necessária no frontend.

## Deploy na Vercel

O frontend fica em `app/`, então o deploy precisa apontar para essa subpasta.

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório `bongiovanii/Smart-Pantry`.
2. Configure:
   - **Root Directory:** `app`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Adicione as variáveis de ambiente (copiadas de `app/.env`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Clique em **Deploy** e copie a URL de produção gerada.

Depois do deploy, cadastre a URL em:

- **Google Cloud Console → Credentials → OAuth 2.0 Client:** adicione a URL em **Authorized JavaScript origins**.
- **Supabase → Authentication → URL Configuration:** defina a **Site URL** e adicione a URL em **Redirect URLs**.
- O **Authorized redirect URI** do Google continua sendo o callback do Supabase:
  `https://<project-ref>.supabase.co/auth/v1/callback`.

O frontend usa `window.location.origin` como destino do OAuth, então não é necessário alterar código ao trocar de domínio.

## Documentação técnica

Consulte [`docs/ESTRUTURA_TECNICA.md`](docs/ESTRUTURA_TECNICA.md) para as decisões, a estrutura prevista e os critérios de pronto do Incremento 0.

