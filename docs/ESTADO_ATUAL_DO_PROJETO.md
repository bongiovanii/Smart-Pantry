# Smart Pantry — Estado atual do projeto

**Data de atualização:** 11 de novembro de 2026

**Versão do documento:** 1.1

**Fase atual:** base técnica concluída, CRUD da despensa, integração de receitas com IA, registro de consumo de receitas (Fase 3), histórico “Minhas receitas” por usuário, autenticação com Google e planejamento semanal persistente (Fase 4) implementados.

**Incremento documentado:** [`ESCOPO_INCREMENTO_4.md`](./ESCOPO_INCREMENTO_4.md) — planejamento semanal persistente. O incremento anterior permanece em [`ESCOPO_INCREMENTO_3.md`](./ESCOPO_INCREMENTO_3.md).

## Histórico de versões deste documento

| Versão | Data | Alteração registrada |
|---|---|---|
| 1.0 | 08/11/2026 | Consolidação do estado após o Incremento 3: histórico de receitas, autenticação com Google, deploy público, correção do 502 e kcal nas receitas. |
| 1.1 | 11/11/2026 | Fase 4 concluída: planejamento semanal persistente, tabela `meal_plans`, serviço e componentes de agendamento, snapshot compartilhado de receita, verificação formal da feature de kcal, aplicação das migrações pendentes e republicação da Edge Function. |


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

Depois que a despensa é carregada, os nomes dos ingredientes são enviados ao serviço de receitas. O sistema faz uma única consulta combinando os ingredientes disponíveis e solicita até seis sugestões.

Cada receita recebida é adaptada para o cartão da aplicação, contendo:

- identificador da receita;
- título;
- imagem;
- quantidade de ingredientes da despensa aproveitados;
- ingredientes utilizados e ingredientes faltantes retornados pelo serviço.

O endpoint atual não fornece o tempo de preparo nessa mesma consulta. Por isso, o cartão apresenta **Tempo não informado** quando esse dado não existe.

### 5.8 Integração protegida com o Gemini API (Google AI Studio)

A chave privada do Gemini não fica armazenada no frontend. O React chama uma Supabase Edge Function chamada `recipe-suggestions`, e somente essa função se comunica com a API do Gemini.

A Edge Function usa **Structured Output** (`response_mime_type: "application/json"` + `response_schema`) para garantir que o Gemini sempre retorne o formato exato esperado pelo frontend, eliminando erros de parsing. Todas as receitas são geradas 100% em português do Brasil (PT-BR) por instrução de sistema — sem dicionários de tradução.

O fluxo atual é:

1. o React carrega os ingredientes da despensa;
2. `recipe.js` extrai e normaliza os nomes (mantendo o PT-BR nativo);
3. o Supabase autentica a chamada à Edge Function;
4. a Edge Function valida a entrada e limita o tamanho da consulta;
5. monta o prompt com os ingredientes e um JSON Schema estrito;
6. o Gemini gera receitas completas em PT-BR (título, categoria, tempo, porções, ingredientes usados, faltantes e passos de preparo);
7. a Edge Function mapeia uma imagem por categoria (Unsplash) e devolve o JSON normalizado;
8. os dados são convertidos em cartões de receita e abertos no modal de detalhes instantaneamente.

### 5.9 Dados embutidos na primeira resposta

Com o Gemini, todos os dados da receita — incluindo passos de preparo (`steps`), tempo, porções e ingredientes — chegam na primeira (e única) chamada à Edge Function. O `RecipeDetailModal` abre instantaneamente sem precisar de uma segunda requisição, eliminando o estado de carregamento para o modo de preparo.

### 5.10 Tratamento dos estados da integração

A seção de receitas diferencia os seguintes estados:

- consulta em andamento;
- receitas carregadas;
- nenhuma receita encontrada;
- erro na consulta.

Também existe uma proteção contra a repetição da mesma requisição, reduzindo chamadas desnecessárias ao Gemini e preservando a cota do serviço.

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

## 6. Organização atual dos principais componentes

