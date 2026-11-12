# Decisões de Projeto — Smart Pantry (Plano v3)

**Data:** 12 de novembro de 2026

**Versão:** 1.0

**Status:** decisões aprovadas; implementação do plano v3 ainda não iniciada.

**Documentos relacionados:**
- [`plano_implementacao_v3.md`](./plano_implementacao_v3.md)
- [`plano_testes.md`](./plano_testes.md)
- [`ESTADO_ATUAL_DO_PROJETO.md`](./ESTADO_ATUAL_DO_PROJETO.md)
- [`plano_implementacao_v2.md`](./plano_implementacao_v2.md) — fases 1 a 4, concluídas.

---

## 1. Finalidade

Este documento registra as perguntas levantadas antes do planejamento das fases 5 a 11 e as respostas aprovadas pelo responsável do projeto. Ele serve como fonte de verdade para o plano v3 e para futuras decisões de implementação.

As respostas foram dadas em 12/11/2026. Quando a resposta original era uma letra ou uma recomendação, ela foi transcrita aqui com a opção correspondente e com a interpretação adotada.

---

## 2. Resumo executivo

| Área | Decisão aprovada |
|---|---|
| Ordem de execução | Por dependência: **7 → 5 → 6 → 8 → 9 → 11 → 10** |
| Prioridade | Fases **10 e 11 são stretch**; partes apenas cosméticas também são stretch |
| Entrega | Um incremento por fase, com documentação, migração e deploy |
| Dependências | Mínimo possível para o MVP; documentar novas dependências e adicionar à stack apenas as críticas |
| Templates | Até **4 templates por usuário**, um por semana do ciclo de 4 semanas, com nome obrigatório e descrição opcional |
| Estrutura do template | 7 dias × 4 refeições, uma receita por slot |
| Aplicação de template | Substitui a semana ativa com confirmação; cópia do template; editar a semana não altera o template |
| Ciclo semanal | Recorrente + histórico de semanas em ciclos de 4 semanas |
| Receitas | Biblioteca persistida no Supabase; geração **cache-first** (base antes da IA) |
| Favoritas | Snapshot + ID canônico; abas Inventário / Favoritas / Histórico |
| Descobrir mais | Biblioteca de receitas geradas + botão para gerar mais, seguindo o cache-first |
| Dark mode | Configurações + `localStorage` + preferência do sistema + aplicação inteira |
| Lista de compras | Fluxo de entrada/compra + histórico de consumo; sugestões por frequência e quantidade |
| Notificações | **In-app por enquanto**; push do navegador documentado como evolução futura |
| Chatbot | Texto + cards de ação; uma conversa persistida; limite de **7 mensagens/dia** |
| Documentação | Plano v3, um incremento por fase, `ESTADO_ATUAL` em versão 2.0 e `plano_testes.md` antes dos testes |

---

## 3. Decisões por área

### A. Ordem, escopo e entrega

#### Q1. Ordem de execução
**Opções:**
- (a) Seguir 5 → 11.
- (b) Por dependência: 7 → 5 → 6 → 8 → 9 → 11 → 10.
- (c) Outra ordem.

**Resposta:** **(b)** — executar na ordem por dependência: **7 → 5 → 6 → 8 → 9 → 11 → 10**.

**Implicação:** a biblioteca de receitas (fase 7) vem primeiro porque alimenta templates, favoritas, lista de compras e chatbot. A fase 10 fica por último porque depende do chatbot e da central de notificações.

#### Q2. Prioridade para o TCC
**Pergunta:** todas as fases são obrigatórias? Se o tempo apertar, quais são “nice to have”?

**Resposta:** **as fases 10 e 11 podem ser stretch**. **Todas as partes que são apenas cosméticas também podem ser stretch.**

**Implicação:** o plano marca 10 e 11 como stretch. Dentro das demais fases, animações, polimento visual, badges e refinamentos sem impacto funcional também são tratados como stretch. O núcleo funcional das fases 5 a 9 tem prioridade.

#### Q3. Formato de entrega
**Opções:**
- (a) Um incremento por fase, com documentação, migração e deploy ao final de cada uma.
- (b) Um único release v3 no final.

