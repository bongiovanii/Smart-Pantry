# Smart Pantry — Estado atual do projeto

**Data de atualização:** 12 de novembro de 2026

**Versão do documento:** 2.3

**Fase atual:** fases 1 a 5, Fase 7 e Fase 10 concluídas (despensa, receitas com IA, consumo, planejamento semanal persistente com templates/ciclo/histórico, biblioteca de receitas, geração cache-first, notificações de vencimento e central de configurações). As fases 6, 8, 9 e 11 estão planejadas; a Fase 6 (Favoritas) é a próxima.

**Incremento documentado:** [`ESCOPO_INCREMENTO_7.md`](./ESCOPO_INCREMENTO_7.md) — notificações de vencimento e central de configurações. Os incrementos anteriores permanecem em [`ESCOPO_INCREMENTO_6.md`](./ESCOPO_INCREMENTO_6.md) e [`ESCOPO_INCREMENTO_5.md`](./ESCOPO_INCREMENTO_5.md).

**Planejamento vigente:** [`plano_implementacao_v3.md`](./plano_implementacao_v3.md), com as decisões em [`DECISOES_DE_PROJETO.md`](./DECISOES_DE_PROJETO.md) e a estratégia de qualidade em [`plano_testes.md`](./plano_testes.md).

## Histórico de versões deste documento

| Versão | Data | Alteração registrada |
|---|---|---|
| 1.0 | 08/11/2026 | Consolidação do estado após o Incremento 3: histórico de receitas, autenticação com Google, deploy público, correção do 502 e kcal nas receitas. |
| 1.1 | 11/11/2026 | Fase 4 concluída: planejamento semanal persistente, tabela `meal_plans`, serviço e componentes de agendamento, snapshot compartilhado de receita, verificação formal da feature de kcal, aplicação das migrações pendentes, republicação da Edge Function e deploy do frontend confirmado em produção. |
| 1.2 | 12/11/2026 | Correção de usabilidade: o inventário da despensa passou a ter altura fixa com rolagem interna, exibindo até 4 itens antes de rolar. |
| 2.0 | 12/11/2026 | Planejamento v3 aprovado e documentado: ordem 7 → 5 → 6 → 8 → 9 → 11 → 10, decisões de projeto, plano de testes, biblioteca de receitas com cache-first, templates de planejamento, favoritas, dark mode, lista de compras, notificações in-app e Smart Chef. Nenhuma funcionalidade do v3 foi implementada nesta versão. |
| 2.1 | 12/11/2026 | Fase 7 implementada: tabelas `recipes` e `recipe_generations`, Edge Function cache-first com JWT, limite diário de 10 gerações, modal “Descobrir mais receitas”, normalização compartilhada e 16 testes unitários com Vitest. Migração aplicada, Edge Function e frontend publicados; validação autenticada final pendente. |
| 2.2 | 12/11/2026 | Fase 5 implementada: tabelas `meal_plan_cycles`, `meal_plan_templates`, `meal_plan_template_items` e `meal_plan_weeks`, evolução de `meal_plans` com `week_start`, 7 RPCs transacionais, página `PlanningPage.jsx` completa, modais de templates e histórico, validação de validade futura na despensa, e 44 testes unitários com Vitest. Migração aplicada remotamente no Supabase. |
| 2.3 | 12/11/2026 | Fase 10 implementada: tabelas `user_settings` e `notifications`, RPCs `generate_expiration_notifications`, `snooze_notification`, `mark_all_notifications_as_read` e `get_or_create_user_settings`, componentes `NotificationsPanel`, `SettingsPage`, badge de não lidas no `AppHeader`, atalho de configurações na navegação, e 52 testes unitários com Vitest. Migração aplicada remotamente no Supabase. |


## 1. Finalidade deste documento

Este documento registra o que já foi construído no Smart Pantry a partir de evidências do próprio software. Seu objetivo é manter uma visão clara da evolução do projeto e oferecer uma base confiável para a documentação final do TCC.

Neste momento, ele não redefine os requisitos funcionais e não tenta adequar artificialmente o sistema a uma lista elaborada antes da implementação. Os requisitos serão revistos progressivamente, tomando como base as funcionalidades efetivamente entregues, as decisões registradas, os testes realizados e as próximas necessidades observadas durante o desenvolvimento.

## 2. Visão do produto

O Smart Pantry é uma aplicação voltada à organização de alimentos domésticos. A proposta é permitir que o usuário mantenha uma representação simples de sua despensa, acompanhe os ingredientes disponíveis e receba sugestões de receitas que aproveitem esses alimentos.

O projeto está relacionado à redução do desperdício alimentar. Nesta etapa, o sistema cria a estrutura necessária para organizar o estoque e apoiar decisões de consumo. A comprovação de redução do desperdício dependerá de funcionalidades e medições posteriores, especialmente o registro de consumo, descarte e comparação dos resultados ao longo do uso.

## 3. Estratégia de desenvolvimento adotada

O desenvolvimento está sendo realizado por uma única pessoa e segue uma abordagem iterativa e incremental. Cada incremento procura entregar uma parte utilizável do sistema, que pode ser executada, verificada e documentada antes da evolução seguinte.

Essa estratégia permite:

- trabalhar com um escopo compatível com o tempo disponível;
- validar a aplicação durante o desenvolvimento;
- reduzir o risco de criar funcionalidades sem utilidade prática;
- registrar decisões conforme o sistema evolui;
- produzir requisitos e modelos coerentes com a solução construída.

O trabalho é acompanhado por um quadro Kanban. O foco atual está na conclusão de pequenos fluxos de ponta a ponta, conectando interface, serviço, banco de dados e resposta apresentada ao usuário.

## 4. Arquitetura atual do sistema e stack tecnológica

A aplicação está organizada em camadas simples, com responsabilidades separadas:

```text
Usuário
   |
   v
Interface React responsiva (Vite)
   |
   +--> Serviço da despensa --> Supabase Auth + PostgreSQL
   |
   `--> Serviço de receitas --> Supabase Edge Function --> Gemini API (Google AI Studio, PT-BR nativo)
