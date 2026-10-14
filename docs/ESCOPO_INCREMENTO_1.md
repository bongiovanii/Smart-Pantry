# Escopo do Incremento 1 — Cadastro básico da despensa

## Objetivo

Entregar o primeiro fluxo persistente do Smart Pantry: cadastrar manualmente um ingrediente e consultar os itens salvos na despensa do usuário.

## Funcionalidades incluídas

- iniciar uma sessão anônima no Supabase para identificar a despensa;
- abrir o formulário pelo botão **Novo ingrediente**;
- informar nome, categoria, quantidade, unidade e data de validade opcional;
- validar os campos obrigatórios antes do envio;
- gravar o item na tabela `pantry_items`;
- listar somente os itens ativos vinculados ao usuário atual;
- apresentar estados de carregamento, despensa vazia e erro de conexão;
- manter a experiência mobile-first e adaptar o modal para telas maiores.

## Fora do escopo deste incremento

- leitura ou digitalização de código de barras;
- consulta automática de produtos pelo código de barras;
- preenchimento automático por meio da Open Food Facts.

A leitura de código de barras permanece planejada para uma implementação futura. O cadastro manual permite validar primeiro o fluxo principal e a persistência no Supabase.

## Critérios de aceite

1. Ao selecionar **Novo ingrediente**, o sistema abre o formulário de cadastro.
2. O sistema não permite cadastrar um item sem nome ou com quantidade menor ou igual a zero.
3. Após um cadastro válido, o registro aparece na tabela `pantry_items` com o `user_id` da sessão atual.
4. Após o Supabase confirmar o cadastro, o modal fecha e o novo item aparece na área **Em estoque agora**.
5. Ao recarregar a aplicação, os itens cadastrados pelo usuário continuam visíveis.
6. Os registros de outro usuário não são retornados pelas políticas de Row Level Security.

## Dependências de configuração

- variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `app/.env.local`;
- migração inicial aplicada no projeto Supabase;
- Row Level Security e políticas da tabela `pantry_items` ativas;
- login anônimo habilitado em **Authentication > Providers > Anonymous** no painel do Supabase.
