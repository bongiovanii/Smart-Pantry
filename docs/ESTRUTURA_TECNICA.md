# Estrutura técnica do Smart Pantry

## 1. Finalidade

Este documento define a base técnica do Smart Pantry para o Incremento 0. A estrutura foi planejada para desenvolvimento individual, evolução incremental, experiência mobile-first e rastreabilidade com os requisitos do TCC.

## 2. Estado atual

O repositório possui um protótipo estático em `frontend/`, composto por HTML, CSS, Tailwind carregado por CDN e JavaScript sem sistema de módulos. O estoque atual existe somente em memória e os demais elementos da interface são demonstrativos.

O protótipo será preservado em `frontend/` como referência visual durante a migração. A nova aplicação será desenvolvida em `app/`.

## 3. Decisões técnicas

| Decisão | Escolha inicial | Justificativa |
|---|---|---|
| Estratégia mobile | PWA mobile-first | Permite uso no navegador, instalação no aparelho e evolução gradual |
| Empacotamento nativo | Capacitor após o MVP web | Reaproveita o frontend e evita complexidade nativa prematura |
| Frontend | React com JavaScript | Facilita a divisão da interface em componentes e funcionalidades |
| Ferramenta de construção | Vite | Fornece ambiente de desenvolvimento, módulos e build de produção |
| Estilos | Tailwind compilado | Preserva a identidade visual atual sem depender de CDN |
| Banco de dados | Supabase PostgreSQL | Oferece persistência, API, autenticação e políticas de acesso |
| Identidade inicial | Supabase Auth anônimo | Permite separar os dados por usuário sem exigir cadastro no MVP |
| Segurança | Row Level Security | Garante que cada usuário acesse somente os próprios registros |
| Integrações | Funções de servidor | Protege chaves privadas e desacopla APIs externas do frontend |
| Gerência do trabalho | Kanban com WIP 1 | Adequado ao desenvolvimento individual e ao foco por requisito |
| Processo | Iterativo e incremental | Cada etapa produz uma versão executável e verificável |

## 4. Arquitetura inicial

```text
Usuário
  |
  v
PWA React / Vite
  |-- interface mobile-first
  |-- cache e estado local
  |-- cliente Supabase
  |
  +---- Supabase Auth
  +---- Supabase PostgreSQL + RLS
  +---- Funções de servidor
             |-- Open Food Facts
             `-- Spoonacular

