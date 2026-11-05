# Smart Pantry — Estado atual do projeto

**Data de atualização:** 14 de outubro de 2026  
**Fase atual:** base técnica concluída, cadastro da despensa implementado e primeira integração de receitas em funcionamento.

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
- **Autenticação:** Supabase Auth. *Situação atual:* opera com sessão anônima (`anon`) para viabilizar testes rápidos sem atrito. *Necessidade identificada:* configurar a autenticação formal no Supabase (e-mail/senha ou provedores sociais) para permitir persistência de conta entre múltiplos dispositivos e recuperação de acesso.
- **Geração / Consulta de Receitas:** Gemini API (Google AI Studio) integrada via Supabase Edge Function com Structured Output (JSON Schema). Receitas geradas 100% em português do Brasil (PT-BR) com ingredientes, passos de preparo e metadados entregues em uma única requisição. Motor anterior (Spoonacular) removido.

### Interface da aplicação

O frontend foi construído com React e Vite. O React organiza a tela em componentes e controla os estados da aplicação, como carregamento, erro, abertura do formulário e atualização das listas. O Vite fornece o ambiente de desenvolvimento e gera a versão de produção.

A interface segue a abordagem mobile-first. Em telas pequenas, a navegação é apresentada na parte inferior; em telas maiores, a aplicação utiliza menu lateral e distribuição semelhante a um sistema web para computador.

### Camada de serviços

Os componentes visuais não acessam diretamente o banco de dados nem a API externa. Essa comunicação foi concentrada em serviços próprios:

- `pantry.js`: inicia ou reutiliza a sessão do usuário, consulta a despensa e cadastra ingredientes;
- `recipe.js`: prepara os ingredientes, chama a função de receitas e converte a resposta para o formato utilizado pelos cartões da interface;
- `supabase.js`: cria e disponibiliza a conexão central com o projeto Supabase.

Essa separação facilita a manutenção e evita que regras de integração fiquem espalhadas pela interface.

### Backend e dados

O Supabase exerce três funções principais no projeto:

1. identificar o usuário por meio de uma sessão anônima;
2. armazenar os dados da despensa em um banco PostgreSQL;
3. executar a Edge Function responsável pela integração com o Gemini API.

A sessão anônima permite separar os dados de cada usuário sem exigir um cadastro tradicional nesta primeira versão. Essa escolha simplifica o acesso ao MVP, mas ainda permite aplicar regras de segurança por usuário.

## 5. Capacidades implementadas

### 5.1 Interface responsiva

A aplicação possui uma tela principal adaptável para celular e computador. A mesma base atende as duas experiências, alterando a navegação e a distribuição dos elementos conforme o espaço disponível.

Já estão presentes na interface:

- cabeçalho da aplicação;
- navegação lateral para computador;
- navegação inferior para celular;
- área de cadastro e visualização da despensa;
- seção de sugestões de receitas;
- representação inicial do planejamento semanal.

O planejamento semanal permanece demonstrativo e ainda não possui persistência ou regras de negócio.

### 5.2 Sessão de usuário

Ao acessar a aplicação, o serviço da despensa verifica se já existe uma sessão Supabase. Quando não existe, o sistema solicita uma sessão anônima.

Essa sessão fornece um identificador único utilizado no cadastro e na consulta dos itens. Com isso, cada usuário visualiza somente a própria despensa.

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
| `pantry_items` | Armazena os ingredientes, quantidades, unidades, validade e vínculo com o usuário. Já participa do funcionamento da aplicação. |
| `stock_movements` | Estrutura preparada para registrar entradas, consumo, desperdício, ajustes e estornos. Ainda não está ligada à interface. |

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

## 6. Organização atual dos principais componentes

| Elemento | Responsabilidade no sistema |
|---|---|
| `App.jsx` | Compõe a tela principal e coordena o carregamento da despensa e das receitas. |
| `IngredientModal.jsx` | Coleta e valida os dados do novo ingrediente. |
| `FeatureCard.jsx` | Apresenta visualmente uma receita. |
| `AppHeader.jsx` | Apresenta o cabeçalho principal. |
| `pantry.js` | Executa os casos de consulta e cadastro da despensa. |
| `recipe.js` | Define o contrato entre a aplicação e o serviço de receitas. |
| `supabase.js` | Centraliza a criação do cliente Supabase. |
| `recipe-suggestions/index.ts` | Protege a chave do Gemini, gera receitas em PT-BR via Structured Output e mapeia imagens por categoria. |
| Migração inicial | Cria tabelas, relacionamentos, validações, índices e políticas de segurança. |

## 7. Decisões de engenharia já adotadas

### Cadastro manual antes do código de barras

A leitura de código de barras e a integração com a Open Food Facts foram deixadas para uma etapa futura. O cadastro manual foi priorizado porque permite validar a utilidade da despensa e a persistência dos dados com menor complexidade.

### Aplicação web mobile-first

O MVP é desenvolvido como aplicação web responsiva. O empacotamento por Capacitor e os recursos completos de PWA permanecem como possibilidades posteriores, depois que os fluxos principais estiverem estáveis.

