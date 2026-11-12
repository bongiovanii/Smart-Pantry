-- ============================================================
-- Smart Pantry
-- Templates de planejamento e ciclo de 4 semanas (Fase 5)
-- ============================================================

-- A semana sempre começa na segunda-feira no fuso de Brasília. O frontend
-- usa a mesma referência (app/src/lib/week.js) para evitar que a virada da
-- semana aconteça em momentos diferentes no cliente e no banco.
create or replace function public.current_week_start()
returns date
language sql
stable
set search_path = public
as $$
  select (date_trunc('week', now() at time zone 'America/Sao_Paulo'))::date;
$$;

-- Índice da semana dentro do ciclo de 4 semanas. O módulo positivo garante
-- que datas anteriores ao início do ciclo também caiam entre 1 e 4.
create or replace function public.week_index_for(
  p_started_on date,
  p_week_start date
)
returns smallint
language sql
immutable
set search_path = public
as $$
  select (
    (((floor((p_week_start - p_started_on) / 7.0)::int % 4) + 4) % 4) + 1
  )::smallint;
$$;


-- ============================================================
-- Evolução de meal_plans: cada linha passa a pertencer a uma semana real
-- ============================================================

alter table public.meal_plans
add column if not exists week_start date;

-- Preenche as linhas legadas com a segunda-feira da semana corrente antes
-- de aplicar NOT NULL. O planejamento antigo era recorrente; considerá-lo
-- como a semana atual preserva o que o usuário já tinha montado.
update public.meal_plans
set week_start = public.current_week_start()
where week_start is null;

alter table public.meal_plans
alter column week_start set default public.current_week_start();

alter table public.meal_plans
alter column week_start set not null;

alter table public.meal_plans
drop constraint if exists meal_plans_user_slot_unique;

alter table public.meal_plans
drop constraint if exists meal_plans_user_week_slot_unique;

alter table public.meal_plans
add constraint meal_plans_user_week_slot_unique
unique (user_id, week_start, day_of_week, meal_type);

drop index if exists public.meal_plans_user_day_idx;

create index if not exists meal_plans_user_week_idx
on public.meal_plans (user_id, week_start);

comment on column public.meal_plans.week_start is
  'Segunda-feira da semana da refeição, no fuso America/Sao_Paulo.';


-- ============================================================
-- Ciclos de 4 semanas
-- ============================================================

