# Smart Pantry

Aplicação mobile-first para gestão de despensas domésticas, acompanhamento de validade, registro de consumo e descarte e sugestão de receitas.

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

## Documentação técnica

Consulte [`docs/ESTRUTURA_TECNICA.md`](docs/ESTRUTURA_TECNICA.md) para as decisões, a estrutura prevista e os critérios de pronto do Incremento 0.