```

### Síntese da Stack Tecnológica

- **Backend:** Node.js (ecossistema de execução, dependências e tooling) e Supabase Edge Functions (Deno/TypeScript) para isolamento de regras de integração e segurança.
- **Interface (Frontend):** React com Vite, estruturado em componentes com foco mobile-first.
- **Banco de Dados (DB):** Supabase (PostgreSQL relacional com Row Level Security - RLS).
- **Autenticação:** Supabase Auth com OAuth do Google (PKCE). A aplicação exibe uma landing page pública e só libera a despensa após o login. A criação automática de usuários anônimos foi removida.
- **Geração / Consulta de Receitas:** Gemini API (Google AI Studio) integrada via Supabase Edge Function com Structured Output (JSON Schema). Receitas geradas 100% em português do Brasil (PT-BR) com ingredientes, passos de preparo e metadados entregues em uma única requisição. Motor anterior (Spoonacular) removido.

### Interface da aplicação

O frontend foi construído com React e Vite. O React organiza a tela em componentes e controla os estados da aplicação, como carregamento, erro, abertura do formulário e atualização das listas. O Vite fornece o ambiente de desenvolvimento e gera a versão de produção.

A interface segue a abordagem mobile-first. Em telas pequenas, a navegação é apresentada na parte inferior; em telas maiores, a aplicação utiliza menu lateral e distribuição semelhante a um sistema web para computador.

### Camada de serviços

Os componentes visuais não acessam diretamente o banco de dados nem a API externa. Essa comunicação foi concentrada em serviços próprios:

- `pantry.js`: exige sessão autenticada, consulta a despensa e cadastra ingredientes;
- `auth.js`: centraliza leitura de sessão, login Google, logout e dados do perfil;
- `session.js`: garante que nenhuma operação seja executada sem usuário autenticado;
- `recipe.js`: prepara os ingredientes, chama a função de receitas e converte a resposta para o formato utilizado pelos cartões da interface;
- `supabase.js`: cria e disponibiliza a conexão central com o projeto Supabase.

Essa separação facilita a manutenção e evita que regras de integração fiquem espalhadas pela interface.

### Backend e dados

O Supabase exerce três funções principais no projeto:

1. identificar o usuário por meio da sessão autenticada do Google;
2. armazenar os dados da despensa em um banco PostgreSQL;
3. executar a Edge Function responsável pela integração com o Gemini API.

A sessão autenticada fornece o identificador único utilizado no cadastro e na consulta dos itens. Com isso, cada usuário visualiza somente a própria despensa, e os dados permanecem disponíveis entre dispositivos ao entrar com a mesma conta Google.

## 5. Capacidades implementadas

### 5.1 Interface responsiva

A aplicação possui uma tela principal adaptável para celular e computador. A mesma base atende as duas experiências, alterando a navegação e a distribuição dos elementos conforme o espaço disponível.

Já estão presentes na interface:

- cabeçalho da aplicação;
- navegação lateral para computador;
- navegação inferior para celular;
- área de cadastro e visualização da despensa;
- seção de sugestões de receitas;
- planejamento semanal persistente, com slots por dia e tipo de refeição.

O planejamento semanal deixou de ser demonstrativo: as refeições são gravadas em `meal_plans` e restauradas quando o usuário volta à aplicação.

### 5.2 Autenticação e sessão de usuário

A aplicação abre em uma landing page pública. Os botões **Entrar** e **Criar conta** levam à tela de login, que oferece autenticação com a conta Google por meio do Supabase Auth. Depois do retorno do Google, a sessão é detectada na URL, persistida no navegador e o aplicativo é liberado.

Não existe mais criação automática de sessão anônima. Os serviços exigem uma sessão autenticada antes de consultar a despensa, as receitas ou o histórico. Ao sair, a sessão é encerrada e o usuário volta à landing page. O cabeçalho e o menu lateral exibem nome, e-mail e avatar do Google.

### 5.3 Cadastro manual de ingredientes

O botão **Novo ingrediente** abre um formulário em formato de modal. O usuário pode informar:

- nome do ingrediente;
- categoria;
- quantidade;
- unidade de medida;
- data de validade, quando disponível.

O formulário valida os dados básicos antes do envio. Depois da confirmação do Supabase, o modal é fechado e o novo ingrediente aparece na tela sem exigir uma atualização manual do navegador.

### 5.4 Consulta da despensa

Os itens cadastrados são carregados da tabela `pantry_items`. A consulta considera apenas registros ativos e organiza os produtos por validade e data de criação.

A interface apresenta:

- nome e categoria do ingrediente;
- quantidade e unidade;
- data de validade ou indicação de que ela não foi informada;
- quantidade total de itens atualmente exibidos.

O widget de inventário mantém uma altura fixa e exibe até 4 itens antes de ativar a rolagem vertical: no desktop são 2 linhas de 2 itens e, no mobile, 4 linhas. A lista tem rolagem própria (`overflow-y: auto`), barra de rolagem discreta e `overscroll-behavior: contain`, evitando que a rolagem interna propague para a página.

Também foram implementados estados de carregamento, despensa vazia, falha de conexão e tentativa de recarregamento.

### 5.5 Persistência no Supabase

Os ingredientes deixaram de existir apenas durante a execução do navegador. Agora são armazenados no banco e permanecem disponíveis depois que a página é recarregada.

O modelo inicial possui duas tabelas:

| Tabela | Papel atual |
|---|---|
| `pantry_items` | Armazena os ingredientes, quantidades, unidades, validade, status e vínculo com o usuário. Já participa do funcionamento da aplicação. |
| `stock_movements` | Registra entradas, consumo, desperdício, ajustes e estornos. Passou a receber os consumos confirmados a partir das receitas. |

A tabela de movimentações será importante para formar um histórico e medir consumo ou desperdício. Por enquanto, ela representa uma capacidade estrutural do banco, não uma funcionalidade entregue ao usuário.

### 5.6 Segurança dos dados

As tabelas utilizam Row Level Security, ou RLS. As políticas verificam o identificador da sessão antes de permitir leitura, criação, alteração ou exclusão.

Na prática, essa decisão impede que uma sessão consulte ou modifique diretamente os registros pertencentes a outra. As tabelas também possuem validações para nomes, quantidades, unidades e tipos de movimentação.

### 5.7 Sugestão de receitas

Depois que a despensa é carregada, os nomes dos ingredientes são enviados ao serviço de receitas. O sistema solicita até seis sugestões e, desde a Fase 7, consulta primeiro a biblioteca do usuário antes de chamar o Gemini.

Cada receita recebida é adaptada para o cartão da aplicação, contendo:

- identificador da receita;
- título;
- imagem;
- quantidade de ingredientes da despensa aproveitados;
- ingredientes utilizados e ingredientes faltantes;
- tempo de preparo e calorias por porção, quando informados pelo modelo.

Quando a biblioteca já cobre a quantidade pedida, as receitas são devolvidas do cache sem nova chamada ao Gemini. Quando cobre apenas parte, o Gemini gera somente a diferença. O cartão apresenta **Tempo não informado** apenas quando o dado não existe.

### 5.8 Integração protegida com o Gemini API (Google AI Studio)

A chave privada do Gemini não fica armazenada no frontend. O React chama uma Supabase Edge Function chamada `recipe-suggestions`, e somente essa função se comunica com a API do Gemini.

A Edge Function usa **Structured Output** (`response_mime_type: "application/json"` + `response_schema`) para garantir que o Gemini sempre retorne o formato exato esperado pelo frontend, eliminando erros de parsing. Todas as receitas são geradas 100% em português do Brasil (PT-BR) por instrução de sistema — sem dicionários de tradução.

O fluxo atual é:

1. o React carrega os ingredientes da despensa;
2. `recipe.js` extrai e normaliza os nomes (mantendo o PT-BR nativo);
3. o Supabase envia o JWT da sessão para a Edge Function;
4. a Edge Function valida o usuário em `/auth/v1/user` e rejeita chamadas sem sessão com `401`;
5. a função consulta a biblioteca do usuário pela RPC `find_recipes_for_pantry`;
6. se o cache cobre o limite, devolve as receitas salvas sem chamar o Gemini;
7. se o cache é parcial, verifica o limite diário e chama o Gemini apenas para a diferença;
8. monta o prompt com os ingredientes e um JSON Schema estrito;
9. o Gemini gera receitas completas em PT-BR (título, categoria, tempo, porções, ingredientes usados, faltantes e passos de preparo);
10. a Edge Function busca imagens reais no Wikimedia Commons (com fallback por categoria), persiste as receitas em `recipes` e registra a geração em `recipe_generations`;
11. os dados são convertidos em cartões de receita e abertos no modal de detalhes instantaneamente.

### 5.9 Dados embutidos na primeira resposta

Com o Gemini, todos os dados da receita — incluindo passos de preparo (`steps`), tempo, porções e ingredientes — chegam na primeira (e única) chamada à Edge Function. O `RecipeDetailModal` abre instantaneamente sem precisar de uma segunda requisição, eliminando o estado de carregamento para o modo de preparo.

### 5.10 Tratamento dos estados da integração

A seção de receitas diferencia os seguintes estados:

- consulta em andamento;
- receitas carregadas do cache, da IA ou de uma combinação dos dois;
- nenhuma receita encontrada;
- erro na consulta;
- limite diário atingido.

A interface exibe os selos **Da sua biblioteca** e **Limite diário atingido** conforme os metadados devolvidos pela Edge Function. Também existe uma proteção contra a repetição da mesma requisição, reduzindo chamadas desnecessárias ao Gemini e preservando a cota do serviço.

### 5.11 Consumo de receitas e movimentações de estoque

O botão **Cozinhar esta receita**, no modal de detalhes, abre uma confirmação de consumo. O sistema relaciona os ingredientes indicados pela receita aos itens reais da despensa por nome normalizado (sem diferença de acentos, maiúsculas ou plural) e permite, para cada item:

- **Consumo total:** zera o saldo, define `status = 'consumido'` e arquiva o item, retirando-o da contagem ativa;
- **Consumo parcial:** debita apenas a quantidade utilizada e mantém o saldo restante ativo na despensa;
- **Exclusão da lista:** o item pode ser desmarcado e não entra no registro.

A gravação ocorre em uma única transação no banco, por meio da função `consume_recipe_ingredients`. Ela valida o saldo, insere a linha correspondente em `stock_movements` com `movement_type = 'consumption'` e o motivo `Preparo da receita: <título>`, atualiza `pantry_items` e registra o snapshot da receita em `user_recipes`. Após a confirmação, a interface reflete o novo saldo sem recarregar a página e exibe um aviso de sucesso.

### 5.12 Minhas receitas (histórico por usuário)

A navegação lateral passou a exibir **Minhas receitas** no lugar do antigo atalho de receitas. A nova tela funciona como um inventário do histórico culinário do usuário:

- cada execução confirmada gera uma linha em `user_recipes`, com `user_id`, snapshot da receita, ingredientes usados/faltantes, passos, imagem e `cooked_at`;
- o inventário agrupa execuções da mesma receita e mostra quantas vezes ela foi preparada e a data do último preparo;
- uma linha do tempo lista os preparos individuais mais recentes;
- a busca filtra o inventário por nome ou categoria;
- clicar em um card ou registro abre o modal de detalhes já com os dados salvos, sem nova chamada ao Gemini.

A tabela usa RLS por `user_id`, de modo que cada sessão lê e registra apenas as próprias receitas. Como o snapshot é gravado na mesma transação do consumo, não existe caso de receita contabilizada sem baixa no estoque nem de consumo sem entrada no histórico.

### 5.13 Planejamento semanal persistente (Fase 4)

A seção **Sua semana** deixou de usar dados fixos e passou a representar o planejamento real do usuário:

- cada refeição é gravada em `meal_plans` com dia da semana (`SEG` a `DOM`), tipo de refeição (`Café da manhã`, `Almoço`, `Lanche` ou `Jantar`) e o snapshot completo da receita;
- existe no máximo uma receita por dia e tipo de refeição; ao reagendar o mesmo slot, o prato anterior é substituído por `upsert`;
- o usuário pode planejar a partir do botão **Planejar** no modal de detalhes, do atalho de calendário no card da receita ou do botão **+** de cada coluna da semana;
- cada cartão da semana abre o modal de detalhes com os dados salvos, sem nova chamada ao Gemini, e oferece um botão para remover a refeição do slot;
- o planejamento é carregado na abertura da aplicação e permanece disponível após recarregar a página ou trocar de dispositivo;
- a interface exibe estados de carregamento, erro com tentativa de recarregamento e a contagem de refeições planejadas.

O modal de agendamento permite escolher dia, refeição e, quando aberto pelo botão **+** da semana, uma das receitas sugeridas atualmente carregadas.

### 5.14 Informação nutricional nas receitas

O prompt do chef brasileiro passou a estimar `caloriesPerServing` (kcal por porção) e a devolver o valor no JSON estruturado. A informação aparece:

- como selo no card da receita sugerida;
- como métrica no modal de detalhes;
- no inventário e nos cartões de **Minhas receitas**;
- no snapshot salvo em `user_recipes` e em `meal_plans`.

Quando o modelo não informa o valor, o campo é armazenado como zero/nulo e a interface simplesmente o oculta.

### 5.15 Planejamento v3 (fases 5 a 11) — em execução

Em 12/11/2026 foi concluída a etapa de planejamento das próximas funcionalidades e implementada a **Fase 7**. As demais fases do v3 continuam planejadas.

A ordem de execução definida é **7 → 5 → 6 → 8 → 9 → 11 → 10**, por dependência técnica:

| Fase | Funcionalidade | Depende de | Status |
|---|---|---|---|
| 7 | Biblioteca de receitas persistida + geração cache-first + “Descobrir mais receitas” | — | Implementada em 12/11/2026 |
| 5 | Aba de planejamento com até 4 templates, ciclo de 4 semanas e histórico | Fase 7 | Implementada em 12/11/2026 |
| 6 | Favoritas com snapshot e abas em “Minhas receitas” | Fase 7 | Planejada (próxima) |
| 8 | Aba Configurações com dark mode | — | Planejada |
| 9 | Fluxo de entrada/reposição + aba “Minha lista de compras” | Fase 5 e histórico de movimentações | Planejada |
| 11 | Chatbot Smart Chef (stretch) | Fases 7 e 9 | Planejada (stretch) |
| 10 | Notificações de vencimento in-app (stretch) | — | Implementada em 12/11/2026 |

Decisões estruturais registradas:

- toda receita gerada pela IA é persistida em `recipes`, com deduplicação por título normalizado;
- a geração é **cache-first**: a Edge Function consulta a biblioteca antes de chamar o Gemini;
- o planejamento passará a ter `week_start`, ciclo de 4 semanas e histórico, mantendo a recorrência;
- a lista de compras será derivada de `stock_movements` (consumo e entradas) e dos ingredientes faltantes do planejamento;
- as notificações serão in-app no MVP, com evolução documentada para PWA + push + VAPID;
- o Smart Chef terá uma conversa persistida, ações estruturadas e limite de 7 mensagens/dia;
- a única dependência nova crítica é o **Vitest** para testes unitários, já adicionada na Fase 7.

O detalhamento completo está em [`plano_implementacao_v3.md`](./plano_implementacao_v3.md). O registro da Fase 7 está em [`ESCOPO_INCREMENTO_5.md`](./ESCOPO_INCREMENTO_5.md).

### 5.16 Biblioteca de receitas e geração cache-first (Fase 7)

A Fase 7 mudou o ciclo das receitas: elas deixaram de ser efêmeras e passaram a compor uma biblioteca por usuário.

- **Persistência:** toda receita gerada pela IA é salva em `recipes`, com snapshot completo (ingredientes, passos, imagem, tempo, porções e calorias) e `title_normalized` para deduplicação.
- **Cache-first:** antes de chamar o Gemini, a Edge Function consulta `find_recipes_for_pantry` com os ingredientes normalizados da despensa. Se a biblioteca cobre o limite, nenhum token é gasto; se cobre parcialmente, o Gemini gera apenas a diferença.
- **Deduplicação:** a restrição única `(user_id, title_normalized)` e o upsert por `on_conflict` impedem duplicatas. O lote gerado também é deduplicado antes do envio.
- **Limite diário:** cada chamada que usa o Gemini é registrada em `recipe_generations`. O limite é de 10 gerações por dia, contado a partir da meia-noite de `America/Sao_Paulo`.
- **Autenticação:** a Edge Function exige o JWT do usuário e usa a sessão dele nas operações REST, preservando a RLS. Requisições sem sessão retornam `401`.
- **Descobrir mais receitas:** o modal lista a biblioteca diretamente pela tabela `recipes`, com busca por título/categoria e paginação de 20. O botão **Gerar mais receitas** usa o mesmo fluxo cache-first.
- **Contrato do frontend:** `listRecipesByIngredients` devolve `recipes`, `source`, `cacheHits`, `generated`, `remainingGenerationsToday` e `limitReached`.
- **Testes:** 16 testes unitários com Vitest cobrem normalização, contrato de receita e deduplicação.

A decisão de persistir por upsert direto no PostgREST, em vez da RPC `upsert_generated_recipes` prevista no plano, está justificada em [`ESCOPO_INCREMENTO_5.md`](./ESCOPO_INCREMENTO_5.md).

### 5.17 Templates de planejamento semanal, ciclo de 4 semanas e histórico (Fase 5)

A Fase 5 implementou o sistema completo de planejamento alimentar com ciclo de 4 semanas e templates:
- **Tabelas e ciclo:** `meal_plan_cycles`, `meal_plan_templates`, `meal_plan_template_items` e `meal_plan_weeks`, com evolução de `meal_plans` para suportar `week_start`.
- **Recorrência:** ciclo contínuo de 4 semanas que avança a cada segunda-feira e repete os templates a cada mês.
- **Aba dedicada:** `PlanningPage.jsx` com visualização da semana atual, gestão de até 4 templates (`TemplateEditorModal`, `TemplateFormModal`) e histórico de semanas anteriores (`PlanHistoryModal`).
- **Validação de validade futura na despensa:** o cadastro e edição de alimentos agora rejeitam datas de validade anteriores ao dia atual no fuso de Brasília.
- O detalhamento completo está em [`ESCOPO_INCREMENTO_6.md`](./ESCOPO_INCREMENTO_6.md).

### 5.18 Notificações de vencimento e central de configurações (Fase 10)

A Fase 10 implementou os alertas in-app para alimentos que estão próximos da validade ou já venceram:
- **Modelo:** tabelas `user_settings` (preferências de notificações e tema) e `notifications` (avisos vinculados aos alimentos).
- **Geração e deduplicação:** RPC `generate_expiration_notifications()` no PostgreSQL que identifica alimentos da despensa com validade em até 7 dias ou vencidos e cria no máximo um aviso por item por dia civil no fuso de Brasília.
- **Central de notificações:** `NotificationsPanel.jsx` acessível pelo ícone de sino no `AppHeader`, com badge contador de itens não lidos, ações rápidas de "Ver receitas", "Adiar 1 dia" (`snooze_notification`), "Marcar como lida" e "Ler todas" (`mark_all_notifications_as_read`).
- **Central de configurações:** `SettingsPage.jsx` com toggle interativo para ligar ou desligar notificações de vencimento, dados da conta Google e botão de logout.
- O detalhamento completo está em [`ESCOPO_INCREMENTO_7.md`](./ESCOPO_INCREMENTO_7.md).

## 6. Organização atual dos principais componentes

| Elemento | Responsabilidade no sistema |
|---|---|
| `Root.jsx` | Resolve a sessão inicial e controla o fluxo landing → login → aplicativo. |
| `LandingPage.jsx` | Apresenta a proposta do produto e direciona para login ou criação de conta. |
| `LoginScreen.jsx` | Oferece o login/cadastro com Google e trata carregamento e erros do OAuth. |
| `App.jsx` | Compõe a tela principal, controla a navegação entre a despensa, “Minhas receitas”, planejamento e configurações, coordena notificações, consumo e descoberta de receitas. |
| `MyRecipesPage.jsx` | Exibe o inventário, a busca e a linha do tempo das receitas executadas pelo usuário. |
| `PlanningPage.jsx` | Tela completa de planejamento com semana atual, templates do ciclo de 4 semanas e histórico. |
| `SettingsPage.jsx` | Central de preferências do usuário (toggle de notificações, conta conectada e logout). |
| `WeekPlanner.jsx` | Renderiza a grade semanal persistente, com adicionar, abrir e remover refeições. |
| `PlanMealModal.jsx` | Permite escolher dia, tipo de refeição e receita antes de gravar o slot. |
| `PlanHistoryModal.jsx` | Modal somente leitura para visualização de semanas passadas do histórico de planejamento. |
| `TemplateEditorModal.jsx` | Editor interativo de templates dia a dia com receitas da biblioteca. |
| `TemplateFormModal.jsx` | Criação e renomeação de templates. |
| `TemplateItemModal.jsx` | Seleção de receita da biblioteca para slot do template. |
| `IngredientModal.jsx` | Coleta e valida os dados do novo ingrediente (com bloqueio de datas retroativas). |
| `RecipeDetailModal.jsx` | Exibe ingredientes, tempo, porções e modo de preparo da receita. |
| `CookRecipeModal.jsx` | Confirma quais itens da despensa serão consumidos e em que quantidade. |
| `DiscoverRecipesModal.jsx` | Lista a biblioteca, busca, pagina e gera mais receitas. |
| `NotificationsPanel.jsx` | Painel deslizante com avisos de validade, ações de receita, adiar e marcar lida. |
| `FeatureCard.jsx` | Apresenta visualmente uma receita. |
| `AppHeader.jsx` | Apresenta o cabeçalho, sino de notificações com badge, avatar e menu da conta com atalho para configurações. |
| `UserAvatar.jsx` | Exibe o avatar do Google com fallback para a inicial do nome. |
| `pantry.js` | Executa os casos de consulta e cadastro da despensa. |
| `movements.js` | Registra o consumo dos ingredientes e o snapshot da receita via RPC transacional. |
| `userRecipes.js` | Consulta o histórico de receitas do usuário e normaliza os snapshots salvos. |
| `mealPlan.js` (serviço) | Lista, agenda/substitui e remove refeições do planejamento semanal. |
| `mealPlanTemplates.js` (serviço) | Gestão de templates de planejamento, ciclo de 4 semanas e histórico. |
| `notifications.js` (serviço) | Geração de alertas de validade, marcação de lidas, adiamento e descarte. |
| `userSettings.js` (serviço) | Consulta e atualização das preferências do usuário no Supabase. |
| `mealPlan.js` (lib) | Define dias da semana, rótulos e tipos de refeição aceitos pelo banco. |
| `week.js` (lib) | Funções puras de cálculo de semanas, segundas-feiras e ciclo de 4 semanas. |
| `recipeSnapshot.js` | Monta o snapshot compartilhado de receita usado pelo consumo e pelo planejamento. |
| `recipe.js` | Define o contrato entre a aplicação e o serviço de receitas, incluindo os metadados de cache e limite. |
| `recipeLibrary.js` (serviço) | Lista a biblioteca, consulta o status de gerações e busca por título. |
| `recipeNormalization.js` | Normaliza títulos e ingredientes para deduplicação e cache. |
| `recipeRecord.js` | Converte respostas da API e linhas do banco para o contrato dos cards e faz merge por título. |
| `supabase.js` | Centraliza a criação do cliente Supabase com persistência e PKCE. |
| `auth.js` | Centraliza login Google, logout, sessão e dados do perfil. |
| `session.js` | Exige sessão autenticada antes de qualquer operação nos serviços. |
| `ingredientMatch.js` | Relaciona os nomes de ingredientes das receitas aos itens da despensa. |
| `recipe-suggestions/index.ts` | Valida o JWT, consulta o cache, gera receitas em PT-BR via Structured Output, persiste na biblioteca, aplica o limite diário e mapeia imagens. |
| Migração inicial | Cria tabelas, relacionamentos, validações, índices e políticas de segurança. |
| Migração da Fase 3 | Adiciona `status` a `pantry_items` e a função transacional de consumo. |
| Migração do histórico | Cria `user_recipes` com RLS e amplia a RPC para gravar o snapshot da receita na mesma transação. |
| Migração de calorias | Adiciona `calories_per_serving` ao histórico e amplia a RPC de consumo. |
| Migração do planejamento | Cria `meal_plans` com RLS, restrição de slot único e snapshot da receita. |
| Migração da biblioteca | Cria `recipes`, `recipe_generations`, índices, RLS e a RPC `find_recipes_for_pantry`. |
| Migração de templates | Cria `meal_plan_cycles`, `meal_plan_templates`, `meal_plan_template_items`, `meal_plan_weeks` e 7 RPCs transacionais. |
| Migração de notificações | Cria `user_settings`, `notifications` e RPCs de geração, adiamento e leitura. |

### 6.1 Componentes previstos para as fases restantes do v3

| Elemento planejado | Fase | Responsabilidade |
|---|---|---|
| `FavoriteButton.jsx` | 6 | Alterna favorito em cards, modais, histórico e planejamento. |
| `ThemeProvider.jsx` | 8 | Aplicação de tema claro/escuro/sistema integrado a `user_settings`. |
| `ShoppingListPage.jsx` | 9 | Sugestões, itens manuais, faltantes do planejamento e compras. |
| `PantryEntryModal.jsx` | 9 | Registro de entrada/reposição na despensa. |
| `SmartChefModal.jsx` | 11 | Chat com o chef, histórico, limite diário e ações estruturadas. |

## 7. Decisões de engenharia já adotadas

### Cadastro manual antes do código de barras

A leitura de código de barras e a integração com a Open Food Facts foram deixadas para uma etapa futura. O cadastro manual foi priorizado porque permite validar a utilidade da despensa e a persistência dos dados com menor complexidade.

### Aplicação web mobile-first

O MVP é desenvolvido como aplicação web responsiva. O empacotamento por Capacitor e os recursos completos de PWA permanecem como possibilidades posteriores, depois que os fluxos principais estiverem estáveis.

### Serviços separados da interface

O acesso ao Supabase e à API de receitas foi retirado dos componentes visuais. Essa decisão reduz o acoplamento e permite alterar integrações sem reconstruir toda a tela.

### Segredos somente no backend

O frontend contém apenas dados publicáveis necessários ao cliente Supabase. A chave da Spoonacular é armazenada como segredo da Edge Function e não é enviada ao navegador.

### Transição da autenticação anônima para o login com Google

A autenticação anônima do Supabase Auth serviu como viabilizador do MVP sem atrito de cadastro, mas não permitia acesso entre dispositivos nem recuperação de conta. Como os dados existentes eram apenas de teste, optou-se por substituir o fluxo anônimo pelo OAuth do Google sem migração de dados. O frontend configura o cliente Supabase com persistência de sessão, renovação automática de token, detecção da sessão na URL e fluxo PKCE.

### Decisão de Engenharia: Substituição da Spoonacular por IA Generativa (Google AI Studio / Gemini API)

A API externa Spoonacular foi adotada inicialmente para validar o fluxo de ponta a ponta. Contudo, durante os testes com a base real e os primeiros cards de receitas, constatou-se que a Spoonacular opera de maneira estritamente em inglês e com severas limitações de flexibilidade. Foi tomada a decisão técnica de substituir o motor da Spoonacular pela **API Gemini (Google AI Studio)**.

**Motivos e justificativas da decisão:**
1. **Língua nativa e contexto cultural:** A Spoonacular não oferece suporte nativo a outro idioma. Dicionários manuais são viáveis para ingredientes isolados, mas incapazes de traduzir instruções dinâmicas de preparo sem distorções culinárias. O Gemini opera nativamente em português do Brasil (pt-BR), adaptando termos típicos como "alho picado", "azeite a gosto" e pratos populares brasileiros.
2. **Combate ao desperdício superior (ODS 12):** A Spoonacular apenas pesquisa receitas fixas cadastradas em sua base estrangeira. Um modelo de linguagem atua como um consultor culinário, gerando combinações adaptadas e criativas para aproveitar sobras, talos e itens próximos da validade cadastrados na despensa.
3. **Cota e viabilidade técnica no MVP:** O plano gratuito da Spoonacular limita o uso a 150 pontos/dia e exigia múltiplas requisições separadas (busca inicial + detalhamento de instruções). A API do Gemini via Google AI Studio oferece cota gratuita de até 1.500 requisições diárias sem necessidade de cartão de crédito e permite entregar ingredientes e passos estruturados em uma única chamada via *Structured Output* (JSON Schema).
4. **Desempenho e experiência do usuário:** Com a IA devolvendo os passos do preparo no mesmo payload da receita, o modal de detalhes abre instantaneamente ao clique do usuário, eliminando a espera por uma segunda requisição.
5. **Relevância acadêmica para o TCC:** Demonstra a aplicação prática de Engenharia de Software e IA Generativa orientada a um problema social e ambiental relevante.

### Cache-first para reduzir tokens do Gemini

A partir do v3, toda geração de receitas consulta primeiro a biblioteca do usuário no Supabase. A Edge Function só chama o Gemini quando a biblioteca não cobre a quantidade solicitada. A decisão reduz custo, latência e dependência da cota gratuita, além de permitir que a mesma receita seja reutilizada em templates, favoritas, lista de compras e chat.

### Planejamento com ciclo de 4 semanas e histórico

O planejamento semanal evolui para um modelo híbrido: mantém a recorrência dos slots, mas passa a registrar a semana real (`week_start`) e um ciclo de 4 semanas. Cada semana do ciclo pode ter um template, e o histórico preserva as semanas anteriores. A recorrência automática só aplica um template quando a semana nova está vazia, evitando sobrescrever planejamentos já feitos.

### Notificações in-app primeiro, push depois

O MVP das notificações será in-app, sem service worker. A evolução para PWA, push do navegador, VAPID e agendamento no backend está documentada, mas depende de infraestrutura adicional e fica fora do escopo atual.

### Dependências mínimas

A política do v3 é manter o mínimo possível de dependências de runtime. A única adição crítica é o Vitest, usado apenas em desenvolvimento para testar regras puras. Bibliotecas de gráficos, datas e push não entram no MVP.

### Evolução orientada por evidências

As próximas definições devem distinguir claramente três situações:

- **implementado:** existe no código e foi verificado;
- **estruturado:** existe uma base técnica, mas o usuário ainda não utiliza a funcionalidade completa;
- **planejado:** ainda depende de análise e implementação.

Essa distinção será usada quando os requisitos forem revisados.

## 8. Estado atual por área

| Área | Estado | Observação |
|---|---|---|
| Ambiente Backend / Node.js | Implementado | Runtime para build, tooling de desenvolvimento e funções serveless. |
| Interface React/Vite | Implementada | Aplicação executável e com build de produção (mobile-first). |
| Banco de dados Supabase (PostgreSQL) | Implementado | Armazenamento relacional e políticas de acesso (RLS). |
| Autenticação com Google | Implementada | Landing page pública, login via OAuth do Google, sessão persistida e logout. |
| Perfil do usuário | Implementado | Nome, e-mail e avatar do Google no cabeçalho e no menu lateral. |
| Gestão da despensa (CRUD) | Implementada | Cadastro, edição e exclusão suave (arquivamento) com validação e atualização reativa. |
| Listagem da despensa | Implementada | Inclui carregamento, vazio e erro. |
| Segurança RLS | Implementada no banco | Políticas vinculadas ao usuário. |
| Sugestão de receitas (Gemini / Google AI Studio) | Implementada | Geração via Edge Function + Structured Output em PT-BR nativo, com cache-first e biblioteca persistida desde a Fase 7. |
| Detalhamento de receitas (Gemini) | Implementado | Modal com tempo, porções, ingredientes faltantes/em estoque e modo de preparo passo a passo — dados embutidos na primeira resposta, sem segunda requisição. |
| Geração de receitas por IA (Open Source / Google AI Studio) | Implementada (Gemini) | Motor migrado do Spoonacular para o Gemini 2.0 Flash com PT-BR nativo. |
| Movimentação de estoque | Implementada (consumo) | Consumo total/parcial de receitas grava em `stock_movements` e atualiza a despensa de forma transacional. |
| Histórico “Minhas receitas” | Implementado | Tabela `user_recipes` com RLS, inventário agrupado, busca e linha do tempo por usuário. |
| Alertas de validade | Planejados | Ainda não existe regra ativa ou central de alertas. |
| Planejamento semanal com templates e histórico | Implementado (Fase 5) | Aba de planejamento com ciclo de 4 semanas, até 4 templates, aplicação atômica, editor de grade e histórico paginado de semanas passadas. |
| Biblioteca de receitas com IA | Implementada (Fase 7) | Tabela `recipes` com snapshot, deduplicação por título, RLS e geração cache-first. |
| Favoritas | Planejada (Fase 6) | Favorito com snapshot e aba própria em “Minhas receitas”. |
| Descobrir mais receitas | Implementado (Fase 7) | Modal com a biblioteca persistida, busca, paginação de 20 e geração de mais receitas. |
| Testes automatizados | Implementado (Fases 7 e 5) | Vitest com 44 testes unitários cobrindo normalização, ciclo de semanas, templates de planejamento e despensa. |
| Dark mode / Configurações | Planejado (Fase 8) | Tema claro, escuro e sistema, persistido em `localStorage`. |
| Lista de compras | Planejada (Fase 9) | Sugestões por consumo/entradas, faltantes do planejamento e itens manuais. |
| Entrada/reposição de estoque | Planejada (Fase 9) | Fluxo de `entry` em `stock_movements` e atualização transacional do saldo. |
| Smart Chef (chat) | Planejado (Fase 11, stretch) | Conversa persistida, contexto da despensa, ações estruturadas e limite de 7 mensagens/dia. |
| Notificações de vencimento | Planejadas (Fase 10, stretch) | Avisos in-app 7 dias antes do vencimento, com central e preferência de desativação. |
| Código de barras/Open Food Facts | Fora do escopo atual | Previsto para evolução futura. |
| PWA/offline | Planejada | Ainda não configurada. |
| Empacotamento mobile | Planejado | Capacitor será avaliado depois do MVP web. |

## 9. Limitações conhecidas

- A quantidade é atualizada automaticamente pelo consumo de receitas; o fluxo de entrada/reposição está planejado para a Fase 9 do v3.
- A tabela `stock_movements` recebe os consumos de receitas, mas ainda não possui tela própria de histórico; o histórico visível hoje é o de receitas executadas. O fluxo de entrada e a lista de compras do v3 usarão essa base.
- Ainda não é possível registrar um descarte e seu motivo.
- Os alertas de validade não foram implementados; estão planejados como notificações in-app na Fase 10 (stretch).
- Cada slot do planejamento aceita apenas uma receita; prato principal e acompanhamento exigem slots separados ou uma receita combinada.
- O planejamento semanal possui limite de 4 templates por usuário (um para cada semana do ciclo de 4 semanas).
- Não existe lista de compras automática a partir dos ingredientes faltantes do planejamento; a Fase 9 prevê essa derivação.
- O cache compara nomes normalizados literalmente; sinônimos e variações regionais podem não casar. O mínimo de 2 ingredientes em comum também pode excluir receitas que usam apenas 1 item da despensa.
- O limite diário conta chamadas de geração, não receitas individuais; uma chamada que gera várias receitas consome uma geração.
- O selo **Gerada agora** pode não aparecer após recarregar o modal, porque a listagem da biblioteca não distingue a origem da geração; é um refinamento cosmético.
- A biblioteca ainda não permite excluir receitas pela interface.
- A validação autenticada de ponta a ponta da Fase 7 (geração real, persistência e limite diário) depende da conta Google do usuário e permanece pendente.
- A configuração do provider Google no Supabase ainda depende do Client ID e do Client Secret gerados no Google Cloud Console.
- O login com Google exige que a URL de produção seja adicionada às origens autorizadas e às Redirect URLs do Supabase após o deploy.
- A ação de favoritar ainda não possui fluxo completo; está planejada para a Fase 6. O botão **Descobrir mais receitas** já está implementado.
- Não existe experiência offline nem instalação como PWA nesta etapa; o push do navegador também não está implementado.
- A estratégia de testes foi iniciada na Fase 7 com 16 testes unitários; testes de integração, RLS e fluxos autenticados ainda serão ampliados, conforme [`plano_testes.md`](./plano_testes.md).

## 10. Verificações realizadas até esta etapa

Durante a implementação foram realizados os seguintes controles:

- execução do ESLint sem erros;
- geração do build de produção pelo Vite;
- verificação do carregamento da aplicação local (landing page pública);
- implementação do gate de autenticação: nenhuma chamada à despensa ocorre sem sessão;
- confirmação de cadastro, consulta, edição e exclusão suave (arquivamento) de ingredientes no Supabase;
- confirmação visual e reativa da despensa com diálogo de confirmação para exclusão;
- verificação dos estados de carregamento, erro e lista vazia;
- chamada real da Edge Function com autenticação para busca de receitas via Gemini API;
- verificação do modal de detalhes com instruções passo a passo em PT-BR, tempo, porções e ingredientes faltantes vs em estoque;
- confirmação de receitas geradas 100% em português do Brasil (PT-BR nativo via Gemini);
- confirmação do carregamento instantâneo do modal (dados embutidos na primeira resposta);
- publicação da versão atualizada da função `recipe-suggestions` com motor Gemini;
- execução do ESLint e do build do Vite após a implementação da Fase 3, sem erros;
- teste unitário manual da correspondência de nomes (acentos, maiúsculas e plural) usada no consumo de receitas;
- execução do ESLint e do build do Vite após a implementação de “Minhas receitas”, sem erros;
- verificação da tabela `user_recipes` e da nova assinatura da RPC de consumo por meio de sessão autenticada;
- verificação formal da feature de kcal: campo `caloriesPerServing` no prompt e no schema da Edge Function, no card (`FeatureCard`), no modal (`RecipeDetailModal`), no inventário (`MyRecipesPage`) e na migration de persistência;
- execução do ESLint e do build do Vite após a implementação da Fase 4, sem erros;
- revisão do contrato entre `meal_plans`, `services/mealPlan.js`, `WeekPlanner` e `PlanMealModal`;
- aplicação das migrações `20261108200000_recipe_calories.sql` e `20261111234500_meal_plans.sql` no projeto remoto, confirmada por `supabase migration list --remote`;
- republicação da Edge Function `recipe-suggestions` em 11/11/2026, garantindo em produção o prompt com `caloriesPerServing` e o fallback entre modelos do Gemini;
- deploy do frontend confirmado em `https://smart-pantry-coral.vercel.app` (bundle `App-BUKnWRSJ.js` com o código do planejamento semanal);
- execução do ESLint e do build do Vite após o ajuste de rolagem do inventário, sem erros;
- smoke test via PostgREST: `meal_plans` e `user_recipes` existem e respondem `42501` (permission denied) para `anon`, confirmando tabelas presentes e grants corretos;
- criação e revisão dos documentos de planejamento v3 (`DECISOES_DE_PROJETO.md`, `plano_implementacao_v3.md` e `plano_testes.md`), sem alteração de código funcional nesta etapa;
- aplicação da migração `20261112120000_recipes_library.sql` no projeto remoto, com `supabase migration list --remote` confirmando as 7 migrações sincronizadas;
- republicação da Edge Function `recipe-suggestions` em 12/11/2026 com autenticação JWT, cache-first, persistência e limite diário;
- smoke test da Edge Function: `OPTIONS` retorna `200`; `POST` sem JWT e com JWT inválido retornam `401`;
- smoke test via PostgREST: `recipes` e `find_recipes_for_pantry` respondem `42501` (permission denied) para `anon`;
- execução de `npm test` com 16 testes unitários aprovados em 2 arquivos;
- execução do ESLint e do build do Vite após a Fase 7, sem erros (bundle `App-DGRzoN0o.js`);
- deploy do frontend confirmado em `https://smart-pantry-coral.vercel.app`; o chunk `App-DGRzoN0o.js` responde `200` e contém os textos do modal **Descobrir mais receitas**.