create table if not exists public.meal_plan_cycles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  started_on date not null,
  status text not null default 'active'
    check (status in ('active', 'closed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.meal_plan_cycles is
  'Ciclo de planejamento de 4 semanas. Apenas um ciclo ativo por usuário.';

create unique index if not exists meal_plan_cycles_one_active_idx
on public.meal_plan_cycles (user_id)
where status = 'active';

create index if not exists meal_plan_cycles_user_started_idx
on public.meal_plan_cycles (user_id, started_on desc);


-- ============================================================
-- Templates semanais (até 4 por usuário, um por semana do ciclo)
-- ============================================================

create table if not exists public.meal_plan_templates (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (char_length(trim(name)) between 1 and 80),

  description text
    check (description is null or char_length(description) <= 500),

  week_index smallint not null
    check (week_index between 1 and 4),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_plan_templates_user_week_unique
    unique (user_id, week_index)
);

comment on table public.meal_plan_templates is
  'Template semanal do usuário. O limite de 4 é garantido por week_index.';

create index if not exists meal_plan_templates_user_idx
on public.meal_plan_templates (user_id, week_index);


create table if not exists public.meal_plan_template_items (
  id uuid primary key default gen_random_uuid(),

  template_id uuid not null
    references public.meal_plan_templates(id)
    on delete cascade,

  -- Redundante em relação ao template, mas permite RLS direta por usuário.
  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  day_of_week text not null
    check (day_of_week in ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM')),

  meal_type text not null
    check (meal_type in ('Café da manhã', 'Almoço', 'Lanche', 'Jantar')),

  -- text para acompanhar meal_plans.recipe_id. O snapshot é a fonte de
  -- verdade da receita; o id serve apenas como referência.
  recipe_id text not null
    check (char_length(trim(recipe_id)) between 1 and 200),

  recipe_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(recipe_snapshot) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_plan_template_items_slot_unique
    unique (template_id, day_of_week, meal_type)
);

comment on table public.meal_plan_template_items is
  'Uma receita por dia e tipo de refeição dentro de um template.';

create index if not exists meal_plan_template_items_template_idx
on public.meal_plan_template_items (template_id, day_of_week);

create index if not exists meal_plan_template_items_user_idx
on public.meal_plan_template_items (user_id);


-- ============================================================
-- Histórico de semanas
-- ============================================================

create table if not exists public.meal_plan_weeks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  cycle_id uuid not null
    references public.meal_plan_cycles(id)
    on delete cascade,

  week_start date not null,

  week_index smallint not null
    check (week_index between 1 and 4),

  applied_template_id uuid
    references public.meal_plan_templates(id)
    on delete set null,

  created_at timestamptz not null default now(),

  constraint meal_plan_weeks_user_start_unique
    unique (user_id, week_start)
);

comment on table public.meal_plan_weeks is
  'Registro de cada semana do ciclo, com o template aplicado (se houver).';

create index if not exists meal_plan_weeks_user_start_idx
on public.meal_plan_weeks (user_id, week_start desc);

create index if not exists meal_plan_weeks_cycle_idx
on public.meal_plan_weeks (cycle_id);


-- ============================================================
-- Atualização automática de updated_at
-- ============================================================

drop trigger if exists meal_plan_cycles_set_updated_at
on public.meal_plan_cycles;
create trigger meal_plan_cycles_set_updated_at
before update on public.meal_plan_cycles
for each row
execute function public.set_updated_at();

drop trigger if exists meal_plan_templates_set_updated_at
on public.meal_plan_templates;
create trigger meal_plan_templates_set_updated_at
before update on public.meal_plan_templates
for each row
execute function public.set_updated_at();

drop trigger if exists meal_plan_template_items_set_updated_at
on public.meal_plan_template_items;
create trigger meal_plan_template_items_set_updated_at
before update on public.meal_plan_template_items
for each row
execute function public.set_updated_at();


-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.meal_plan_cycles enable row level security;
alter table public.meal_plan_templates enable row level security;
alter table public.meal_plan_template_items enable row level security;
alter table public.meal_plan_weeks enable row level security;

revoke all on table public.meal_plan_cycles from anon;
revoke all on table public.meal_plan_templates from anon;
revoke all on table public.meal_plan_template_items from anon;
revoke all on table public.meal_plan_weeks from anon;

grant select, insert, update, delete
on table public.meal_plan_cycles
to authenticated;

grant select, insert, update, delete
on table public.meal_plan_templates
to authenticated;

grant select, insert, update, delete
on table public.meal_plan_template_items
to authenticated;

grant select, insert, update, delete
on table public.meal_plan_weeks
to authenticated;

-- Ciclos
drop policy if exists "Users can read their meal plan cycles"
on public.meal_plan_cycles;
create policy "Users can read their meal plan cycles"
on public.meal_plan_cycles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their meal plan cycles"
on public.meal_plan_cycles;
create policy "Users can create their meal plan cycles"
on public.meal_plan_cycles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their meal plan cycles"
on public.meal_plan_cycles;
create policy "Users can update their meal plan cycles"
on public.meal_plan_cycles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their meal plan cycles"
on public.meal_plan_cycles;
create policy "Users can delete their meal plan cycles"
on public.meal_plan_cycles
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Templates
drop policy if exists "Users can read their meal plan templates"
on public.meal_plan_templates;
create policy "Users can read their meal plan templates"
on public.meal_plan_templates
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their meal plan templates"
on public.meal_plan_templates;
create policy "Users can create their meal plan templates"
on public.meal_plan_templates
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their meal plan templates"
on public.meal_plan_templates;
create policy "Users can update their meal plan templates"
on public.meal_plan_templates
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their meal plan templates"
on public.meal_plan_templates;
create policy "Users can delete their meal plan templates"
on public.meal_plan_templates
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Itens dos templates
drop policy if exists "Users can read their meal plan template items"
on public.meal_plan_template_items;
create policy "Users can read their meal plan template items"
on public.meal_plan_template_items
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their meal plan template items"
on public.meal_plan_template_items;
create policy "Users can create their meal plan template items"
on public.meal_plan_template_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their meal plan template items"
on public.meal_plan_template_items;
create policy "Users can update their meal plan template items"
on public.meal_plan_template_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their meal plan template items"
on public.meal_plan_template_items;
create policy "Users can delete their meal plan template items"
on public.meal_plan_template_items
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Semanas
drop policy if exists "Users can read their meal plan weeks"
on public.meal_plan_weeks;
create policy "Users can read their meal plan weeks"
on public.meal_plan_weeks
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their meal plan weeks"
on public.meal_plan_weeks;
create policy "Users can create their meal plan weeks"
on public.meal_plan_weeks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their meal plan weeks"
on public.meal_plan_weeks;
create policy "Users can update their meal plan weeks"
on public.meal_plan_weeks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their meal plan weeks"
on public.meal_plan_weeks;
create policy "Users can delete their meal plan weeks"
on public.meal_plan_weeks
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- Ciclo ativo
-- ============================================================

create or replace function public.get_or_create_active_cycle()
returns table (
  id uuid,
  started_on date,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cycle public.meal_plan_cycles%rowtype;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select *
  into v_cycle
  from public.meal_plan_cycles c
  where c.user_id = v_user
    and c.status = 'active'
  limit 1;

  if found then
    return query
    select v_cycle.id, v_cycle.started_on, v_cycle.status,
           v_cycle.created_at, v_cycle.updated_at;
    return;
  end if;

  -- O índice parcial garante um único ciclo ativo. Em caso de corrida entre
  -- duas abas, o insert perdedor é ignorado e a leitura abaixo recupera o
  -- ciclo criado pela outra aba.
  insert into public.meal_plan_cycles (user_id, started_on, status)
  values (v_user, public.current_week_start(), 'active')
  on conflict do nothing;

  select *
  into v_cycle
  from public.meal_plan_cycles c
  where c.user_id = v_user
    and c.status = 'active'
  limit 1;

  if not found then
    raise exception 'Não foi possível iniciar o ciclo de planejamento.';
  end if;

  return query
  select v_cycle.id, v_cycle.started_on, v_cycle.status,
         v_cycle.created_at, v_cycle.updated_at;
end;
$$;


-- ============================================================
-- Sincronização da semana corrente
-- ============================================================

create or replace function public.sync_meal_plan_week()
returns table (
  cycle_id uuid,
  week_start date,
  week_index smallint,
  applied_template_id uuid,
  applied_template_name text,
  meal_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cycle record;
  v_week date := public.current_week_start();
  v_index smallint;
  v_template public.meal_plan_templates%rowtype;
  v_meal_count integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select *
  into v_cycle
  from public.get_or_create_active_cycle()
  limit 1;

  v_index := public.week_index_for(v_cycle.started_on, v_week);

  -- Garante o registro da semana no histórico. Semanas já registradas não
  -- são reescritas: o histórico preserva o ciclo e o índice originais.
  insert into public.meal_plan_weeks (
    user_id,
    cycle_id,
    week_start,
    week_index
  )
  values (v_user, v_cycle.id, v_week, v_index)
  on conflict (user_id, week_start) do nothing;

  select count(*)::int
  into v_meal_count
  from public.meal_plans m
  where m.user_id = v_user
    and m.week_start = v_week;

  -- Recorrência: só aplica o template da semana do ciclo quando a semana
  -- ainda está completamente vazia. Isso evita surpreender o usuário que
  -- apagou apenas algumas refeições.
  if v_meal_count = 0 then
    select *
    into v_template
    from public.meal_plan_templates t
    where t.user_id = v_user
      and t.week_index = v_index
      and exists (
        select 1
        from public.meal_plan_template_items i
        where i.template_id = t.id
      )
    limit 1;

    if found then
      insert into public.meal_plans (
        user_id,
        week_start,
        day_of_week,
        meal_type,
        recipe_id,
        recipe_title,
        recipe_image,
        recipe_snapshot
      )
      select
        v_user,
        v_week,
        i.day_of_week,
        i.meal_type,
        i.recipe_id,
        coalesce(
          nullif(trim(i.recipe_snapshot ->> 'title'), ''),
          'Receita sem nome'
        ),
        nullif(i.recipe_snapshot ->> 'image', ''),
        i.recipe_snapshot
      from public.meal_plan_template_items i
      where i.template_id = v_template.id
        and i.user_id = v_user;

      update public.meal_plan_weeks w
      set applied_template_id = v_template.id
      where w.user_id = v_user
        and w.week_start = v_week;

      select count(*)::int
      into v_meal_count
      from public.meal_plans m
      where m.user_id = v_user
        and m.week_start = v_week;
    end if;
  end if;

  return query
  select
    w.cycle_id,
    w.week_start,
    w.week_index,
    w.applied_template_id,
    t.name,
    v_meal_count
  from public.meal_plan_weeks w
  left join public.meal_plan_templates t
    on t.id = w.applied_template_id
  where w.user_id = v_user
    and w.week_start = v_week;
end;
$$;


-- ============================================================
-- Aplicação manual de template
-- ============================================================

create or replace function public.apply_meal_plan_template(p_template_id uuid)
returns table (
  template_id uuid,
  week_start date,
  week_index smallint,
  meal_count integer
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cycle record;
  v_week date := public.current_week_start();
  v_index smallint;
  v_template public.meal_plan_templates%rowtype;
  v_item_count integer;
  v_meal_count integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select *
  into v_template
  from public.meal_plan_templates t
  where t.id = p_template_id
    and t.user_id = v_user;

  if not found then
    raise exception 'Template não encontrado.' using errcode = 'P0002';
  end if;

  select count(*)::int
  into v_item_count
  from public.meal_plan_template_items i
  where i.template_id = v_template.id
    and i.user_id = v_user;

  if v_item_count = 0 then
    raise exception 'Este template ainda não tem refeições.';
  end if;

  select *
  into v_cycle
  from public.get_or_create_active_cycle()
  limit 1;

  v_index := public.week_index_for(v_cycle.started_on, v_week);

  insert into public.meal_plan_weeks (
    user_id,
    cycle_id,
    week_start,
    week_index,
    applied_template_id
  )
  values (v_user, v_cycle.id, v_week, v_index, v_template.id)
  on conflict (user_id, week_start) do update
  set cycle_id = excluded.cycle_id,
      week_index = excluded.week_index,
      applied_template_id = excluded.applied_template_id;

  -- A aplicação substitui a semana inteira, em uma única transação.
  delete from public.meal_plans m
  where m.user_id = v_user
    and m.week_start = v_week;

  insert into public.meal_plans (
    user_id,
    week_start,
    day_of_week,
    meal_type,
    recipe_id,
    recipe_title,
    recipe_image,
    recipe_snapshot
  )
  select
    v_user,
    v_week,
    i.day_of_week,
    i.meal_type,
    i.recipe_id,
    coalesce(
      nullif(trim(i.recipe_snapshot ->> 'title'), ''),
      'Receita sem nome'
    ),
    nullif(i.recipe_snapshot ->> 'image', ''),
    i.recipe_snapshot
  from public.meal_plan_template_items i
  where i.template_id = v_template.id
    and i.user_id = v_user;

  get diagnostics v_meal_count = row_count;

  return query
  select v_template.id, v_week, v_index, v_meal_count;
end;
$$;


-- ============================================================
-- Salvar a semana atual como template
-- ============================================================

create or replace function public.save_current_week_as_template(
  p_name text,
  p_description text default null
)
returns table (
  id uuid,
  name text,
  description text,
  week_index smallint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_cycle record;
  v_week date := public.current_week_start();
  v_index smallint;
  v_template public.meal_plan_templates%rowtype;
  v_meal_count integer;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'Informe um nome para o template.';
  end if;

  if char_length(v_name) > 80 then
    raise exception 'O nome do template deve ter até 80 caracteres.';
  end if;

  if v_description is not null and char_length(v_description) > 500 then
    raise exception 'A descrição deve ter até 500 caracteres.';
  end if;

  select count(*)::int
  into v_meal_count
  from public.meal_plans m
  where m.user_id = v_user
    and m.week_start = v_week;

  if v_meal_count = 0 then
    raise exception 'A semana atual está vazia. Adicione refeições antes de salvar como template.';
  end if;

  select *
  into v_cycle
  from public.get_or_create_active_cycle()
  limit 1;

  v_index := public.week_index_for(v_cycle.started_on, v_week);

  -- Um template por semana do ciclo: salvar de novo atualiza o existente.
  insert into public.meal_plan_templates (
    user_id,
    name,
    description,
    week_index
  )
  values (v_user, v_name, v_description, v_index)
  on conflict (user_id, week_index) do update
  set name = excluded.name,
      description = excluded.description
  returning * into v_template;

  delete from public.meal_plan_template_items i
  where i.template_id = v_template.id
    and i.user_id = v_user;

  insert into public.meal_plan_template_items (
    template_id,
    user_id,
    day_of_week,
    meal_type,
    recipe_id,
    recipe_snapshot
  )
  select
    v_template.id,
    v_user,
    m.day_of_week,
    m.meal_type,
    m.recipe_id,
    m.recipe_snapshot
  from public.meal_plans m
  where m.user_id = v_user
    and m.week_start = v_week;

  -- A semana continua sendo a fonte da verdade. Salvar como template não
  -- marca a semana como "aplicada", pois o conteúdo pode ser editado depois.

  return query
  select v_template.id, v_template.name, v_template.description,
         v_template.week_index, v_template.created_at,
         v_template.updated_at;
end;
$$;


-- ============================================================
-- Duplicar template para a primeira semana livre do ciclo
-- ============================================================

create or replace function public.duplicate_meal_plan_template(p_template_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  week_index smallint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_source public.meal_plan_templates%rowtype;
  v_template public.meal_plan_templates%rowtype;
  v_index smallint;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select *
  into v_source
  from public.meal_plan_templates t
  where t.id = p_template_id
    and t.user_id = v_user;

  if not found then
    raise exception 'Template não encontrado.' using errcode = 'P0002';
  end if;

  select min(candidate)::smallint
  into v_index
  from generate_series(1, 4) as candidate
  where not exists (
    select 1
    from public.meal_plan_templates t
    where t.user_id = v_user
      and t.week_index = candidate
  );

  if v_index is null then
    raise exception 'Você já tem 4 templates. Edite ou exclua um template antes de duplicar.';
  end if;

  insert into public.meal_plan_templates (
    user_id,
    name,
    description,
    week_index
  )
  values (
    v_user,
    left(v_source.name || ' (cópia)', 80),
    v_source.description,
    v_index
  )
  returning * into v_template;

  insert into public.meal_plan_template_items (
    template_id,
    user_id,
    day_of_week,
    meal_type,
    recipe_id,
    recipe_snapshot
  )
  select
    v_template.id,
    v_user,
    i.day_of_week,
    i.meal_type,
    i.recipe_id,
    i.recipe_snapshot
  from public.meal_plan_template_items i
  where i.template_id = v_source.id
    and i.user_id = v_user;

  return query
  select v_template.id, v_template.name, v_template.description,
         v_template.week_index, v_template.created_at,
         v_template.updated_at;
end;
$$;


-- ============================================================
-- Iniciar um novo ciclo manualmente
-- ============================================================

create or replace function public.start_new_meal_plan_cycle()
returns table (
  id uuid,
  started_on date,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_week date := public.current_week_start();
  v_cycle public.meal_plan_cycles%rowtype;
begin
  if v_user is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  update public.meal_plan_cycles c
  set status = 'closed'
  where c.user_id = v_user
    and c.status = 'active';

  insert into public.meal_plan_cycles (user_id, started_on, status)
  values (v_user, v_week, 'active')
  returning * into v_cycle;

  -- A semana corrente passa a ser a semana 1 do novo ciclo. O conteúdo de
  -- meal_plans é preservado; apenas o agrupamento de histórico muda.
  update public.meal_plan_weeks w
  set cycle_id = v_cycle.id,
      week_index = 1
  where w.user_id = v_user
    and w.week_start = v_week;

  return query
  select v_cycle.id, v_cycle.started_on, v_cycle.status,
         v_cycle.created_at, v_cycle.updated_at;
end;
$$;


-- ============================================================
-- Histórico paginado de semanas anteriores
-- ============================================================

create or replace function public.list_meal_plan_history(
  p_page integer default 1,
  p_page_size integer default 20
)
returns table (
  week_start date,
  week_index smallint,
  cycle_id uuid,
  template_name text,
  meal_count integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with weeks as (
    select
      w.week_start,
      w.week_index,
      w.cycle_id,
      t.name as template_name,
      (
        select count(*)::int
        from public.meal_plans m
        where m.user_id = auth.uid()
          and m.week_start = w.week_start
      ) as meal_count,
      count(*) over () as total_count
    from public.meal_plan_weeks w
    left join public.meal_plan_templates t
      on t.id = w.applied_template_id
    where w.user_id = auth.uid()
      and w.week_start < public.current_week_start()
  )
  select
    weeks.week_start,
    weeks.week_index,
    weeks.cycle_id,
    weeks.template_name,
    weeks.meal_count,
    weeks.total_count
  from weeks
  order by weeks.week_start desc
  limit least(greatest(coalesce(p_page_size, 20), 1), 50)
  offset (
    greatest(coalesce(p_page, 1), 1) - 1
  ) * least(greatest(coalesce(p_page_size, 20), 1), 50);
$$;


-- ============================================================
-- Permissões de execução
-- ============================================================

revoke all on function public.current_week_start() from public;
revoke all on function public.week_index_for(date, date) from public;
revoke all on function public.get_or_create_active_cycle() from public;
revoke all on function public.sync_meal_plan_week() from public;
revoke all on function public.apply_meal_plan_template(uuid) from public;
revoke all on function public.save_current_week_as_template(text, text) from public;
revoke all on function public.duplicate_meal_plan_template(uuid) from public;
revoke all on function public.start_new_meal_plan_cycle() from public;
revoke all on function public.list_meal_plan_history(integer, integer) from public;

grant execute on function public.current_week_start() to authenticated;
grant execute on function public.week_index_for(date, date) to authenticated;
grant execute on function public.get_or_create_active_cycle() to authenticated;
grant execute on function public.sync_meal_plan_week() to authenticated;
grant execute on function public.apply_meal_plan_template(uuid) to authenticated;
grant execute on function public.save_current_week_as_template(text, text) to authenticated;
grant execute on function public.duplicate_meal_plan_template(uuid) to authenticated;
grant execute on function public.start_new_meal_plan_cycle() to authenticated;
grant execute on function public.list_meal_plan_history(integer, integer) to authenticated;

