# Plano de ação — TCC e aplicação Smart Pantry

**Data:** 17/09/2026  
**Base:** TCC Monografia V1 e feedback dos professores Paulo e Leandro.  
**Situação:** plano proposto; as alterações na monografia e na aplicação ainda não foram executadas.

## 1. Direção do trabalho

Conectar o problema pesquisado aos requisitos, à implementação e aos resultados avaliados. O TCC deve explicar por que o Smart Pantry existe, como foi desenvolvido e quais resultados foram efetivamente observados.

O questionário apresentado na V1 oferece indícios de demanda e aceitação das funcionalidades. Ele não mede a redução de desperdício após o uso da aplicação. Essa avaliação exige uma coleta própria.

O comentário “Fundamentação teórica: legal”, do professor Leandro, foi interpretado como avaliação positiva. A base existente será preservada e ampliada conforme o pedido do professor Paulo.

## 2. Atendimento ao feedback

| Feedback | Ação | Evidência de conclusão |
|---|---|---|
| Mais autores na introdução, especialmente nos dois primeiros parágrafos | Sustentar o panorama, o recorte doméstico e a relevância com fontes pertinentes | Afirmações centrais acompanhadas de citações e referências conferidas |
| Retirar “demonstrativo” do objetivo | Reescrever o objetivo geral e harmonizar resumo, abstract e demais trechos | Objetivo consistente em todo o documento |
| Resumir os desperdícios evitados | Explicar os tipos de desperdício que a aplicação pretende enfrentar; inserir quantidades somente após avaliação | Relação problema–funcionalidade e síntese dos resultados medidos |
| Organizar objetivos específicos: conceito, demanda etc. | Estruturar objetivos em conceituação, diagnóstico da demanda, requisitos, desenvolvimento e avaliação | Cada objetivo associado a uma seção e a um entregável |
| Ampliar autores, referências e discussão dos desperdícios | Aprofundar causas, categorias, prevenção, medição e engenharia de software | Referencial com discussão entre fontes e conexão com a solução |
| Apresentar fluxograma das etapas | Elaborar o fluxo de uso da aplicação e o fluxo do desenvolvimento | Figuras explicadas no texto e coerentes com o sistema |
| Medir redução do desperdício | Planejar comparação antes/depois e registrar descarte, consumo e contexto | Protocolo, dados, indicadores e análise das limitações |
| Explicitar o ciclo de engenharia de software | Documentar o processo iterativo realmente adotado | Etapas, entregáveis, validações e ajustes demonstrados |
| Matriz de rastreabilidade | Vincular demanda, requisito, caso de uso, implementação e teste | Requisitos prioritários com vínculos verificáveis |
| Diagrama e descrição de casos de uso | Modelar atores e interações e descrever os fluxos | Diagrama e especificações dos casos principais |
| Diagrama de classes | Modelar responsabilidades, atributos, operações e relações | Modelo coerente com a arquitetura adotada |
| Diagrama entidade-relacionamento | Modelar persistência, chaves e cardinalidades | DER coerente com o banco implementado |

## 3. Etapas de execução

### Etapa 1 — Conferir escopo e evidências disponíveis

- Comparar as funcionalidades descritas na monografia com o estado real da aplicação. Identificar o que está implementado, em desenvolvimento ou apenas previsto.
- Conferir os dados originais do questionário: número de participantes, período de coleta, critérios do público-alvo, denominadores e perguntas de múltipla escolha. Não deduzir o tamanho da amostra apenas dos percentuais.
- Separar diagnóstico de hábitos, aceitação da proposta, testes funcionais e avaliação do impacto.
- Conferir a numeração dos gráficos, incluindo o Gráfico 7 na lista, e a continuidade do texto da seção 4.2, que aparece interrompido no conteúdo extraído da V1.

**Entregável:** inventário do estado do projeto e lista de evidências disponíveis. Essa etapa orienta as demais e evita descrever como concluído algo ainda planejado.

