-- ============================================================
-- Smart Pantry
-- Fase 9: Minha lista de compras e fluxo de reposição/entrada
-- ============================================================

-- 1. RPC para registrar reposição/entrada de item existente na despensa
create or replace function public.record_pantry_entry(
  p_item_id uuid,
  p_quantity numeric,
  p_reason text default 'Reposição'
)
returns public.pantry_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item public.pantry_items;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade de entrada deve ser maior que zero.' using errcode = '22023';
  end if;

  select *
  into v_item
  from public.pantry_items
  where id = p_item_id
    and user_id = v_user_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Item da despensa não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.stock_movements (
    user_id, pantry_item_id, movement_type, quantity, reason
  ) values (
    v_user_id, p_item_id, 'entry', p_quantity, coalesce(nullif(trim(p_reason), ''), 'Reposição')
  );

  update public.pantry_items
  set quantity = quantity + p_quantity,
      status = 'em_estoque',
      archived_at = null,
      updated_at = now()
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

comment on function public.record_pantry_entry is
  'Registra uma entrada/reposição no estoque e atualiza o saldo do alimento atomicamente.';


-- 2. RPC para criar novo alimento já com histórico de entrada inicial
create or replace function public.create_pantry_item_with_entry(
  p_name text,
  p_category text default 'outros',
  p_quantity numeric default 1,
  p_unit text default 'un',
  p_expiration_date date default null,
  p_reason text default 'Cadastro inicial'
)
returns public.pantry_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item public.pantry_items;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Nome do alimento é obrigatório.' using errcode = '22023';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero.' using errcode = '22023';
  end if;

  insert into public.pantry_items (
    user_id, name, category, quantity, unit, expiration_date, status
  ) values (
    v_user_id,
    trim(p_name),
    coalesce(nullif(trim(p_category), ''), 'outros'),
    p_quantity,
    coalesce(nullif(trim(p_unit), ''), 'un'),
    p_expiration_date,
    'em_estoque'
  )
  returning * into v_item;

  insert into public.stock_movements (
    user_id, pantry_item_id, movement_type, quantity, reason
  ) values (
    v_user_id, v_item.id, 'entry', p_quantity, coalesce(nullif(trim(p_reason), ''), 'Cadastro inicial')
  );

  return v_item;
end;
$$;

comment on function public.create_pantry_item_with_entry is
  'Cadastra um alimento na despensa e gera imediatamente uma movimentação de entrada inicial.';


-- 3. Tabela de itens da lista de compras
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  name_normalized text not null,
  category text not null default 'outros',
  unit text not null default 'un',
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  source text not null default 'manual' check (source in ('manual', 'suggestion', 'meal_plan')),
  status text not null default 'pending' check (status in ('pending', 'purchased', 'removed')),
  pantry_item_id uuid references public.pantry_items(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  purchased_at timestamptz
);

create unique index if not exists shopping_list_pending_unique_idx
on public.shopping_list_items (user_id, name_normalized, unit)
where status = 'pending';

create index if not exists shopping_list_user_status_idx
on public.shopping_list_items (user_id, status, created_at desc);

create index if not exists shopping_list_user_source_idx
on public.shopping_list_items (user_id, source);

comment on table public.shopping_list_items is
  'Itens da lista de compras gerenciados pelo usuário ou sugeridos automaticamente.';

-- RLS
alter table public.shopping_list_items enable row level security;

create policy "shopping_list_items_select"
on public.shopping_list_items
for select
using (auth.uid() = user_id);

create policy "shopping_list_items_insert"
on public.shopping_list_items
for insert
with check (auth.uid() = user_id);

create policy "shopping_list_items_update"
on public.shopping_list_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "shopping_list_items_delete"
on public.shopping_list_items
for delete
using (auth.uid() = user_id);

-- Trigger de updated_at
drop trigger if exists shopping_list_items_set_updated_at on public.shopping_list_items;
create trigger shopping_list_items_set_updated_at
before update on public.shopping_list_items
for each row
execute function public.set_updated_at();


