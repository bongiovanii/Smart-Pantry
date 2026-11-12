-- ============================================================
-- Smart Pantry
-- Adição de preço pago (price) em pantry_items e cálculo refinado de desperdício
-- ============================================================

-- 1. Adiciona coluna de preço em pantry_items
alter table public.pantry_items
  add column if not exists price numeric(10, 2) check (price >= 0);

comment on column public.pantry_items.price is
  'Preço pago pelo alimento em R$ (opcional), utilizado para cálculo real de desperdício.';


-- 2. Atualiza a RPC create_pantry_item_with_entry para suportar p_price
create or replace function public.create_pantry_item_with_entry(
  p_name text,
  p_category text default 'outros',
  p_quantity numeric default 1,
  p_unit text default 'un',
  p_expiration_date date default null,
  p_reason text default 'Cadastro inicial',
  p_price numeric default null
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

  if p_price is not null and p_price < 0 then
    raise exception 'O preço não pode ser negativo.' using errcode = '22023';
  end if;

  insert into public.pantry_items (
    user_id, name, category, quantity, unit, expiration_date, price, status
  ) values (
    v_user_id,
    trim(p_name),
    coalesce(nullif(trim(p_category), ''), 'outros'),
    p_quantity,
    coalesce(nullif(trim(p_unit), ''), 'un'),
    p_expiration_date,
    p_price,
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


-- 3. Atualiza get_consumption_dashboard_data para usar o preço real quando disponível
create or replace function public.get_consumption_dashboard_data(
  p_period text default '8_weeks'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_start_date timestamptz;
  v_prev_start_date timestamptz;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_kpis jsonb;
  v_timeline jsonb;
  v_categories jsonb;
  v_at_risk jsonb;
  v_eco jsonb;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  -- Define janela do período e janela anterior para cálculo de deltas
  if p_period = '30_days' then
    v_start_date := now() - interval '30 days';
    v_prev_start_date := now() - interval '60 days';
  elsif p_period = 'all' then
    v_start_date := now() - interval '1 year';
    v_prev_start_date := now() - interval '2 years';
  else -- 8_weeks padrão
    v_start_date := now() - interval '56 days';
    v_prev_start_date := now() - interval '112 days';
  end if;

  -- 3.1 KPIs com suporte a preço real do alimento
  with current_movements as (
    select
      sm.movement_type,
      public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) as kg,
      public.pantry_category_water_liters(p.category) as water_factor,
      case
        when p.price is not null and p.price > 0 then
          round(p.price * (sm.quantity / greatest(p.quantity, sm.quantity, 1::numeric)), 2)
        else
          round(public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) * public.pantry_category_price(p.category), 2)
      end as item_waste_cost
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.occurred_at >= v_start_date
  ),
  prev_movements as (
    select
      sm.movement_type,
      public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) as kg,
      case
        when p.price is not null and p.price > 0 then
          round(p.price * (sm.quantity / greatest(p.quantity, sm.quantity, 1::numeric)), 2)
        else
          round(public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) * public.pantry_category_price(p.category), 2)
      end as item_waste_cost
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.occurred_at >= v_prev_start_date
      and sm.occurred_at < v_start_date
  ),
  current_stats as (
    select
      coalesce(sum(case when movement_type = 'waste' then kg else 0 end), 0) as waste_kg,
      coalesce(sum(case when movement_type = 'waste' then item_waste_cost else 0 end), 0) as waste_cost,
      coalesce(sum(case when movement_type = 'consumption' then kg else 0 end), 0) as consumed_kg,
      coalesce(sum(case when movement_type = 'waste' then kg * water_factor else 0 end), 0) as waste_water
    from current_movements
  ),
  prev_stats as (
    select
      coalesce(sum(case when movement_type = 'waste' then kg else 0 end), 0) as prev_waste_kg,
      coalesce(sum(case when movement_type = 'waste' then item_waste_cost else 0 end), 0) as prev_waste_cost,
      coalesce(sum(case when movement_type = 'consumption' then kg else 0 end), 0) as prev_consumed_kg
    from prev_movements
  ),
  risk_stats as (
    select count(*) as at_risk_count
    from public.pantry_items
    where user_id = v_user_id
      and archived_at is null
      and status = 'em_estoque'
      and expiration_date is not null
      and expiration_date <= (v_today + 3)
  )
  select jsonb_build_object(
    'waste_kg', round(c.waste_kg, 1),
    'waste_cost_brl', round(c.waste_cost, 2),
    'consumed_kg', round(c.consumed_kg, 1),
    'efficiency_pct', case
      when (c.consumed_kg + c.waste_kg) = 0 then 100
      else round((c.consumed_kg / (c.consumed_kg + c.waste_kg)) * 100.0)
    end,
    'prev_waste_kg', round(p.prev_waste_kg, 1),
    'diff_waste_pct', case
      when p.prev_waste_kg = 0 and c.waste_kg > 0 then 100
      when p.prev_waste_kg = 0 and c.waste_kg = 0 then 0
      else round(((c.waste_kg - p.prev_waste_kg) / p.prev_waste_kg) * 100.0)
    end,
    'at_risk_count', r.at_risk_count
  )
  into v_kpis
  from current_stats c, prev_stats p, risk_stats r;


  -- 3.2 Linha do tempo semanal (últimas 8 semanas)
  with weeks_series as (
    select
      i as week_idx,
      date_trunc('week', now() - (i || ' weeks')::interval)::date as week_start
    from generate_series(7, 0, -1) as i
  ),
  weekly_data as (
    select
      ws.week_idx,
      'Sem ' || to_char(ws.week_start, 'IW') as week_label,
      ws.week_start,
      coalesce(sum(case when sm.movement_type = 'waste' then public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) else 0 end), 0) as waste_kg,
      coalesce(sum(case when sm.movement_type = 'consumption' then public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) else 0 end), 0) as consumed_kg
    from weeks_series ws
    left join public.stock_movements sm
      on sm.user_id = v_user_id
      and sm.occurred_at >= ws.week_start
      and sm.occurred_at < (ws.week_start + 7)
    left join public.pantry_items p on p.id = sm.pantry_item_id
    group by ws.week_idx, ws.week_start
    order by ws.week_start asc
  )
  select jsonb_agg(
    jsonb_build_object(
      'week_label', wd.week_label,
      'week_start', wd.week_start,
      'waste_kg', round(wd.waste_kg, 1),
      'consumed_kg', round(wd.consumed_kg, 1)
    )
  )
  into v_timeline
  from weekly_data wd;


  -- 3.3 Principais categorias desperdiçadas
  with cat_data as (
    select
      case
        when lower(p.category) like '%horti%' or lower(p.category) like '%frut%' or lower(p.category) like '%verd%' then 'hortifruti'
        when lower(p.category) like '%panific%' or lower(p.category) like '%pao%' then 'panificacao'
        when lower(p.category) like '%latici%' or lower(p.category) like '%leite%' or lower(p.category) like '%queijo%' then 'laticinios'
        when lower(p.category) like '%grao%' or lower(p.category) like '%arroz%' or lower(p.category) like '%feijao%' then 'graos'
        when lower(p.category) like '%carne%' or lower(p.category) like '%frango%' then 'carnes'
        when lower(p.category) like '%bebid%' then 'bebidas'
        else 'outros'
      end as category_key,
      sum(public.pantry_unit_to_kg(sm.quantity, p.unit, p.category)) as total_kg
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.movement_type = 'waste'
      and sm.occurred_at >= v_start_date
    group by category_key
  ),
  total_waste as (
    select coalesce(sum(total_kg), 0) as grand_total from cat_data
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'category', cd.category_key,
        'label', case cd.category_key
          when 'hortifruti' then 'Hortifrúti'
          when 'panificacao' then 'Panificação'
          when 'laticinios' then 'Laticínios'
          when 'graos' then 'Grãos e Cereais'
          when 'carnes' then 'Carnes'
          when 'bebidas' then 'Bebidas'
          else 'Outros'
        end,
        'kg', round(cd.total_kg, 1),
        'percentage', case
          when tw.grand_total = 0 then 0
          else round((cd.total_kg / tw.grand_total) * 100.0)
        end
      )
      order by cd.total_kg desc
    ),
    '[]'::jsonb
  )
  into v_categories
  from cat_data cd, total_waste tw;


  -- 3.4 Alimentos em risco (ordenados por proximidade da validade)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category', p.category,
        'quantity', p.quantity,
        'unit', p.unit,
        'price', p.price,
        'expiration_date', p.expiration_date,
        'days_remaining', (p.expiration_date - v_today)
      )
      order by p.expiration_date asc, p.name asc
    ),
    '[]'::jsonb
  )
  into v_at_risk
  from (
    select id, name, category, quantity, unit, price, expiration_date
    from public.pantry_items
    where user_id = v_user_id
      and archived_at is null
      and status = 'em_estoque'
      and expiration_date is not null
      and expiration_date <= (v_today + 3)
    order by expiration_date asc
    limit 10
  ) p;


  -- 3.5 Impacto ambiental
  with current_waste as (
    select
      coalesce(sum(public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) * public.pantry_category_water_liters(p.category)), 0) as water_liters,
      coalesce(sum(public.pantry_unit_to_kg(sm.quantity, p.unit, p.category)), 0) as waste_kg,
      coalesce(sum(case when sm.movement_type = 'consumption' then public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) else 0 end), 0) as food_saved_kg
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.occurred_at >= v_start_date
  )
  select jsonb_build_object(
    'water_liters', round(cw.water_liters),
    'co2_kg', round(cw.waste_kg * 2.1, 1),
    'food_saved_kg', round(cw.food_saved_kg, 1)
  )
  into v_eco
  from current_waste cw;

  return jsonb_build_object(
    'period', p_period,
    'kpis', v_kpis,
    'timeline', coalesce(v_timeline, '[]'::jsonb),
    'categories', v_categories,
    'at_risk_foods', v_at_risk,
    'eco_impact', v_eco
  );
end;
$$;
