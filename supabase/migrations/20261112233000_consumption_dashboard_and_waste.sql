-- ============================================================
-- Smart Pantry
-- Fase 12: Dashboard de Consumo & Desperdício e Baixa de Estoque
-- ============================================================

-- 1. Função utilitária para estimar peso equivalente em kg
create or replace function public.pantry_unit_to_kg(
  p_quantity numeric,
  p_unit text,
  p_category text default 'outros'
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_qty numeric := coalesce(p_quantity, 0);
  v_unit text := lower(trim(coalesce(p_unit, '')));
  v_cat text := lower(trim(coalesce(p_category, 'outros')));
begin
  if v_qty <= 0 then
    return 0;
  end if;

  case v_unit
    when 'kg' then return v_qty;
    when 'g' then return round(v_qty / 1000.0, 3);
    when 'l' then return v_qty;
    when 'ml' then return round(v_qty / 1000.0, 3);
    when 'un' then
      if v_cat like '%horti%' or v_cat like '%frut%' or v_cat like '%verd%' then
        return round(v_qty * 0.15, 3);
      elsif v_cat like '%panific%' or v_cat like '%pao%' then
        return round(v_qty * 0.05, 3);
      elsif v_cat like '%latici%' or v_cat like '%ovo%' then
        return round(v_qty * 0.06, 3);
      else
        return round(v_qty * 0.20, 3);
      end if;
    when 'pacote' then return round(v_qty * 0.50, 3);
    when 'caixa' then return round(v_qty * 0.40, 3);
    when 'lata' then return round(v_qty * 0.35, 3);
    else return v_qty;
  end case;
end;
$$;

comment on function public.pantry_unit_to_kg is
  'Converte unidades heterogêneas de alimentos para quilogramas equivalentes estimados.';


-- 2. Função utilitária para estimar preço de referência por kg (R$/kg)
create or replace function public.pantry_category_price(
  p_category text
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_cat text := lower(trim(coalesce(p_category, 'outros')));
begin
  if v_cat like '%carne%' or v_cat like '%frango%' or v_cat like '%peixe%' then
    return 38.00;
  elsif v_cat like '%latici%' or v_cat like '%queijo%' then
    return 18.50;
  elsif v_cat like '%panific%' or v_cat like '%pao%' or v_cat like '%massa%' then
    return 14.00;
  elsif v_cat like '%horti%' or v_cat like '%frut%' or v_cat like '%verd%' then
    return 8.50;
  elsif v_cat like '%grao%' or v_cat like '%cereal%' or v_cat like '%arroz%' or v_cat like '%feijao%' then
    return 7.50;
  elsif v_cat like '%bebid%' or v_cat like '%suco%' then
    return 6.00;
  else
    return 12.00;
  end if;
end;
$$;


-- 3. Função utilitária para estimar pegada hídrica (L/kg)
create or replace function public.pantry_category_water_liters(
  p_category text
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_cat text := lower(trim(coalesce(p_category, 'outros')));
begin
  if v_cat like '%carne%' or v_cat like '%frango%' or v_cat like '%peixe%' then
    return 10500.0;
  elsif v_cat like '%latici%' then
    return 2400.0;
  elsif v_cat like '%grao%' or v_cat like '%cereal%' then
    return 1600.0;
  elsif v_cat like '%panific%' or v_cat like '%pao%' then
    return 1400.0;
  elsif v_cat like '%bebid%' then
    return 400.0;
  elsif v_cat like '%horti%' or v_cat like '%frut%' or v_cat like '%verd%' then
    return 350.0;
  else
    return 1250.0;
  end if;
end;
$$;


-- 4. RPC para registrar baixa de alimento na despensa (consumo, descarte ou engano)
create or replace function public.record_pantry_discard(
  p_item_id uuid,
  p_disposition text,
  p_reason text default null
)
returns public.pantry_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_item public.pantry_items;
  v_reason text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_disposition not in ('consumed', 'wasted', 'mistake') then
    raise exception 'Disposição inválida: deve ser consumed, wasted ou mistake.' using errcode = '22023';
  end if;

  select *
  into v_item
  from public.pantry_items
  where id = p_item_id
    and user_id = v_user_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Alimento não encontrado na despensa ativa.' using errcode = 'P0002';
  end if;

  if p_disposition = 'consumed' then
    v_reason := coalesce(nullif(trim(p_reason), ''), 'Consumo manual fora do app');
    insert into public.stock_movements (
      user_id, pantry_item_id, movement_type, quantity, reason, occurred_at
    ) values (
      v_user_id, p_item_id, 'consumption', v_item.quantity, v_reason, now()
    );

    update public.pantry_items
    set status = 'consumido',
        quantity = 0,
        archived_at = now(),
        updated_at = now()
    where id = p_item_id
    returning * into v_item;

  elsif p_disposition = 'wasted' then
    v_reason := coalesce(nullif(trim(p_reason), ''), 'Descarte por vencimento ou estrago');
    insert into public.stock_movements (
      user_id, pantry_item_id, movement_type, quantity, reason, occurred_at
    ) values (
      v_user_id, p_item_id, 'waste', v_item.quantity, v_reason, now()
    );

    update public.pantry_items
    set status = 'descartado',
        quantity = 0,
        archived_at = now(),
        updated_at = now()
    where id = p_item_id
    returning * into v_item;

  else -- mistake (apenas arquiva sem gerar movimentação de consumo nem desperdício)
    update public.pantry_items
    set archived_at = now(),
        updated_at = now()
    where id = p_item_id
    returning * into v_item;
  end if;

  return v_item;
end;
$$;

comment on function public.record_pantry_discard is
  'Registra a baixa de um alimento na despensa classificando como consumo, desperdício ou remoção por erro.';


-- 5. RPC Agregadora de Métricas para o Dashboard de Consumo
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

  -- 5.1 KPIs: desperdício total, custo financeiro, aproveitamento e alimentos em risco
  with current_movements as (
    select
      sm.movement_type,
      public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) as kg,
      public.pantry_category_price(p.category) as price_per_kg,
      public.pantry_category_water_liters(p.category) as water_factor
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.occurred_at >= v_start_date
  ),
  prev_movements as (
    select
      sm.movement_type,
      public.pantry_unit_to_kg(sm.quantity, p.unit, p.category) as kg
    from public.stock_movements sm
    join public.pantry_items p on p.id = sm.pantry_item_id
    where sm.user_id = v_user_id
      and sm.occurred_at >= v_prev_start_date
      and sm.occurred_at < v_start_date
  ),
  current_stats as (
    select
      coalesce(sum(case when movement_type = 'waste' then kg else 0 end), 0) as waste_kg,
      coalesce(sum(case when movement_type = 'waste' then kg * price_per_kg else 0 end), 0) as waste_cost,
      coalesce(sum(case when movement_type = 'consumption' then kg else 0 end), 0) as consumed_kg,
      coalesce(sum(case when movement_type = 'waste' then kg * water_factor else 0 end), 0) as waste_water
    from current_movements
  ),
  prev_stats as (
    select
      coalesce(sum(case when movement_type = 'waste' then kg else 0 end), 0) as prev_waste_kg,
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


  -- 5.2 Linha do tempo semanal (últimas 8 semanas)
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


  -- 5.3 Principais categorias desperdiçadas
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


  -- 5.4 Alimentos em risco (ordenados por proximidade da validade)
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'category', p.category,
        'quantity', p.quantity,
        'unit', p.unit,
        'expiration_date', p.expiration_date,
        'days_remaining', (p.expiration_date - v_today)
      )
      order by p.expiration_date asc, p.name asc
    ),
    '[]'::jsonb
  )
  into v_at_risk
  from (
    select id, name, category, quantity, unit, expiration_date
    from public.pantry_items
    where user_id = v_user_id
      and archived_at is null
      and status = 'em_estoque'
      and expiration_date is not null
      and expiration_date <= (v_today + 3)
    order by expiration_date asc
    limit 10
  ) p;


  -- 5.5 Impacto ambiental
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

comment on function public.get_consumption_dashboard_data is
  'Agrega métricas analíticas de consumo, desperdício, histórico semanal, categorias, alimentos em risco e impacto ecológico.';