| Elemento | Responsabilidade no sistema |
|---|---|
| `Root.jsx` | Resolve a sessão inicial e controla o fluxo landing → login → aplicativo. |
| `LandingPage.jsx` | Apresenta a proposta do produto e direciona para login ou criação de conta. |
| `LoginScreen.jsx` | Oferece o login/cadastro com Google e trata carregamento e erros do OAuth. |
| `App.jsx` | Compõe a tela principal, controla a navegação entre a despensa e “Minhas receitas” e coordena o registro de consumo. |
| `MyRecipesPage.jsx` | Exibe o inventário, a busca e a linha do tempo das receitas executadas pelo usuário. |
| `WeekPlanner.jsx` | Renderiza a grade semanal persistente, com adicionar, abrir e remover refeições. |
| `PlanMealModal.jsx` | Permite escolher dia, tipo de refeição e receita antes de gravar o slot. |
| `IngredientModal.jsx` | Coleta e valida os dados do novo ingrediente. |
| `RecipeDetailModal.jsx` | Exibe ingredientes, tempo, porções e modo de preparo da receita. |
| `CookRecipeModal.jsx` | Confirma quais itens da despensa serão consumidos e em que quantidade. |
| `FeatureCard.jsx` | Apresenta visualmente uma receita. |
| `AppHeader.jsx` | Apresenta o cabeçalho, o avatar e o menu da conta com logout. |
| `UserAvatar.jsx` | Exibe o avatar do Google com fallback para a inicial do nome. |
| `pantry.js` | Executa os casos de consulta e cadastro da despensa. |
| `movements.js` | Registra o consumo dos ingredientes e o snapshot da receita via RPC transacional. |
| `userRecipes.js` | Consulta o histórico de receitas do usuário e normaliza os snapshots salvos. |
| `mealPlan.js` (serviço) | Lista, agenda/substitui e remove refeições do planejamento semanal. |
| `mealPlan.js` (lib) | Define dias da semana, rótulos e tipos de refeição aceitos pelo banco. |
| `recipeSnapshot.js` | Monta o snapshot compartilhado de receita usado pelo consumo e pelo planejamento. |
| `recipe.js` | Define o contrato entre a aplicação e o serviço de receitas. |
| `supabase.js` | Centraliza a criação do cliente Supabase com persistência e PKCE. |
| `auth.js` | Centraliza login Google, logout, sessão e dados do perfil. |
| `session.js` | Exige sessão autenticada antes de qualquer operação nos serviços. |
| `ingredientMatch.js` | Relaciona os nomes de ingredientes das receitas aos itens da despensa. |
| `recipe-suggestions/index.ts` | Protege a chave do Gemini, gera receitas em PT-BR via Structured Output e mapeia imagens por categoria. |
| Migração inicial | Cria tabelas, relacionamentos, validações, índices e políticas de segurança. |
| Migração da Fase 3 | Adiciona `status` a `pantry_items` e a função transacional de consumo. |
| Migração do histórico | Cria `user_recipes` com RLS e amplia a RPC para gravar o snapshot da receita na mesma transação. |
| Migração de calorias | Adiciona `calories_per_serving` ao histórico e amplia a RPC de consumo. |
| Migração do planejamento | Cria `meal_plans` com RLS, restrição de slot único e snapshot da receita. |

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
| Sugestão de receitas (Gemini / Google AI Studio) | Implementada | Geração via Edge Function + Structured Output em PT-BR nativo. |
| Detalhamento de receitas (Gemini) | Implementado | Modal com tempo, porções, ingredientes faltantes/em estoque e modo de preparo passo a passo — dados embutidos na primeira resposta, sem segunda requisição. |
| Geração de receitas por IA (Open Source / Google AI Studio) | Implementada (Gemini) | Motor migrado do Spoonacular para o Gemini 2.0 Flash com PT-BR nativo. |
| Movimentação de estoque | Implementada (consumo) | Consumo total/parcial de receitas grava em `stock_movements` e atualiza a despensa de forma transacional. |
| Histórico “Minhas receitas” | Implementado | Tabela `user_recipes` com RLS, inventário agrupado, busca e linha do tempo por usuário. |
| Alertas de validade | Planejados | Ainda não existe regra ativa ou central de alertas. |
| Planejamento semanal | Implementado (Fase 4) | Slots persistentes por dia e tipo de refeição, com snapshot da receita, substituição e remoção. |
| Código de barras/Open Food Facts | Fora do escopo atual | Previsto para evolução futura. |
| PWA/offline | Planejada | Ainda não configurada. |
| Empacotamento mobile | Planejado | Capacitor será avaliado depois do MVP web. |