> [!NOTE]
> Todas as migrações locais estão sincronizadas com o projeto Supabase remoto em 12/11/2026: inicial, imagens, consumo, histórico, calorias, planejamento semanal e biblioteca de receitas (7 migrações). A Edge Function `recipe-suggestions` foi republicada na mesma data com o fluxo cache-first. O teste autenticado completo da Fase 7 permanece pendente.

Essas verificações demonstram o funcionamento técnico dos fluxos atuais. Elas não substituem a avaliação com usuários nem a medição de redução do desperdício.

## 11. Direção para os próximos incrementos

A Fase 7 foi concluída em 12/11/2026. A sequência aprovada para o restante do v3 é:

1. **Fase 5 — Templates de planejamento:** até 4 templates por usuário, ciclo de 4 semanas, aplicação com substituição, edição independente e histórico.
2. **Fase 6 — Favoritas:** coração em todos os pontos de receita e aba própria em “Minhas receitas”.
3. **Fase 8 — Dark mode:** aba Configurações, tema claro/escuro/sistema e aplicação em toda a interface.
4. **Fase 9 — Lista de compras:** fluxo de entrada/reposição, sugestões por consumo e volume, faltantes do planejamento e itens manuais.
5. **Fase 11 — Smart Chef (stretch):** chat com contexto da despensa, ações estruturadas e limite de 7 mensagens/dia.
6. **Fase 10 — Notificações (stretch):** avisos in-app de vencimento, central, adiar/dispensar e preferência nas configurações.

