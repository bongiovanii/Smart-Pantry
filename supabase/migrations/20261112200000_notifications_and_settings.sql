-- ============================================================
-- Smart Pantry
-- Notificações in-app e preferências de usuário (Fase 10)
-- ============================================================

-- ============================================================
-- 1. Preferências do usuário (user_settings)
-- ============================================================

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is
  'Preferências do usuário: tema de exibição e notificações in-app.';

alter table public.user_settings enable row level security;
revoke all on table public.user_settings from anon;
grant select, insert, update on table public.user_settings to authenticated;

create policy "Users can read their settings"
on public.user_settings for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their settings"
on public.user_settings for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their settings"
on public.user_settings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Trigger de atualização de timestamp
create trigger user_settings_set_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();


-- ============================================================
-- 2. Central de Notificações in-app (notifications)
-- ============================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'expiration' check (type in ('expiration')),
  pantry_item_id uuid references public.pantry_items(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed', 'snoozed')),
  notification_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
  snoozed_until date,
  created_at timestamptz not null default now(),
  constraint notifications_item_day_unique unique (user_id, pantry_item_id, notification_date)
);

comment on table public.notifications is
  'Notificações in-app geradas automaticamente (alertas de validade e avisos ao usuário).';

create index if not exists notifications_user_status_idx
on public.notifications (user_id, status, created_at desc);

create index if not exists notifications_user_item_idx
on public.notifications (user_id, pantry_item_id);

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon;
grant select, insert, update, delete on table public.notifications to authenticated;

create policy "Users can read their notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their notifications"
on public.notifications for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their notifications"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their notifications"
on public.notifications for delete to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- 3. RPCs de Gerenciamento de Notificações e Configurações
-- ============================================================

-- Obtém ou cria as configurações do usuário autenticado
create or replace function public.get_or_create_user_settings()
returns public.user_settings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_settings public.user_settings;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select *
  into v_settings
  from public.user_settings
  where user_id = v_user_id;

  if not found then
    insert into public.user_settings (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;

    select *
    into v_settings
    from public.user_settings
    where user_id = v_user_id;
  end if;

  return v_settings;
end;
$$;


-- Gera notificações in-app para alimentos prestes a vencer (<= 7 dias) ou já vencidos.
-- Cria no máximo 1 aviso por item por dia, respeita a preferência de notificações e snoozes.
create or replace function public.generate_expiration_notifications()
returns setof public.notifications
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_enabled boolean := true;
  v_item record;
  v_title text;
  v_body text;
  v_days integer;
  v_is_snoozed boolean;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  -- 1. Verifica se o usuário desativou as notificações
  select coalesce(notifications_enabled, true)
  into v_enabled
  from public.user_settings
  where user_id = v_user_id;

  if v_enabled is null then
    v_enabled := true;
  end if;

  if not v_enabled then
    -- Se desativado, retorna apenas as notificações ativas pré-existentes sem gerar novas
    return query
    select n.*
    from public.notifications n
    where n.user_id = v_user_id
      and n.status in ('unread', 'snoozed')
      and (n.snoozed_until is null or n.snoozed_until <= v_today)
    order by n.created_at desc;
    return;
  end if;

  -- 2. Varre os alimentos ativos que vencem em até 7 dias ou já venceram
  for v_item in
    select p.id, p.name, p.expiration_date
    from public.pantry_items p
    where p.user_id = v_user_id
      and p.archived_at is null
      and p.quantity > 0
      and p.expiration_date is not null
      and p.expiration_date <= (v_today + 7)
  loop
    -- Verifica se o aviso deste item está atualmente adiado para depois de hoje
    select exists (
      select 1
      from public.notifications n
      where n.user_id = v_user_id
        and n.pantry_item_id = v_item.id
        and n.status = 'snoozed'
        and n.snoozed_until > v_today
    ) into v_is_snoozed;

    if not v_is_snoozed then
      if v_item.expiration_date < v_today then
        v_title := 'Alimento vencido: ' || v_item.name;
        v_body := 'Seu item ' || v_item.name || ' já venceu! Por que você não evita o desperdício dele fazendo uma receita? Eu posso te sugerir uma! É só me pedir 😉';
      elsif v_item.expiration_date = v_today then
        v_title := 'Vence hoje: ' || v_item.name;
        v_body := 'Seu item ' || v_item.name || ' vence hoje! Por que você não evita o desperdício dele fazendo uma receita? Eu posso te sugerir uma! É só me pedir 😉';
      else
        v_days := v_item.expiration_date - v_today;
        v_title := 'Prestes a vencer: ' || v_item.name;
        v_body := 'Seu item ' || v_item.name || ' está prestes a vencer (' || v_days || case when v_days = 1 then ' dia restante' else ' dias restantes' end || ')! Por que você não evita o desperdício dele fazendo uma receita? Eu posso te sugerir uma! É só me pedir 😉';
      end if;

      -- Insere no máximo 1 aviso por item por dia
      insert into public.notifications (
        user_id,
        pantry_item_id,
        type,
        title,
        body,
        status,
        notification_date
      ) values (
        v_user_id,
        v_item.id,
        'expiration',
        v_title,
        v_body,
        'unread',
        v_today
      )
      on conflict (user_id, pantry_item_id, notification_date) do nothing;
    end if;
  end loop;

  -- 3. Retorna a lista atual de notificações ativas (não lidas ou lidas recentes)
  return query
  select n.*
  from public.notifications n
  where n.user_id = v_user_id
    and n.status in ('unread', 'read', 'snoozed')
    and (n.snoozed_until is null or n.snoozed_until <= v_today)
  order by
    case when n.status = 'unread' then 0 else 1 end,
    n.created_at desc
  limit 50;
end;
$$;


-- Adia uma notificação por N dias (padrão: 1 dia)
create or replace function public.snooze_notification(
  p_notification_id uuid,
  p_days integer default 1
)
returns public.notifications
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_res public.notifications;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  update public.notifications
  set status = 'snoozed',
      snoozed_until = v_today + greatest(1, least(coalesce(p_days, 1), 30))
  where id = p_notification_id
    and user_id = (select auth.uid())
  returning * into v_res;

  if not found then
    raise exception 'Notificação não encontrada.';
  end if;

  return v_res;
end;
$$;


-- Marca todas as notificações não lidas como lidas
create or replace function public.mark_all_notifications_as_read()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.notifications
  set status = 'read'
  where user_id = (select auth.uid())
    and status = 'unread';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
