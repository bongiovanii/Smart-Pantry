# Escopo do Incremento 7 — Notificações de Vencimento e Central de Configurações

> **Status:** implementado em 12/11/2026, com migração `20261112200000_notifications_and_settings.sql` aplicada no banco de dados remoto Supabase, serviços `notifications.js` e `userSettings.js`, componentes `NotificationsPanel`, `SettingsPage` e atualização de `AppHeader` e `App.jsx`, com suíte de testes unitários passando com 100% de sucesso.
>
> **Projeto:** Smart Pantry — TCC
>
> **Ambiente Supabase:** `cojcrquveckvrdzjivmc` (`https://cojcrquveckvrdzjivmc.supabase.co`)
>
> **Frontend:** React 19 + Vite 8 + Tailwind CSS 4
>
> **Documento anterior:** [`ESCOPO_INCREMENTO_6.md`](./ESCOPO_INCREMENTO_6.md)

---

## 1. Objetivo

Implementar a **Fase 10** do [`plano_implementacao_v3.md`](./plano_implementacao_v3.md), fornecendo ao usuário um sistema completo de **alertas in-app para alimentos que estão prestes a vencer ou já venceram**:

1. **Avisos automáticos de vencimento** para itens com data de validade em até 7 dias ou já vencidos;
2. **Central de notificações deslizante (`NotificationsPanel`)** acessível pelo ícone de sino no cabeçalho;
3. **Contador e indicador visual de não lidas** no ícone de sino do cabeçalho;
4. **Ações rápidas por notificação**:
   - **Ver receitas:** orienta o usuário e sugere receitas aproveitando o ingrediente em risco;
   - **Adiar 1 dia:** adia a notificação para o dia seguinte sem criar duplicatas;
   - **Marcar como lida / Ler todas:** controle de leitura ágil;
   - **Dispensar:** descarta o aviso do alimento;
5. **Prevenção de duplicatas** via constraint única por usuário, alimento e dia calendário no fuso `America/Sao_Paulo`;
6. **Central de Configurações (`SettingsPage`)** com opção para ligar ou desligar as notificações de vencimento, exibir a conta conectada e deslogar.

---

## 2. Funcionalidades incluídas

### 2.1 Modelo de dados e migração SQL (`20261112200000_notifications_and_settings.sql`)

- **Tabela `public.user_settings`:**
  - Armazena preferências do usuário: `theme ('light', 'dark', 'system')` e `notifications_enabled boolean default true`;
  - RLS completo para que cada usuário acesse apenas suas próprias preferências;
  - RPC `get_or_create_user_settings()` garantindo criação atômica no primeiro acesso.
- **Tabela `public.notifications`:**
  - Armazena notificações in-app vinculadas ao usuário e opcionalmente ao item da despensa (`pantry_item_id`);
  - Status gerenciados: `'unread'`, `'read'`, `'dismissed'`, `'snoozed'`;
  - Constraint de deduplicação: `unique (user_id, pantry_item_id, notification_date)` — impede mais de um alerta por alimento por dia calendário;
  - Coluna `snoozed_until date` para suporte a adiamento.
- **RPCs no PostgreSQL:**
  - `generate_expiration_notifications()`:
    - Verifica se `notifications_enabled` está ativo em `user_settings`;
    - Identifica alimentos ativos da despensa com validade em até 7 dias ou já vencidos;
    - Ignora itens com `snoozed_until` superior à data atual de Brasília;
    - Gera notificações personalizadas com mensagens amigáveis em português:
      - Alimento vencendo: *"Seu item {ALIMENTO} está prestes a vencer! Por que você não evita o desperdício dele fazendo uma receita?..."*
      - Alimento já vencido: *"Seu item {ALIMENTO} já venceu! Verifique se ainda está próprio para consumo ou utilize-o rapidamente..."*
    - Retorna a lista completa de notificações ativas ordenadas por prioridade (não lidas e data mais recente primeiro);
  - `snooze_notification(p_notification_id, p_days)`:
    - Adia a notificação até `current_date + p_days`;
  - `mark_all_notifications_as_read()`:
    - Atualiza em lote todas as notificações não lidas do usuário para `'read'`.

### 2.2 Camada de serviços (`notifications.js` e `userSettings.js`)

- `app/src/services/notifications.js`:
  - `generateExpirationNotifications()`: invoca a RPC de geração e normaliza a resposta;
  - `listActiveNotifications()`: consulta notificações ativas não dispensadas;
  - `markNotificationAsRead(id)`: marca notificação individual como lida;
  - `markAllNotificationsAsRead()`: marca todas as notificações como lidas via RPC;
  - `snoozeNotification(id, days)`: adia notificação por N dias;
  - `dismissNotification(id)`: descarta a notificação.
- `app/src/services/userSettings.js`:
  - `getUserSettings()`: busca as preferências do usuário no banco;
  - `updateUserSettings({ theme, notificationsEnabled })`: atualiza preferências com validação de tema.

### 2.3 Interface e experiência do usuário

- **`AppHeader.jsx`:**
  - Botão de sino exibe badge em vermelho com a contagem de itens não lidos (ex.: `1`, `3`, `9+`);
  - Ícone alterna para `notifications_active` quando houver itens não lidos;
  - Menu da conta ganha atalho para a tela de **Configurações**.
- **`NotificationsPanel.jsx`:**
  - Painel lateral deslizante responsivo (drawer no mobile e modal com bordas arredondadas no desktop);
  - Indicadores visuais por nível de criticidade: ícone vermelho de erro para itens vencidos e amarelo para itens que vencem hoje;
  - Ação **Ver receitas**: fecha o painel e direciona o usuário para as receitas sugeridas com foco no alimento;
  - Ação **Adiar 1 dia**: remove o item da lista imediata até o dia seguinte;
  - Ação **Ler todas**: marca todas as notificações como lidas de uma vez;
  - Rodapé com atalho direto para **Ajustar notificações** na página de configurações.
- **`SettingsPage.jsx`:**
  - Página acessível tanto pela sidebar/bottom bar (**Ajustes / Configurações**) quanto pelo menu do usuário e painel de notificações;
  - Toggle switch interativo para ativar ou desativar as notificações de vencimento;
  - Informações de identificação da conta conectada via Google OAuth;
  - Botão para deslogar da conta e botão para voltar à despensa.

---

## 3. Testes unitários e qualidade

- Criado arquivo de testes `app/src/services/__tests__/notifications.test.js`:
  - Geração de notificações e mapeamento de campos;
  - Consulta com filtros de status e data de adiamento;
  - Marcação individual e em lote como lida;
  - Adiamento e descarte de notificações;
  - Validações de tema e persistência de preferências de usuário.
- **Resultados:**
  - `vitest run`: **6 suítes / 52 testes passando (100% de sucesso)**;
  - `eslint .`: **0 erros e 0 warnings**;
  - `vite build`: **build de produção gerado com sucesso**.

---

## 4. Próximos passos recomendados

Conforme o [`plano_implementacao_v3.md`](./plano_implementacao_v3.md), as próximas fases planejadas são:
1. **Fase 6 — Favoritas:** permitir favoritar receitas e exibi-las em uma aba dedicada em Minhas receitas;
2. **Fase 8 — Dark mode:** tema escuro baseado na preferência salva em `user_settings`;
3. **Fase 9 — Lista de compras:** persistência da lista de compras e sugestões automáticas baseadas em estoque mínimo e validade;
4. **Fase 11 — Smart Chef (stretch):** chatbot com IA contextualizado com despensa e receitas.
