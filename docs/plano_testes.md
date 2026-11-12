# Plano de Testes — Smart Pantry

**Data:** 12 de novembro de 2026

**Versão:** 1.0

**Status:** planejamento; execução começa junto da Fase 7.

**Documentos relacionados:**
- [`plano_implementacao_v3.md`](./plano_implementacao_v3.md)
- [`DECISOES_DE_PROJETO.md`](./DECISOES_DE_PROJETO.md)
- [`ESTADO_ATUAL_DO_PROJETO.md`](./ESTADO_ATUAL_DO_PROJETO.md)

---

## 1. Objetivo

Definir a estratégia, os casos e os critérios de aceite dos testes do Smart Pantry durante as fases 5 a 11, garantindo que as regras críticas — cache de receitas, ciclo de planejamento, agregação da lista de compras, notificações e limites do chat — sejam verificadas de forma reproduzível.

Este plano existe para dar suporte à documentação do TCC e para evitar que os testes sejam executados de forma improvisada.

---

## 2. Escopo

### 2.1 Dentro do escopo

- Regras puras de normalização, ciclo semanal, sugestões de compra, vencimento e limite de chat.
- Serviços de integração com o Supabase (CRUD, RLS, RPCs).
- Fluxos de interface das fases 5 a 11.
- Responsividade e acessibilidade básica.
- Segurança de dados entre usuários.
- Deploy e smoke test em produção.

### 2.2 Fora do escopo

- Testes de carga e stress.
- Testes de penetração completos.
- Compatibilidade com navegadores antigos.
- Push do navegador com app fechado (evolução futura).
- Testes automatizados de UI em larga escala.

---

## 3. Estratégia

A estratégia segue uma pirâmide adaptada ao tamanho do projeto:

```text
        Smoke tests manuais em produção
             (poucos, críticos)
          Testes de integração manuais
            (fluxos completos de UI)
      Testes unitários automatizados (Vitest)
        (regras puras e transformações)
```

### 3.1 Testes unitários (Vitest)

- Funções puras em `app/src/lib`.
- Sem dependência de rede ou banco.
- Executados em cada alteração e no CI local (`npm test`).
- Cobertura prioritária: normalização, ciclo de semanas, agregação de compras, vencimento, tema e limite de chat.

### 3.2 Testes de integração manuais

- Executados no ambiente local (`npm run dev`) com um usuário de teste.
- Cobrem serviços + banco + interface.
- Evidência: captura de tela ou descrição do resultado.

### 3.3 Smoke tests de produção

- Executados após cada deploy na Vercel.
- Verificam login, despensa, receitas, planejamento e a funcionalidade da fase entregue.
- Não substituem os testes de integração.

---

## 4. Ferramentas e ambiente

| Item | Valor |
|---|---|
| Gerenciador de pacotes | npm |
| Testes unitários | Vitest |
| Lint | ESLint |
| Build | Vite |
| Banco | Supabase remoto `cojcrquveckvrdzjivmc` |
| Frontend local | `http://localhost:5173` |
| Produção | `https://smart-pantry-coral.vercel.app` |
| Navegador principal | Chrome/Chromium atualizado |
| Navegador secundário | Firefox atualizado |
| Mobile | Emulação no DevTools (360 px, 390 px e 414 px) |
| Usuário de teste | Conta Google de teste com dados sintéticos |

### 4.1 Comandos

```bash
cd app
npm run lint
npm run build
npm test
npm run test:coverage
```

### 4.2 Dados de teste

Criar uma conta de teste com:

- 12 itens na despensa, sendo:
  - 2 vencendo em 3 e 6 dias;
  - 1 já vencido;
  - itens com unidades variadas (`un`, `g`, `kg`, `ml`, `l`);
  - 2 itens com estoque zerado.
- Pelo menos 5 consumos e 4 entradas em `stock_movements`.
- 2 receitas favoritas.
- 1 template de planejamento com 5 refeições.
- 1 semana anterior no histórico.

---

## 5. Critérios de entrada e saída

### 5.1 Entrada

- Migração aplicada no ambiente de teste.
- Build e lint sem erros.
- Funcionalidade implementada e integrável.
- Casos de teste da fase revisados.

### 5.2 Saída