Empacotamento posterior:
PWA -> Capacitor -> Android / iOS
```

## 5. Estrutura prevista do repositório

```text
Smart-Pantry/
|-- docs/
|   |-- ESTRUTURA_TECNICA.md
|   |-- METODOLOGIA_DESENVOLVIMENTO.md
|   |-- MATRIZ_RASTREABILIDADE.md
|   `-- DECISOES_ARQUITETURA.md
|-- app/
|   |-- public/
|   |-- src/
|   |   |-- app/
|   |   |   |-- App.jsx
|   |   |   `-- routes.jsx
|   |   |-- components/
|   |   |-- features/
|   |   |   |-- pantry/
|   |   |   |-- alerts/
|   |   |   |-- movements/
|   |   |   `-- recipes/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |   `-- supabase.js
|   |   |-- services/
|   |   |-- styles/
|   |   |-- main.jsx
|   |   `-- index.css
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- frontend/
|   `-- protótipo estático original preservado
|-- supabase/
|   |-- functions/
|   |-- migrations/
|   `-- seed.sql
|-- .gitignore
|-- README.md
|-- CONTEXTO.md
`-- PLANO_DE_ACAO_TCC.md
```

## 6. Organização do frontend

### `app/`

Configuração geral da aplicação, composição das telas, rotas e provedores.

### `components/`

Componentes reutilizáveis sem regra de negócio específica, como botões, campos, cartões, diálogos e indicadores de carregamento.

### `features/`

Cada funcionalidade concentra seus componentes, serviços, validações e regras de apresentação:

- `pantry`: cadastro, edição, listagem e filtros do estoque;
- `alerts`: classificação e central de vencimentos;
- `movements`: consumo, descarte, histórico e estorno;
- `recipes`: compatibilidade, ingredientes faltantes e detalhes.

### `lib/`

Configuração de bibliotecas externas, começando pelo cliente Supabase.

### `services/`

Comunicação com banco, autenticação e integrações. A interface não deverá executar consultas diretamente dentro dos componentes visuais.

## 7. Modelo inicial de dados

### `pantry_items`

- `id`: UUID;
- `user_id`: UUID do usuário;
- `name`: nome do alimento;
- `category`: categoria;
- `quantity`: quantidade atual;
- `unit`: unidade;
- `expiration_date`: validade;
- `created_at`: data de criação;
- `updated_at`: data da última alteração.

### `stock_movements`

- `id`: UUID;
- `user_id`: UUID do usuário;
- `pantry_item_id`: item relacionado;
- `type`: consumo, descarte ou estorno;
- `quantity`: quantidade movimentada;
- `reason`: motivo;
- `created_at`: data e hora.

### Tabelas posteriores

- `recipes`;
- `recipe_ingredients`;
- `meal_plans`.

O status de vencimento será calculado pela aplicação a partir de `expiration_date` e não armazenado como valor permanente.

## 8. Variáveis de ambiente previstas

O frontend utilizará somente dados publicáveis:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Chaves privadas de APIs externas ficarão exclusivamente nas funções de servidor. O arquivo `.env` não deverá ser versionado. O repositório terá apenas `.env.example`, sem valores reais.

## 9. Passo a passo do Incremento 0

### Passo 1 — Preservar a linha de base

1. manter o protótipo atual em `frontend/`;
2. registrar uma captura da versão existente;
3. desenvolver a nova aplicação separadamente em `app/`.

**Resultado:** referência visual e funcional preservada.

### Passo 2 — Criar a aplicação React

1. iniciar o frontend com Vite e React;
2. instalar o Tailwind no fluxo de construção;
3. criar as pastas previstas;
4. transferir cores, fontes e espaçamentos do protótipo;
5. executar a aplicação em ambiente local.

**Resultado:** aplicação React inicial acessível no navegador.

### Passo 3 — Estabelecer o mobile-first

1. definir 375 px como largura principal de validação;
2. criar navegação inferior para celular;
3. transformar a navegação lateral em melhoria para telas grandes;
4. validar toque, foco, contraste e tamanho dos controles;
5. testar também em 1280 px.

**Resultado:** estrutura utilizável em celular e computador.

### Passo 4 — Configurar o Supabase

1. criar o projeto Supabase;
2. configurar o cliente no frontend;
3. habilitar autenticação anônima;
4. criar as primeiras migrações;
5. habilitar RLS;
6. criar políticas baseadas em `user_id`;
7. testar que um usuário não acessa registros de outro.

**Resultado:** banco conectado e dados isolados por usuário.

### Passo 5 — Preparar persistência local

1. definir o comportamento sem conexão;
2. criar uma camada de repositório independente da interface;
3. utilizar armazenamento local para dados pendentes;
4. registrar o estado de sincronização;
5. impedir perda silenciosa de dados.

**Resultado:** decisão offline documentada e interface desacoplada do banco.

### Passo 6 — Preparar as integrações

1. criar contratos internos para produtos e receitas;
2. preparar função de servidor para a Spoonacular;
3. preparar adaptador para Open Food Facts;
4. manter dados simulados para desenvolvimento;
5. garantir que falhas externas não bloqueiem a despensa.

**Resultado:** integrações desacopladas e sem chaves no frontend.

### Passo 7 — Configurar qualidade

1. adicionar ESLint;
2. criar comandos de desenvolvimento, build e verificação;
3. definir convenções de nomes;
4. estabelecer a Definição de Pronto;
5. preparar testes das regras de validade e movimentação.

**Resultado:** base verificável antes dos requisitos funcionais.

### Passo 8 — Preparar a PWA

1. criar manifesto da aplicação;
2. definir nome, cores e ícones;
3. configurar instalação;
4. definir estratégia inicial de cache;
5. validar abertura em modo independente.

**Resultado:** aplicação web instalável.

## 10. Definição de pronto do Incremento 0

O Incremento 0 estará concluído quando:

- o protótipo original estiver preservado;
- o frontend React iniciar sem erros;
- o layout base funcionar em 375 px e 1280 px;
- o Tailwind estiver compilado localmente;
- as pastas estiverem organizadas por funcionalidade;
- o cliente Supabase usar apenas variáveis de ambiente publicáveis;
- as migrações iniciais estiverem versionadas;
- o RLS estiver habilitado e testado;
- nenhuma chave privada estiver no frontend ou no Git;
- os comandos de build e verificação passarem;
- a arquitetura e as limitações estiverem documentadas.

## 11. Sequência imediata de execução

A execução deverá começar pela preservação do protótipo e pela criação da aplicação React com Vite. A conexão real com o Supabase ocorrerá somente depois que a base mobile-first iniciar corretamente e a separação entre interface, regras e serviços estiver estabelecida.

## 12. Estado do Incremento 0

- [x] protótipo original preservado em `frontend/`;
- [x] decisões e estrutura técnica documentadas;
- [x] aplicação React/Vite criada em `app/`;
- [x] Tailwind configurado como plugin de construção;
- [x] estrutura inicial organizada por funcionalidade;
- [x] página-base construída com abordagem mobile-first;
- [x] ESLint executado sem erros em ambiente de validação;
- [x] build de produção executado com sucesso em ambiente de validação;
- [ ] dependências instaladas localmente na pasta `app/`;
- [ ] cliente Supabase configurado;
- [ ] migrações e políticas RLS criadas;
- [ ] persistência local e sincronização definidas;
- [ ] manifesto PWA e estratégia de cache configurados.