-- 4. RPC para marcar item como comprado com opção atômica de entrada na despensa
create or replace function public.mark_shopping_item_purchased(
  p_item_id uuid,
  p_quantity numeric default null,
  p_add_to_pantry boolean default true,
  p_category text default null,
  p_expiration_date date default null
)
returns public.shopping_list_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item public.shopping_list_items%rowtype;
  v_qty numeric(12, 3);
  v_pantry_item public.pantry_items%rowtype;
  v_pantry_id uuid;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  select *
  into v_item
  from public.shopping_list_items
  where id = p_item_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Item da lista de compras não encontrado.' using errcode = 'P0002';
  end if;

  v_qty := coalesce(p_quantity, v_item.quantity);
  if v_qty <= 0 then
    raise exception 'A quantidade comprada deve ser maior que zero.' using errcode = '22023';
  end if;

  v_pantry_id := v_item.pantry_item_id;

  if p_add_to_pantry then
    -- 1. Se tem pantry_item_id vinculado, tenta buscar
    if v_pantry_id is not null then
      select * into v_pantry_item
      from public.pantry_items
      where id = v_pantry_id
        and user_id = v_user_id
        and archived_at is null;
    end if;

    -- 2. Se não encontrou, busca por nome e unidade na despensa ativa
    if v_pantry_item.id is null then
      select * into v_pantry_item
      from public.pantry_items
      where user_id = v_user_id
        and lower(trim(name)) = lower(trim(v_item.name))
        and unit = v_item.unit
        and archived_at is null
      order by created_at desc
      limit 1;
    end if;

    if v_pantry_item.id is not null then
      v_pantry_id := v_pantry_item.id;

      update public.pantry_items
      set quantity = quantity + v_qty,
          expiration_date = coalesce(p_expiration_date, expiration_date),
          status = 'em_estoque',
          archived_at = null,
          updated_at = now()
      where id = v_pantry_item.id;

      insert into public.stock_movements (
        user_id, pantry_item_id, movement_type, quantity, reason
      ) values (
        v_user_id, v_pantry_item.id, 'entry', v_qty, 'Compra via lista de compras'
      );
    else
      insert into public.pantry_items (
        user_id, name, category, quantity, unit, expiration_date, status
      ) values (
        v_user_id,
        trim(v_item.name),
        coalesce(nullif(trim(p_category), ''), v_item.category, 'outros'),
        v_qty,
        v_item.unit,
        p_expiration_date,
        'em_estoque'
      )
      returning id into v_pantry_id;

      insert into public.stock_movements (
        user_id, pantry_item_id, movement_type, quantity, reason
      ) values (
        v_user_id, v_pantry_id, 'entry', v_qty, 'Compra via lista de compras'
      );
    end if;
  end if;

  update public.shopping_list_items
  set status = 'purchased',
      quantity = v_qty,
      pantry_item_id = v_pantry_id,
      purchased_at = now(),
      updated_at = now()
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

comment on function public.mark_shopping_item_purchased is
  'Marca o item da lista como comprado e, se solicitado, debita entrada na despensa de forma atômica.';