## 9. Limitações conhecidas

- A quantidade é atualizada automaticamente pelo consumo de receitas; ainda não existe fluxo de entrada, descarte ou ajuste manual.
- A tabela `stock_movements` recebe os consumos de receitas, mas ainda não possui tela própria de histórico; o histórico visível hoje é o de receitas executadas.
- Ainda não é possível registrar um descarte e seu motivo.
- Os alertas de validade não foram implementados.
- O planejamento semanal é recorrente e não possui data inicial, histórico de semanas ou visão mensal.
- Cada slot do planejamento aceita apenas uma receita; prato principal e acompanhamento exigem slots separados ou uma receita combinada.
- Não existe lista de compras automática a partir dos ingredientes faltantes do planejamento.
- A configuração do provider Google no Supabase ainda depende do Client ID e do Client Secret gerados no Google Cloud Console.
- O login com Google exige que a URL de produção seja adicionada às origens autorizadas e às Redirect URLs do Supabase após o deploy.
- O botão para descobrir mais receitas e a ação de favoritar ainda não possuem fluxo completo.
- Não existe experiência offline nem instalação como PWA nesta etapa.
- Ainda será necessário ampliar a estratégia de testes automatizados e de observação de falhas.

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
- smoke test via PostgREST: `meal_plans` e `user_recipes` existem e respondem `42501` (permission denied) para `anon`, confirmando tabelas presentes e grants corretos.

> [!NOTE]
> Todas as migrações locais estão sincronizadas com o projeto Supabase remoto em 11/11/2026: inicial, imagens, consumo, histórico, calorias e planejamento semanal. A migração de calorias estava pendente desde 08/11/2026 e foi aplicada junto com a da Fase 4. A Edge Function também foi publicada novamente na mesma data.

Essas verificações demonstram o funcionamento técnico dos fluxos atuais. Elas não substituem a avaliação com usuários nem a medição de redução do desperdício.

## 11. Direção para os próximos incrementos

A sequência deverá ser escolhida conforme o backlog e o tempo do projeto. A evolução mais coerente a partir da base atual inclui:

1. completar o registro de entrada, ajuste e descarte em `stock_movements`;
2. criar a tela de histórico de movimentações e consolidar o saldo a partir delas;
3. criar alertas derivados da data de validade;
4. derivar uma lista de compras dos ingredientes faltantes do planejamento semanal;
5. preparar dados para medir consumo e desperdício;
6. avaliar PWA, funcionamento offline e empacotamento mobile;
7. revisar os requisitos com base no software consolidado.

Essa lista orienta o desenvolvimento, mas não representa ainda uma especificação definitiva.

## 12. Orientação para a futura revisão de requisitos

Quando os requisitos forem atualizados, cada um deverá nascer de uma evidência concreta, como:

- funcionalidade existente no código;
- necessidade identificada na pesquisa de campo;
- problema observado durante um teste;
- informação necessária para medir o objetivo do TCC;
- decisão de arquitetura devidamente justificada.

Os requisitos poderão então ser ligados aos casos de uso, tabelas, componentes, testes e resultados esperados. Essa abordagem permitirá construir posteriormente uma matriz de rastreabilidade coerente com o produto real.

Até essa revisão, este documento deve ser tratado como o registro principal do estado da implementação. Ele deverá ser atualizado ao final de cada incremento relevante, registrando o que foi entregue, o que mudou e quais limitações permanecem.