O registro da Fase 7 está em [`ESCOPO_INCREMENTO_5.md`](./ESCOPO_INCREMENTO_5.md).

Cada fase deve ser entregue com migração, documentação, testes e deploy próprios. As fases 10 e 11, assim como refinamentos apenas cosméticos, podem ser reduzidas ou adiadas se o tempo do TCC apertar.

## 12. Orientação para a futura revisão de requisitos

Quando os requisitos forem atualizados, cada um deverá nascer de uma evidência concreta, como:

- funcionalidade existente no código;
- necessidade identificada na pesquisa de campo;
- problema observado durante um teste;
- informação necessária para medir o objetivo do TCC;
- decisão de arquitetura devidamente justificada.

Os requisitos poderão então ser ligados aos casos de uso, tabelas, componentes, testes e resultados esperados. Essa abordagem permitirá construir posteriormente uma matriz de rastreabilidade coerente com o produto real.

A estratégia de verificação do v3 está documentada em [`plano_testes.md`](./plano_testes.md), com casos por fase, critérios de aceite, testes de RLS, usabilidade e smoke test de produção. A execução começou na Fase 7, com os testes unitários de normalização e contrato; os testes de integração, RLS e usabilidade serão ampliados nas próximas fases.

Até essa revisão, este documento deve ser tratado como o registro principal do estado da implementação. Ele deverá ser atualizado ao final de cada incremento relevante, registrando o que foi entregue, o que mudou e quais limitações permanecem.