### Etapa 2 — Revisar introdução e objetivos

**Objetivo geral proposto:**

> Desenvolver e avaliar uma aplicação de gestão de despensas domésticas, com controle de ingredientes e datas de validade e sugestão de receitas, visando à redução do desperdício de alimentos em residências da classe média brasileira.

**Objetivos específicos propostos:**

1. Conceituar o desperdício alimentar doméstico e seus impactos sociais, econômicos e ambientais.
2. Identificar hábitos, causas de descarte e necessidades do público-alvo.
3. Analisar soluções existentes e especificar os requisitos da aplicação.
4. Modelar e implementar o Smart Pantry por meio de um processo iterativo de engenharia de software.
5. Avaliar o funcionamento, a usabilidade e a variação do desperdício alimentar durante o uso da aplicação.

Na introdução, explicitar os desperdícios que serão enfrentados: produtos esquecidos até o vencimento, compras redundantes, ingredientes sem uso planejado e sobras de refeições. Associar cada problema a uma funcionalidade prevista, sem prometer sua eliminação.

**Entregável:** introdução revisada e mapa objetivo–seção–evidência. O resumo e o abstract receberão os resultados finais após a coleta.

### Etapa 3 — Ampliar a fundamentação teórica

Organizar o referencial em quatro eixos:

- Conceitos: perdas ao longo da cadeia, desperdício no consumo doméstico, partes comestíveis e resíduos inevitáveis.
- Comportamento: planejamento de compras, armazenamento, validade, preparo de porções e aproveitamento de sobras.
- Prevenção e avaliação: inventário, alertas, receitas e métodos de medição do descarte.
- Engenharia de software: requisitos, ciclo iterativo, modelagem, rastreabilidade e validação.

Preservar as fontes pertinentes da V1 e acrescentar estudos de outros autores, incluindo pesquisas brasileiras e internacionais. Diferenciar achados internacionais do que foi observado na amostra local. Utilizar a FAO para conceitos e prevenção, o UNEP para medição e o SWEBOK para engenharia; essas fontes têm funções diferentes e não substituem estudos sobre o público brasileiro.

**Entregável:** referencial ampliado, quadro fonte–afirmação–seção e referências padronizadas. Conferir os textos completos antes de incorporá-los à monografia.

### Etapa 4 — Documentar o ciclo e a modelagem

Descrever o ciclo aplicado ao projeto:

**Pesquisa e diagnóstico → requisitos → modelagem e interfaces → implementação → testes → avaliação com usuários → ajustes.**

Para cada etapa, registrar a atividade realizada, o artefato produzido e a decisão tomada. As iterações devem refletir o trabalho real, com evidências como versões, mudanças e resultados de testes.

Preparar os seguintes artefatos:

| Artefato | Conteúdo previsto |
|---|---|
| Fluxograma de desenvolvimento | Etapas do ciclo e retorno para ajustes |
| Fluxograma de uso | Cadastrar item → informar quantidade e validade → acompanhar despensa → receber alerta/consultar receitas → registrar consumo ou descarte → consultar indicadores |
| Casos de uso | Cadastrar e atualizar itens, consultar despensa, receber alertas, obter receitas, planejar refeições, registrar consumo/descarte e consultar resultados |
| Descrições dos casos de uso | Ator, objetivo, precondições, fluxo principal, alternativas, exceções e pós-condições |
| Diagrama de classes | Modelo coerente com as responsabilidades e operações da arquitetura real |
| DER | Entidades persistidas, atributos, chaves, cardinalidades e integridade |

Como ponto de partida para a modelagem, avaliar usuário/domicílio, produto, item ou lote da despensa, movimentação de consumo/descarte e planejamento de refeições. Um produto de catálogo deve ser distinguido de cada entrada na despensa: o mesmo produto pode ter quantidades e validades diferentes. A persistência de receitas e alertas dependerá da implementação escolhida.