**Resposta:** **(a)** — um incremento por fase, com documentação, migração e deploy ao final de cada uma.

**Implicação:** cada fase terá um `ESCOPO_INCREMENTO_N.md`, atualização do `ESTADO_ATUAL_DO_PROJETO.md`, migração aplicada no Supabase remoto e publicação na Vercel.

#### Q4. Dependências novas
**Pergunta:** podemos adicionar bibliotecas/serviços novos ou manter o mínimo possível?

**Resposta:** **manter o mínimo possível para o MVP**. Documentar as novas dependências e **adicionar à stack do projeto apenas as que forem críticas**.

**Implicação:**
- Sem novas dependências de runtime para dark mode, notificações in-app, lista de compras e chat (usar APIs nativas e Tailwind).
- Para testes, adicionar **Vitest** como dependência de desenvolvimento (crítica para a qualidade).
- Push do navegador (PWA/service worker/VAPID) fica documentado como evolução futura, sem implementação agora.
- Bibliotecas de gráficos e de datas não entram neste momento.

---

### B. Fase 5 — Aba de planejamento com templates

#### Q5. Templates
**Pergunta:** quantos templates por usuário? Nome obrigatório? Descrição? Limite?

**Resposta:** **até 4 templates por usuário, para cada semana do mês**, com **nome obrigatório** e **descrição opcional**.

**Interpretação adotada:** 4 templates por usuário, associados às **semanas 1 a 4 de um ciclo de 4 semanas** (um template por semana). O ciclo é a unidade que se repete e que possui histórico. Se a intenção era permitir 4 templates por semana (16 no total), o modelo pode ser ajustado; o plano v3 assume **4 no total**.

#### Q6. Estrutura do template
**Opções:**
- (a) 7 dias × 4 refeições, uma receita por slot.
- (b) Múltiplas receitas por refeição.
- (c) Outra estrutura.

**Resposta:** **(a)** — 7 dias × 4 refeições, uma receita por slot.

**Implicação:** o template usa os mesmos dias (`SEG` a `DOM`) e tipos (`Café da manhã`, `Almoço`, `Lanche`, `Jantar`) já existentes no planejamento semanal.

#### Q7. Ao aplicar um template
**Opções:**
- (a) Substituir a semana ativa com confirmação; o template é copiado e editar a semana não altera o template.
- (b) Mesclar com o que já existe.
- (c) Manter vínculo ao vivo.

**Resposta:** **(a)** — substituir a semana ativa com confirmação; o template é copiado e editar a semana **não** altera o template.

**Implicação:** a aplicação é uma cópia transacional para `meal_plans`. A edição da semana ativa é independente do template. O usuário pode optar por “Salvar semana atual como template” (recurso adicional do plano).

#### Q8. Modelo da semana
**Pergunta:** recorrente (SEG–DOM) ou semana com data real? A resposta pediu **os dois**, com histórico que reseta a cada 4 semanas e recorrência, e solicitou verificação de viabilidade.

**Resposta:** **os dois** — histórico de semanas que reseta a cada 4 semanas **e** recorrência. Verificar viabilidade.

**Análise de viabilidade:** **viável**. O plano adota um ciclo de 4 semanas ancorado em uma data inicial (segunda-feira). A semana corrente é calculada por módulo:

```text
week_index = floor((segunda_atual - segunda_inicial) / 7) % 4 + 1
```

- Os 4 templates se repetem a cada 4 semanas (recorrência).
- Cada semana aplicada é registrada em `meal_plan_weeks` com snapshot (histórico).
- Ao completar 4 semanas, o índice volta para 1; o histórico anterior é preservado.
- O usuário pode iniciar um novo ciclo manualmente (“Novo ciclo”), o que reinicia a contagem e cria um novo agrupamento de histórico.
- O cálculo é feito no cliente ao abrir o app; não é necessário cron no MVP. Um cron futuro pode aplicar templates automaticamente.

**Riscos:** fuso horário, mudança manual da data inicial e semanas sem template definido. O plano trata esses casos.

#### Q9. Fonte de receitas para montar o template
**Opções:**
- (a) Todas as receitas salvas (biblioteca da IA + favoritas + histórico), com busca.
- (b) Apenas as sugestões atuais da despensa.