- Todos os casos **P0** e **P1** aprovados.
- Nenhum defeito aberto de severidade alta ou crítica.
- Defeitos médios documentados com plano de correção.
- Evidências registradas.
- `ESTADO_ATUAL_DO_PROJETO.md` atualizado.

### 5.3 Severidades

| Severidade | Definição | Tratamento |
|---|---|---|
| Crítica | Perda de dados, vazamento entre usuários ou bloqueio total. | Corrigir antes do deploy. |
| Alta | Funcionalidade principal não funciona. | Corrigir antes do deploy. |
| Média | Funciona com erro contornável ou problema visual relevante. | Corrigir na fase ou registrar. |
| Baixa | Cosmético ou melhoria. | Pode ficar para depois. |

### 5.4 Prioridades

| Prioridade | Definição |
|---|---|
| P0 | Caminho crítico; bloqueia a entrega. |
| P1 | Importante; deve ser testado na fase. |
| P2 | Complementar; pode ser adiado. |

---

## 6. Casos de teste por fase

### 6.1 Fase 7 — Biblioteca e cache-first

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-07-01 | P0 | Normalização de título | Gerar “Macarrão à Bolonhesa” e “macarrao a bolonhesa”. | As duas receitas são tratadas como a mesma e não duplicam. |
| CT-07-02 | P0 | Persistência da geração | Gerar receitas, recarregar a página e abrir “Descobrir mais receitas”. | As receitas continuam disponíveis. |
| CT-07-03 | P0 | Cache hit | Buscar receitas duas vezes com a mesma despensa. | A segunda busca não chama o Gemini e retorna `source: "cache"`. |
| CT-07-04 | P1 | Cache parcial | Remover um ingrediente da despensa e buscar novamente. | Receitas compatíveis vêm do cache; a diferença é gerada pela IA. |
| CT-07-05 | P1 | Limite diário | Realizar 10 gerações no mesmo dia e tentar a 11ª. | A 11ª é bloqueada com mensagem clara e contador em zero. |
| CT-07-06 | P1 | Deduplicação visual | Gerar receitas com títulos repetidos. | A biblioteca mostra uma única entrada por título normalizado. |
| CT-07-07 | P1 | Paginação | Ter mais de 20 receitas e navegar entre páginas. | A paginação retorna 20 por página e mantém a busca. |
| CT-07-08 | P0 | RLS | Autenticar com dois usuários e tentar ler receitas do outro via API. | O acesso é negado. |
| CT-07-09 | P2 | Falha do Gemini | Simular erro 429/500 na Edge Function. | A interface mostra erro amigável e a biblioteca continua acessível. |
| CT-07-10 | P1 | Fonte da resposta | Verificar o badge “Da sua biblioteca” e “Gerada agora”. | O badge corresponde à origem real da receita. |

### 6.2 Fase 5 — Templates de planejamento

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-05-01 | P0 | Criar template | Criar template com nome e descrição. | Template aparece na lista com a semana correta. |
| CT-05-02 | P0 | Limite de 4 | Criar o 5º template. | A criação é bloqueada com mensagem clara. |
| CT-05-03 | P0 | Nome obrigatório | Tentar salvar sem nome. | A validação impede o salvamento. |
| CT-05-04 | P0 | Aplicar template | Aplicar template com 5 refeições à semana atual. | A semana é substituída após confirmação. |
| CT-05-05 | P0 | Independência | Aplicar template, editar a semana e abrir o template. | O template permanece inalterado. |
| CT-05-06 | P1 | Salvar semana como template | Salvar a semana atual como template. | O template do `week_index` atual é criado/atualizado. |
| CT-05-07 | P1 | Duplicar template | Duplicar um template. | Cópia criada com os mesmos itens e `week_index` livre. |
| CT-05-08 | P1 | Excluir template | Excluir template com confirmação. | Template e itens são removidos; semana atual não é afetada. |
| CT-05-09 | P0 | Ciclo de 4 semanas | Simular a passagem de 4 semanas. | O `week_index` percorre 1 → 2 → 3 → 4 → 1. |
| CT-05-10 | P1 | Recorrência segura | Avançar a semana com a semana nova vazia. | O template correspondente é aplicado automaticamente. |
| CT-05-11 | P1 | Recorrência sem sobrescrever | Avançar a semana com refeições já planejadas. | O planejamento existente é preservado. |
| CT-05-12 | P1 | Histórico | Abrir o histórico após duas semanas. | As semanas anteriores aparecem com data e refeições. |
| CT-05-13 | P0 | RLS | Tentar acessar template de outro usuário. | O acesso é negado. |