Usar a notação UML nos diagramas de casos de uso e classes, conforme a [especificação da OMG](https://www.omg.org/spec/UML/2.5.1/About-UML). O DER terá seu próprio propósito de modelagem de dados.

**Entregável:** modelos editáveis, descrições e capítulo de metodologia atualizado.

### Etapa 5 — Criar rastreabilidade e ajustar a aplicação

O SWEBOK inclui especificação, validação e rastreamento de requisitos entre os temas de engenharia de software. Essa será a base para organizar os vínculos do projeto. [SWEBOK — tópicos](https://www.computer.org/education/bodies-of-knowledge/software-engineering/topics).

**Estrutura da matriz:** origem da demanda → requisito e critério de aceitação → caso de uso → componente/tela/dados → teste → resultado/status.

Exemplos propostos, ainda sujeitos à conferência da aplicação:

| Origem | Requisito | Caso de uso | Validação |
|---|---|---|---|
| Esquecimento de itens | RF01: controlar validade e avisar no prazo configurado | Acompanhar vencimentos | Conferir limites de datas e emissão do alerta |
| Falta de uso planejado | RF02: sugerir receitas com ingredientes disponíveis e priorizar os próximos do vencimento | Consultar receitas | Conferir correspondência dos ingredientes e prioridade |
| Necessidade de avaliar impacto | RF03: registrar quantidade, motivo e data do descarte | Registrar descarte | Conferir baixa parcial, saldo e histórico |
| Necessidade de avaliar impacto | RF04: consultar e exportar indicadores por período | Consultar resultados | Recalcular indicadores a partir dos registros |

Priorizar os ajustes necessários para gerar evidência:

- Cadastro manual de alimentos sem código de barras, especialmente hortifrúti.
- Quantidade, unidade, validade informada e baixa parcial de consumo ou descarte.
- Histórico preservado, com motivo do descarte e distinção entre movimentação e simples exclusão/correção de cadastro.
- Planejamento de porções e registro de sobras, caso o trabalho mantenha a proposta de enfrentar o preparo excessivo.
- Indicadores e exportação de dados para análise acadêmica.
- Tratamento de produtos não encontrados, falhas das APIs e compatibilização dos ingredientes.

Confirmar o que cada API fornece, suas condições de uso e seus limites. Não pressupor que o código de barras informe a validade de uma unidade comprada nem que a lista de componentes de um produto industrializado equivalha aos ingredientes disponíveis para cozinhar.

**Entregável:** matriz preenchida e versão da aplicação apta ao estudo. Antes do piloto, executar testes dos fluxos essenciais e tarefas de usabilidade com critérios definidos.

### Etapa 6 — Medir a variação do desperdício

Adotar um estudo exploratório antes/depois com os mesmos domicílios. Como proposta inicial, usar **14 dias de linha de base e 14 dias com a aplicação**; ajustar o período ao ciclo de compras e à disponibilidade dos participantes antes de iniciar. Os períodos e o tamanho da amostra ainda precisam ser definidos.

O UNEP apresenta orientações de medição e destaca o papel da linha de base para acompanhar progresso. O protocolo do TCC será uma adaptação ao estudo doméstico, sem alegar equivalência a uma medição nacional. [Food Waste Index Report 2024](https://www.unep.org/resources/publication/food-waste-index-report-2024).

Procedimento:

1. Definir recrutamento, critérios do público-alvo, consentimento e tratamento dos dados conforme os procedimentos acadêmicos aplicáveis.
2. Registrar o descarte diário nas duas fases pelo mesmo método, incluindo ingredientes e sobras. Preferir pesagem em gramas, descontando a embalagem, com apoio de registro padronizado e fotos quando viável.
3. Separar partes comestíveis desperdiçadas de resíduos inevitáveis. Documentar dados estimados e não misturá-los silenciosamente aos medidos.
4. Registrar moradores presentes, dias observados, refeições em casa e mudanças relevantes na rotina.
5. Na fase de intervenção, coletar também uso de alertas, receitas e baixas de consumo. O questionário final avaliará praticidade e dificuldades.
6. Comparar cada domicílio antes/depois e apresentar a distribuição dos resultados, os registros faltantes e as limitações.

**Indicador principal:** massa de alimento comestível descartado por pessoa/dia. Calcular a partir da massa descartada e dos dias de presença registrados, mantendo o mesmo critério nas duas fases.

**Variação percentual:** `(indicador antes − indicador durante o uso) / indicador antes × 100`.

Se a linha de base for zero, apresentar a diferença absoluta; a redução percentual não se aplica. Resultados negativos indicam aumento do descarte. Não somar unidades, mililitros e gramas sem conversão documentada.

**Indicadores complementares:** descarte por motivo e categoria, consumo registrado antes do vencimento, utilização de receitas e desempenho nas tarefas de usabilidade. Consumo após um alerta será apresentado como uso observado; isoladamente, ele não prova que o alimento seria desperdiçado.

Um estudo curto, por conveniência e sem grupo de controle permite relatar a variação observada no piloto, com limitações de atribuição e generalização. Simulações podem validar os cálculos, mas não substituirão resultados reais de redução.

**Entregável:** protocolo, dados organizados, gráficos comparativos e análise do piloto.

### Etapa 7 — Consolidar resultados e revisar o TCC

- Organizar a apresentação dos resultados: diagnóstico → requisitos e modelos → aplicação → testes → piloto → discussão.
- Inserir fluxogramas e diagramas com legenda, explicação e relação com os requisitos.
- Apresentar a síntese do desperdício observado antes/depois por quantidade, categoria e motivo, sem inventar benefícios ou extrapolar a amostra.
- Revisar expressões da V1 como “comprova estatisticamente a viabilidade de mercado” e “anula o descarte”, adequando as conclusões à evidência disponível.
- Reescrever resumo, abstract e conclusão com o que foi efetivamente desenvolvido e medido, incluindo limitações e trabalhos futuros.
- Conferir citações, referências, sumário, listas, tabelas, gráficos e coerência entre texto, modelos e implementação.

**Entregável:** próxima versão da monografia e checklist de atendimento ao feedback. A revisão final incluirá conferência textual e inspeção visual do documento renderizado.

## 4. Sequência e critérios de conclusão

Executar as etapas 1 e 2 primeiro. A ampliação do referencial pode acompanhar a documentação de engenharia. Definir o protocolo da etapa 6 antes do piloto; iniciar o uso da aplicação somente após os registros e fluxos necessários terem sido validados. Consolidar os resultados na etapa 7 após a coleta.

O plano estará concluído quando os pedidos dos professores tiverem evidências correspondentes, os requisitos prioritários estiverem rastreados e os resultados forem relatados conforme os dados coletados. Não há percentual de redução previamente garantido.

## 5. Fontes iniciais para a revisão

- [UNEP — Food Waste Index Report 2024](https://www.unep.org/resources/publication/food-waste-index-report-2024): panorama e orientações de medição.
- [FAO — How to reduce your food waste](https://www.fao.org/platform-food-loss-waste/food-waste/food-waste-reduction/how-to-reduce-your-food-waste/): conceitos e estratégias domésticas de prevenção.
- [Stancu et al. — Determinants of consumer food waste behaviour: Two routes to food waste](https://www.sciencedirect.com/science/article/pii/S0195666315003992): leitura candidata sobre rotinas e comportamento; conferir o texto completo antes da citação na monografia.
- [IEEE Computer Society — SWEBOK V4.0a](https://www.computer.org/education/bodies-of-knowledge/software-engineering/v4): base para organizar a documentação de engenharia.
- [OMG — UML 2.5.1](https://www.omg.org/spec/UML/2.5.1/About-UML): referência da notação de modelagem.

Essas fontes iniciam a revisão bibliográfica; não constituem uma lista completa de novos autores para o TCC.