### Serviços separados da interface

O acesso ao Supabase e à API de receitas foi retirado dos componentes visuais. Essa decisão reduz o acoplamento e permite alterar integrações sem reconstruir toda a tela.

### Segredos somente no backend

O frontend contém apenas dados publicáveis necessários ao cliente Supabase. A chave da Spoonacular é armazenada como segredo da Edge Function e não é enviada ao navegador.

### Transição de autenticação anônima para autenticação completa

A autenticação anônima do Supabase Auth serviu como viabilizador para o MVP sem atrito de cadastro. Contudo, para o uso persistente entre múltiplos dispositivos e recuperação segura de conta, a configuração de autenticação formal (e-mail/senha ou OAuth) no Supabase é uma necessidade prioritária já planejada na arquitetura.

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
| Autenticação anônima | Implementada | Identifica e separa a despensa do usuário localmente. |
| Autenticação completa (Supabase Auth) | Planejada / Em configuração | Necessária para suporte a login multi-dispositivo e persistência definitiva. |
| Gestão da despensa (CRUD) | Implementada | Cadastro, edição e exclusão suave (arquivamento) com validação e atualização reativa. |
| Listagem da despensa | Implementada | Inclui carregamento, vazio e erro. |
| Segurança RLS | Implementada no banco | Políticas vinculadas ao usuário. |
| Sugestão de receitas (Gemini / Google AI Studio) | Implementada | Geração via Edge Function + Structured Output em PT-BR nativo. |
| Detalhamento de receitas (Gemini) | Implementado | Modal com tempo, porções, ingredientes faltantes/em estoque e modo de preparo passo a passo — dados embutidos na primeira resposta, sem segunda requisição. |
| Geração de receitas por IA (Open Source / Google AI Studio) | Implementada (Gemini) | Motor migrado do Spoonacular para o Gemini 2.0 Flash com PT-BR nativo. |
| Movimentação de estoque | Estruturada no banco | Ainda não existe fluxo na interface. |
| Alertas de validade | Planejados | Ainda não existe regra ativa ou central de alertas. |
| Planejamento semanal | Demonstrativo | Interface sem persistência. |
| Código de barras/Open Food Facts | Fora do escopo atual | Previsto para evolução futura. |
| PWA/offline | Planejada | Ainda não configurada. |
| Empacotamento mobile | Planejado | Capacitor será avaliado depois do MVP web. |

## 9. Limitações conhecidas

- A quantidade do ingrediente ainda não é atualizada automaticamente por consumo ou entrada de estoque.
- A tabela `stock_movements` ainda não recebe registros da aplicação.
- Ainda não é possível registrar um descarte e seu motivo.
- Os alertas de validade não foram implementados.
- O planejamento semanal ainda é uma representação visual.
- A autenticação anônima atual impede que o usuário acesse seus dados a partir de outro dispositivo ou recupere a conta caso limpe o navegador. É necessário configurar a autenticação completa no Supabase.
- O botão para descobrir mais receitas e a ação de favoritar ainda não possuem fluxo completo.
- Não existe experiência offline nem instalação como PWA nesta etapa.
- Ainda será necessário ampliar a estratégia de testes automatizados e de observação de falhas.

## 10. Verificações realizadas até esta etapa

Durante a implementação foram realizados os seguintes controles:

- execução do ESLint sem erros;
- geração do build de produção pelo Vite;
- verificação do carregamento da aplicação local;
- confirmação de cadastro, consulta, edição e exclusão suave (arquivamento) de ingredientes no Supabase;
- confirmação visual e reativa da despensa com diálogo de confirmação para exclusão;
- verificação dos estados de carregamento, erro e lista vazia;
- chamada real da Edge Function com autenticação para busca de receitas via Gemini API;
- verificação do modal de detalhes com instruções passo a passo em PT-BR, tempo, porções e ingredientes faltantes vs em estoque;
- confirmação de receitas geradas 100% em português do Brasil (PT-BR nativo via Gemini);
- confirmação do carregamento instantâneo do modal (dados embutidos na primeira resposta);
- publicação da versão atualizada da função `recipe-suggestions` com motor Gemini.

Essas verificações demonstram o funcionamento técnico dos fluxos atuais. Elas não substituem a avaliação com usuários nem a medição de redução do desperdício.

## 11. Direção para os próximos incrementos

A sequência deverá ser escolhida conforme o backlog e o tempo do projeto. A evolução mais coerente a partir da base atual inclui:

1. registrar entrada, consumo, ajuste e descarte em `stock_movements`;
2. atualizar a quantidade a partir das movimentações;
3. configurar autenticação completa no Supabase (e-mail/senha ou OAuth) para permitir login seguro e multi-dispositivo;
4. criar alertas derivados da data de validade;
5. transformar o planejamento semanal em uma funcionalidade persistente;
6. preparar dados para medir consumo e desperdício;
7. avaliar PWA, funcionamento offline e empacotamento mobile;
8. revisar os requisitos com base no software consolidado.

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