### 6.3 Fase 6 — Favoritas

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-06-01 | P0 | Favoritar no card | Clicar no coração de uma sugestão. | O coração fica preenchido e a receita aparece em Favoritas. |
| CT-06-02 | P0 | Desfavoritar | Clicar novamente no coração. | A receita sai de Favoritas. |
| CT-06-03 | P1 | Favoritar no modal | Favoritar pelo modal de detalhes. | O estado reflete no card e na aba. |
| CT-06-04 | P1 | Favoritar do histórico | Favoritar uma receita preparada. | A receita é importada para a biblioteca e favoritada. |
| CT-06-05 | P1 | Persistência | Recarregar a página. | Favoritas continuam na aba. |
| CT-06-06 | P1 | Busca e ordenação | Buscar por nome e ordenar A-Z. | A lista respeita busca e ordenação. |
| CT-06-07 | P2 | Estado vazio | Acessar Favoritas sem favoritas. | Mensagem orientativa é exibida. |
| CT-06-08 | P0 | RLS | Tentar ler favoritas de outro usuário. | O acesso é negado. |

### 6.4 Fase 8 — Dark mode

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-08-01 | P0 | Tema escuro | Selecionar Escuro em Configurações. | A aplicação inteira muda para escuro. |
| CT-08-02 | P0 | Persistência | Recarregar a página. | O tema escuro permanece. |
| CT-08-03 | P1 | Tema do sistema | Selecionar Sistema e alternar o tema do SO. | A aplicação acompanha a mudança. |
| CT-08-04 | P1 | Landing e login | Abrir landing/login no escuro. | As telas estão legíveis e coerentes. |
| CT-08-05 | P1 | Sem flash | Recarregar com tema escuro. | Não há flash de tema claro. |
| CT-08-06 | P2 | Contraste | Verificar textos e botões no escuro. | Contraste mínimo AA para texto. |
| CT-08-07 | P1 | Modais e planejamento | Abrir modais e a grade semanal no escuro. | Todos os elementos permanecem legíveis. |

### 6.5 Fase 9 — Lista de compras

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-09-01 | P0 | Entrada na despensa | Repor 2 kg de arroz. | Saldo aumenta e `stock_movements` recebe `entry`. |
| CT-09-02 | P0 | Cadastro com entrada | Criar item com quantidade inicial. | Item nasce com movimentação de entrada. |
| CT-09-03 | P0 | Sugestões | Abrir a lista com histórico de 90 dias. | Itens frequentes e de maior volume aparecem ordenados por score. |
| CT-09-04 | P1 | Estoque alto | Ter item bem abastecido. | O item não aparece como sugestão. |
| CT-09-05 | P1 | Faltantes do planejamento | Ter receita planejada com ingrediente faltante. | O item aparece em “Para o seu planejamento”. |
| CT-09-06 | P1 | Quantidade sugerida | Verificar a quantidade de um item com 3 entradas. | A quantidade é a média das últimas 3 entradas (mínimo 1). |
| CT-09-07 | P0 | Item manual | Adicionar item manual. | O item aparece em “Adicionados por você” e persiste. |
| CT-09-08 | P0 | Marcar comprado | Marcar item como comprado e adicionar à despensa. | O item sai dos pendentes e a entrada é registrada. |
| CT-09-09 | P1 | Editar quantidade | Editar a quantidade de um item pendente. | O valor é atualizado e persistido. |
| CT-09-10 | P1 | Remover item | Remover um item pendente. | O item deixa a lista. |
| CT-09-11 | P1 | Agrupamento | Ativar agrupamento por categoria. | Os itens são agrupados corretamente. |
| CT-09-12 | P0 | RLS | Tentar acessar a lista de outro usuário. | O acesso é negado. |