**Resposta:** **(a)** — salvar todas as receitas no Supabase e puxar tudo de lá. Criar um **algoritmo que compara os nomes das receitas com a base de dados** para economizar tokens, evitando pedir ao Gemini sem necessidade. A mesma regra vale para a geração de receitas: **consultar a base primeiro** e só chamar a IA se não houver correspondência.

**Implicação:** a fase 7 (biblioteca de receitas + geração cache-first) é pré-requisito da fase 5. O picker de receitas do template consulta a tabela `recipes`, com busca por nome/categoria.

#### Q10. Ações do template
**Pergunta:** renomear, duplicar, excluir e definir como ativo?

**Resposta:** **sim para todas**.

---

### C. Fase 6 — Favoritas

#### Q11. Onde favoritar
**Opções:**
- (a) Card de sugestão, modal de detalhes, histórico e planejamento.
- (b) Apenas no card/modal.

**Resposta:** **(a)** — em todos os lugares: card, modal, histórico e planejamento.

#### Q12. O que a favorita guarda
**Opções:**
- (a) Snapshot completo + ID canônico.
- (b) Apenas referência ao ID.

**Resposta:** **(a)** — snapshot completo + ID canônico.

**Implicação:** a favorita continua abrindo mesmo se a receita sair das sugestões. O ID canônico é o `recipes.id` da biblioteca persistida.

#### Q13. Formato dentro de “Minhas receitas”
**Opções:**
- (a) Abas internas: Inventário | Favoritas | Histórico.
- (b) Uma seção abaixo do inventário.
- (c) Outra.

**Resposta:** **(a)** — abas internas **Inventário | Favoritas | Histórico**.

#### Q14. Funcionalidades da seção
**Pergunta:** busca, ordenação, remover favorita e abrir detalhes?

**Resposta:** **sim**.

---

### D. Fase 7 — Descobrir mais receitas

#### Q11. Persistência (decisão crítica)
**Opções:**
- (a) Persistir cada geração em uma tabela por usuário.
- (b) Guardar apenas o último lote gerado.
- (c) Não persistir; apenas aumentar o limite da chamada atual.

**Resposta:** **(a)** — persistir cada geração em uma tabela por usuário.

#### Q12. Comportamento do modal
**Opções:**
- (a) Biblioteca de receitas já geradas + botão “Gerar mais receitas”.
- (b) Apenas mostrar o que já foi gerado.
- (c) Sempre gerar novas ao abrir.

**Resposta:** **(a)** — biblioteca + “Gerar mais receitas”, **seguindo o padrão do B9** (cache-first: base antes da IA).

#### Q13. Deduplicação e limites
**Pergunta:** como evitar repetidas? Paginação? Limite diário?

**Resposta:** **ID único por geração, dedupe visual por título normalizado, paginação de 20 e limite de 10 gerações/dia por usuário.**

#### Q14. Receitas antigas
**Pergunta:** começar só da implementação ou importar snapshots do histórico?

**Resposta:** **começar da implementação**; o histórico existente continua separado.

---

### E. Fase 8 — Dark mode

#### Q15. Configuração
**Pergunta:** onde fica o toggle? Onde persistir? Seguir o sistema? Aplicar na landing/login?

**Resposta:** **Configurações + `localStorage` + preferência do sistema como padrão + dark mode em toda a aplicação, incluindo landing/login.**

#### Q16. Página de configurações
**Pergunta:** só dark mode por enquanto?

**Resposta:** **sim, somente dark mode por enquanto** (com espaço para futuras opções).

---

### F. Fase 9 — Minha lista de compras

#### Q15. Fonte de dados (decisão crítica)
**Opções:**
- (a) Criar um fluxo de Repor/Entrada na despensa e gravar `entry` em `stock_movements`.
- (b) Inferir da criação/quantidade atual dos itens.
- (c) Usar apenas a frequência de consumo.

**Resposta:** **(a)** — criar o fluxo de **Repor/Entrada** e gravar `entry` em `stock_movements`.

**Implicação:** a fase 9 começa pelo fluxo de entrada, incluindo o registro de entrada na criação de um novo item da despensa. Sem isso, não há como medir “itens que entram em maior quantidade”.