-- 5. RPC para gerar sugestões de compras baseadas no consumo, entradas e estoque atual
create or replace function public.get_shopping_suggestions(
  p_days int default 90
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_cutoff timestamptz;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  v_cutoff := now() - (coalesce(p_days, 90) || ' days')::interval;

  with
  -- Itens pendentes atuais na lista de compras (para não sugerir o que já está na lista)
  pending_items as (
    select name_normalized, unit
    from public.shopping_list_items
    where user_id = v_user_id
      and status = 'pending'
  ),

  -- Movimentações de consumo na janela
  consumption_stats as (
    select
      p.name,
      lower(trim(p.name)) as name_normalized,
      p.category,
      p.unit,
      count(distinct date(sm.occurred_at)) as consumption_days,
      sum(sm.quantity) as total_consumed,
      avg(sm.quantity) as avg_consumed_per_event,
      max(sm.occurred_at) as last_consumed_at
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.movement_type = 'consumption'
      and sm.occurred_at >= v_cutoff
    group by p.name, lower(trim(p.name)), p.category, p.unit
  ),

  -- Movimentações de entrada na janela
  entry_stats as (
    select
      p.name,
      lower(trim(p.name)) as name_normalized,
      p.unit,
      count(*) as entry_count,
      avg(sm.quantity) as avg_entry_quantity,
      sum(sm.quantity) as total_entered
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.movement_type = 'entry'
      and sm.occurred_at >= v_cutoff
    group by p.name, lower(trim(p.name)), p.unit
  ),

  -- Saldo atual em estoque ativo na despensa
  current_stock as (
    select
      lower(trim(name)) as name_normalized,
      unit,
      sum(quantity) as stock_quantity
    from public.pantry_items
    where user_id = v_user_id
      and archived_at is null
      and status = 'em_estoque'
    group by lower(trim(name)), unit
  ),

  -- Itens com estoque baixo da despensa mesmo com poucas movimentações registradas
  low_stock_candidates as (
    select
      p.name,
      lower(trim(p.name)) as name_normalized,
      p.category,
      p.unit,
      1 as consumption_days,
      0::numeric as total_consumed,
      1::numeric as avg_consumed_per_event,
      now() as last_consumed_at
    from public.pantry_items p
    where p.user_id = v_user_id
      and p.archived_at is null
      and p.status = 'em_estoque'
      and (p.quantity <= 1 or p.expiration_date <= ((now() at time zone 'America/Sao_Paulo')::date + 3))
  ),

  -- União dos candidatos baseados em consumo histórico e estoque baixo
  combined_candidates as (
    select
      c.name,
      c.name_normalized,
      c.category,
      c.unit,
      c.consumption_days,
      c.total_consumed,
      c.avg_consumed_per_event,
      c.last_consumed_at
    from consumption_stats c
    union
    select
      l.name,
      l.name_normalized,
      l.category,
      l.unit,
      l.consumption_days,
      l.total_consumed,
      l.avg_consumed_per_event,
      l.last_consumed_at
    from low_stock_candidates l
    where not exists (
      select 1 from consumption_stats c2
      where c2.name_normalized = l.name_normalized and c2.unit = l.unit
    )
  ),

  scored_suggestions as (
    select
      c.name,
      c.name_normalized,
      c.category,
      c.unit,
      coalesce(s.stock_quantity, 0) as current_stock,
      greatest(
        1::numeric,
        round(coalesce(e.avg_entry_quantity, c.avg_consumed_per_event, 1))
      ) as suggested_quantity,
      case
        when coalesce(s.stock_quantity, 0) = 0 then 'Estoque zerado'
        when coalesce(s.stock_quantity, 0) <= 1 then 'Estoque acabando'
        when c.consumption_days >= 3 then 'Você compra com frequência'
        when c.total_consumed > 5 then 'Consumo alto nos últimos 90 dias'
        else 'Item frequente na despensa'
      end as reason,
      (
        0.6 * least(c.consumption_days::numeric / 5.0, 1.0) +
        0.4 * case
                when coalesce(s.stock_quantity, 0) = 0 then 1.0
                when coalesce(s.stock_quantity, 0) <= 1 then 0.7
                else 0.2
              end
      ) as score
    from combined_candidates c
    left join entry_stats e on e.name_normalized = c.name_normalized and e.unit = c.unit
    left join current_stock s on s.name_normalized = c.name_normalized and s.unit = c.unit
    -- Não sugerir se já está na lista de compras pendente
    where not exists (
      select 1 from pending_items pi
      where pi.name_normalized = c.name_normalized and pi.unit = c.unit
    )
    -- Excluir itens cujo estoque atual é alto (mais de 3 vezes a média de consumo ou mais de 5 unidades)
    and not (coalesce(s.stock_quantity, 0) > 5 and coalesce(s.stock_quantity, 0) > coalesce(c.avg_consumed_per_event, 1) * 3)
  )

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', name,
        'nameNormalized', name_normalized,
        'category', category,
        'unit', unit,
        'suggestedQuantity', suggested_quantity,
        'currentStock', current_stock,
        'reason', reason,
        'score', round(score::numeric, 2)
      )
      order by score desc, name asc
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select * from scored_suggestions
    order by score desc, name asc
    limit 20
  ) top_scored;

  return v_result;
end;
$$;

comment on function public.get_shopping_suggestions is
  'Retorna até 20 sugestões inteligentes para a lista de compras cruzando consumo, reposições e estoque.';