### 6.6 Fase 11 — Smart Chef (stretch)

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-11-01 | P0 | Enviar mensagem | Pedir uma receita com a despensa. | O chef responde em PT-BR e a mensagem é persistida. |
| CT-11-02 | P0 | Limite diário | Enviar 7 mensagens e tentar a 8ª. | A 8ª é bloqueada com aviso de limite. |
| CT-11-03 | P1 | Contexto | Pedir sugestão citando um item da despensa. | A resposta considera o item. |
| CT-11-04 | P1 | Ação de receita | Clicar em “Salvar receita”. | A receita é salva na biblioteca. |
| CT-11-05 | P1 | Ação de planejamento | Clicar em “Adicionar ao planejamento”. | O modal de agendamento abre com a receita. |
| CT-11-06 | P1 | Ação de compras | Clicar em “Adicionar à lista de compras”. | Os itens são adicionados à lista. |
| CT-11-07 | P1 | Limpar conversa | Clicar em “Limpar conversa”. | O histórico é removido e a tela fica vazia. |
| CT-11-08 | P0 | RLS | Tentar ler mensagens de outro usuário. | O acesso é negado. |

### 6.7 Fase 10 — Notificações (stretch)

| ID | Prioridade | Caso | Passos | Resultado esperado |
|---|---|---|---|---|
| CT-10-01 | P0 | Janela de 7 dias | Ter item vencendo em 6 dias. | Um aviso é gerado. |
| CT-10-02 | P0 | Item vencido | Ter item vencido. | Um aviso com a variante “já venceu” é gerado. |
| CT-10-03 | P1 | Um por dia | Abrir o app duas vezes no mesmo dia. | Não há aviso duplicado para o mesmo item. |
| CT-10-04 | P1 | Adiar | Adiar um aviso por 1 dia. | O aviso não reaparece até o dia seguinte. |
| CT-10-05 | P1 | Dispensar | Dispensar um aviso. | O aviso sai da lista de não lidos. |
| CT-10-06 | P1 | Abrir chat | Clicar no aviso. | O Smart Chef abre com o texto preenchido. |
| CT-10-07 | P1 | Desativar | Desligar notificações nas configurações. | Nenhum aviso novo é gerado. |
| CT-10-08 | P0 | RLS | Tentar ler notificações de outro usuário. | O acesso é negado. |

### 6.8 Regressão das fases 1 a 4

| ID | Prioridade | Caso | Resultado esperado |
|---|---|---|---|
| CT-REG-01 | P0 | Login Google | Login e logout funcionam. |
| CT-REG-02 | P0 | CRUD da despensa | Criar, editar, excluir e listar itens. |
| CT-REG-03 | P0 | Sugestões de receitas | A despensa gera sugestões sem erro. |
| CT-REG-04 | P0 | Consumo de receita | Confirmar consumo atualiza saldo e histórico. |
| CT-REG-05 | P0 | Planejamento semanal | Agendar, substituir e remover refeições. |
| CT-REG-06 | P1 | Kcal | Receitas exibem calorias quando disponíveis. |
| CT-REG-07 | P1 | Histórico | “Minhas receitas” lista preparos anteriores. |
| CT-REG-08 | P1 | Responsividade | Navegação inferior e layout desktop funcionam. |

---

## 7. Testes de segurança e RLS

Para cada tabela nova (`recipes`, `recipe_generations`, `meal_plan_cycles`, `meal_plan_templates`, `meal_plan_template_items`, `meal_plan_weeks`, `shopping_list_items`, `user_settings`, `notifications`, `chat_messages`, `chat_usage`):

1. Usuário A cria um registro.
2. Usuário B tenta `select`, `insert`, `update` e `delete` via API REST.
3. O resultado deve ser `42501` (permissão negada) ou lista vazia no `select`.
4. O papel `anon` não deve ter acesso a nenhuma tabela.
5. RPCs `security invoker` devem respeitar `auth.uid()`.

### 7.1 Teste de isolamento de receitas

- Gerar receitas com o usuário A.
- Autenticar como usuário B.
- Chamar `find_recipes_for_pantry` com os ingredientes do usuário A.
- Resultado esperado: nenhuma receita retornada.

### 7.2 Teste de isolamento de planejamento

- Criar template com o usuário A.
- Tentar aplicar o template com o usuário B.
- Resultado esperado: erro de permissão/registro não encontrado.

---

## 8. Testes de usabilidade e responsividade