#### Q16. Regra de sugestão
**Pergunta:** janela de análise, itens abaixo do limite, faltantes do planejamento.

**Resposta:** **90 dias, itens abaixo do limite, e faltantes do plano em uma seção separada** (“Para o planejamento”).

#### Q17. Funcionalidades da lista
**Pergunta:** marcar comprado, remover, adicionar manual, agrupar por categoria?

**Resposta:** **sim para todas**.

#### Q18. Quantidade sugerida
**Pergunta:** média consumida, última entrada ou quantidade fixa?

**Resposta:** **média das últimas 3 entradas/consumos**.

#### Q19. Ao marcar como comprado
**Pergunta:** oferecer entrada automática na despensa?

**Resposta:** **sim, com confirmação e quantidade editável**.

---

### G. Fase 10 — Notificações de vencimento

#### Q20. Canal (decisão crítica)
**Opções:**
- (a) Só notificação dentro do app.
- (b) In-app + push do navegador (PWA, service worker, VAPID e agendamento no backend).
- (c) E-mail.

**Resposta:** **(a) por enquanto** — in-app. **O futuro é o (b)**, com in-app + push do navegador (PWA, service worker, VAPID e agendamento no backend). **Documentar essa evolução.**

#### Q21. Frequência e janela
**Pergunta:** frequência, janela de 7 dias, itens vencidos, agregação.

**Resposta:** **1x/dia por item, 7 dias antes + vencidos, um aviso por item em uma central de notificações.**

#### Q22. Clique na notificação
**Pergunta:** abrir o chat preenchido e o usuário envia, ou enviar automaticamente?

**Resposta:** **abrir o chat com o texto preenchido; o usuário confirma o envio.**

#### Q23. Estado da notificação
**Pergunta:** dispensar/adiar e persistir? Opção nas configurações?

**Resposta:** **sim, dispensar/adiar por 1 dia e persistir**. **Adicionar uma opção nas Configurações para desativar as notificações dentro do app.**

---

### H. Fase 11 — Chatbot Smart Chef

#### Q24. Histórico
**Pergunta:** persistir por usuário? Uma conversa ou várias?

**Resposta:** **uma conversa persistida por usuário, com botão “Limpar conversa”.**

#### Q25. Capacidades (decisão crítica)
**Opções:**
- (a) Texto + cards estruturados com ações (“Salvar receita”, “Adicionar ao planejamento”, “Adicionar à lista de compras”).
- (b) Apenas texto.
- (c) Texto + ações livres.

**Resposta:** **(a)** — texto + cards estruturados com ações.

**Implicação:** o modelo retorna uma resposta textual e, opcionalmente, ações estruturadas. O usuário confirma cada ação na interface; o modelo não executa nada sozinho.

#### Q26. Contexto e modelo
**Pergunta:** contexto automático, modelo e streaming.

**Resposta:** **sim para o contexto** (despensa, itens vencendo, plano ativo, favoritas), **mesmo Gemini Flash-Lite com fallback** e **streaming se for viável**.

**Decisão de MVP:** implementar sem streaming primeiro; streaming fica como refinamento stretch.

#### Q27. Botão e acesso
**Opções:**
- (a) Smart Chef substitui “Novo ingrediente” no sidebar; manter “Novo ingrediente” no card da despensa e adicionar um FAB no mobile.
- (b) Outro lugar.

**Resposta:** **(a)**.

#### Q28. Limite de uso
**Pergunta:** limite de mensagens por dia?

**Resposta:** **7 mensagens por dia**, com **aviso no modal do Smart Chef**.

---

### I. Documentação e qualidade

#### Q29. Plano v3
**Pergunta:** nome do plano, versão do `ESTADO_ATUAL` e incremento por fase.

**Resposta:** **plano em `docs/plano_implementacao_v3.md`; `ESTADO_ATUAL_DO_PROJETO.md` em versão 2.0; cada fase vira um `ESCOPO_INCREMENTO_N.md` com deploy e atualização do estado.**

#### Q30. Testes
**Pergunta:** testes automatizados ou validação manual?

**Resposta:** **testes automatizados para as regras críticas, com validação manual para os fluxos de UI**. **Antes de fazer os testes, criar um plano de testes simples em `docs/plano_testes.md`.**