| ID | Caso | Resultado esperado |
|---|---|---|
| CT-UX-01 | Navegação mobile | Todas as abas novas acessíveis em 360 px. |
| CT-UX-02 | Navegação desktop | Sidebar com todas as abas e estados ativos corretos. |
| CT-UX-03 | Teclado | Modais fecham com Esc e ações são alcançáveis por Tab. |
| CT-UX-04 | Foco visível | Botões e campos exibem anel de foco. |
| CT-UX-05 | Textos alternativos | Imagens e ícones relevantes têm `alt`/`aria-label`. |
| CT-UX-06 | Estados vazios | Todas as novas telas têm mensagem orientativa. |
| CT-UX-07 | Erros | Mensagens em português e ação de tentar novamente. |
| CT-UX-08 | Dark mode | Contraste e legibilidade em todas as telas. |

---

## 9. Smoke test de produção

Executar após cada deploy em `https://smart-pantry-coral.vercel.app`:

1. Abrir a landing page e fazer login com Google.
2. Confirmar que a despensa carrega os itens.
3. Abrir “Minhas receitas” e conferir as abas.
4. Abrir “Planejamento” e conferir a semana atual.
5. Executar a funcionalidade da fase entregue (ex.: gerar receita, favoritar, abrir lista de compras).
6. Recarregar a página e confirmar a persistência.
7. Verificar o console do navegador em busca de erros.
8. Confirmar que o bundle publicado corresponde ao commit.

### 9.1 Evidências

- Captura de tela das telas principais.
- Saída de `npm run lint`, `npm run build` e `npm test`.
- Registro da versão do bundle publicado.
- Data e responsável pelo teste.

---

## 10. Automação com Vitest

### 10.1 Estrutura sugerida

```text
app/src/lib/__tests__/
  normalizeRecipe.test.js
  week.test.js
  shoppingSuggestions.test.js
  expiration.test.js
  theme.test.js
  chatLimit.test.js
```

### 10.2 Casos automatizados prioritários

| Arquivo | Casos |
|---|---|
| `normalizeRecipe.test.js` | normalização de título, ingredientes, plural, dedupe. |
| `week.test.js` | segunda-feira, índice do ciclo, virada de semana, formatação. |
| `shoppingSuggestions.test.js` | score, média das últimas 3 entradas, exclusão de estoque alto, faltantes do plano. |
| `expiration.test.js` | janela de 7 dias, itens vencidos, snooze, um aviso por dia. |
| `theme.test.js` | resolução de `system`, persistência e fallback. |
| `chatLimit.test.js` | limite de 7 mensagens, reset diário e contagem. |

### 10.3 Configuração

- Adicionar `vitest` em `devDependencies`.
- Criar `app/vitest.config.js` com ambiente `node` para funções puras.
- Adicionar script `"test": "vitest run"` e `"test:coverage": "vitest run --coverage"`.
- Manter os testes puros, sem chamadas reais ao Supabase.

---

## 11. Cronograma de execução

| Momento | Testes |
|---|---|
| Durante a Fase 7 | Unitários de normalização + integração de cache + RLS. |
| Durante a Fase 5 | Unitários de ciclo + integração de templates + RLS. |
| Durante a Fase 6 | Integração de favoritas + regressão de receitas. |
| Durante a Fase 8 | Testes visuais e de persistência do tema. |
| Durante a Fase 9 | Unitários de agregação + integração de entradas e lista. |
| Durante a Fase 11 | Integração do chat + limite + RLS. |
| Durante a Fase 10 | Integração de notificações + snooze + RLS. |
| Antes de cada deploy | Lint, build, unitários e smoke test. |
| Ao final do v3 | Regressão completa das fases 1 a 11. |

---

## 12. Riscos de teste

| Risco | Mitigação |
|---|---|
| Cota do Gemini impedir testes de geração | Usar cache e dados sintéticos; testar a Edge Function com mock. |
| Dados de teste insuficientes para a lista de compras | Criar script de seed com movimentações variadas. |
| Dependência da conta Google pessoal | Criar conta de teste dedicada. |
| Testes de RLS esquecidos | Checklist obrigatório por tabela nova. |
| Deploy diferente do commit testado | Registrar o hash do bundle e o commit. |

---

## 13. Histórico de versões

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 12/11/2026 | Criação do plano de testes com estratégia, casos por fase, RLS, usabilidade, smoke test e automação. |