---

## 4. Interpretações e assunções adotadas

1. **4 templates = 4 semanas do ciclo.** Cada template tem um `week_index` de 1 a 4 e o ciclo se repete a cada 4 semanas. O limite é 4 templates por usuário, não 4 por semana.
2. **A semana ativa continua em `meal_plans`.** Os templates ficam em tabelas próprias; a aplicação copia o template para a semana ativa. O histórico fica em `meal_plan_weeks`.
3. **Biblioteca de receitas por usuário.** A tabela `recipes` tem RLS por `user_id`. Um cache global entre usuários não será implementado agora; fica documentado como possível evolução.
4. **Cache-first por assinatura da despensa e sobreposição de ingredientes.** A Edge Function consulta a biblioteca antes do Gemini; se não houver receitas suficientes, gera apenas o que falta.
5. **Notificações in-app.** A geração é feita ao abrir o app (e periodicamente enquanto aberto), não por push em segundo plano. Push fica documentado para o futuro.
6. **Chat sem streaming no MVP.** A interface mostra estado de carregamento; streaming é refinamento stretch.
7. **Dependências.** A única dependência nova crítica é o Vitest (desenvolvimento). O restante usa o que já existe.
8. **Cosméticos são stretch.** Badges, animações, polimento de empty states e refinamentos visuais não bloqueiam a entrega funcional.

---

## 5. Impactos arquiteturais

### 5.1 Novas tabelas previstas

| Tabela | Fase | Papel |
|---|---|---|
| `recipes` | 7 | Biblioteca de receitas persistidas por usuário, com favoritas e cache. |
| `meal_plan_templates` | 5 | Até 4 templates por usuário, um por semana do ciclo. |
| `meal_plan_template_items` | 5 | Slots (dia × refeição) de cada template. |
| `meal_plan_cycles` | 5 | Ciclos de 4 semanas. |
| `meal_plan_weeks` | 5 | Histórico de semanas aplicadas com snapshot. |
| `shopping_list_items` | 9 | Lista de compras persistida (manual e sugestões aceitas). |
| `user_settings` | 10 | Preferências do usuário (notificações). |
| `notifications` | 10 | Central de notificações in-app. |
| `chat_messages` | 11 | Histórico da conversa com o Smart Chef. |

### 5.2 Novas funções/RPCs previstas

- `find_recipes_by_ingredients(...)` — busca cache-first na biblioteca.
- `apply_meal_plan_template(...)` — aplica um template à semana ativa em transação.
- `get_or_create_active_cycle()` — garante o ciclo de 4 semanas.
- `record_pantry_entry(...)` — registra entrada e atualiza o saldo.
- `create_pantry_item_with_entry(...)` — cria item já com movimentação de entrada.
- `get_shopping_suggestions(...)` — agrega consumo/entradas e retorna sugestões.
- `generate_expiration_notifications()` — gera notificações in-app.
- `get_chat_usage_today()` / limite de mensagens — controle de cota do chat.

### 5.3 Novas Edge Functions

- `recipe-suggestions` (evolução): cache-first na biblioteca antes do Gemini.
- `chef-chat` (nova): conversa com o chef, contexto da despensa e ações estruturadas.

### 5.4 Novas dependências

| Dependência | Tipo | Motivo | Criticidade |
|---|---|---|---|
| `vitest` | desenvolvimento | Testes unitários das regras críticas. | Crítica |
| `@testing-library/react` + `jsdom` | desenvolvimento | Testes de componentes/hooks, se necessário. | Opcional |
| PWA/service worker + `web-push` | runtime (futuro) | Push do navegador. | Fora do MVP |

---

## 6. O que fica para o futuro

- Push do navegador com app fechado (PWA, service worker, VAPID, cron no backend).
- Cache global de receitas entre usuários.
- Streaming das respostas do Smart Chef.
- Dashboard de consumo/desperdício com gráficos.
- Preferências alimentares, alergias e restrições no chat.
- Planejamento por data real com histórico mensal completo.
- Exportação/compartilhamento da lista de compras.

---

## 7. Histórico de versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 12/11/2026 | Registro das perguntas e respostas que orientam o plano v3. |
