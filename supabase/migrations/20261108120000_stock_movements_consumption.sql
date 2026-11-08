-- ============================================================
-- Smart Pantry
-- Fase 3: status do item e consumo de receitas (stock_movements)
-- ============================================================

-- O status permite distinguir um item ativo de um item consumido/descartado.
-- Itens consumidos também recebem archived_at, saindo da listagem ativa sem
-- quebrar o vínculo referencial com stock_movements.
alter table public.pantry_items
  add column if not exists status text not null default 'em_estoque'
  check (status in ('em_estoque', 'consumido', 'descartado'));

comment on column public.pantry_items.status is
  'Situação do item: em_estoque, consumido ou descartado.';

create index if not exists pantry_items_user_status_idx
on public.pantry_items (user_id, status)
where archived_at is null;


-- ============================================================
-- Consumo de ingredientes de uma receita
-- ============================================================
-- Executa em uma única transação:
--   1. valida cada item e a quantidade informada;
--   2. grava a movimentação de consumo;
--   3. debita o saldo ou arquiva o item quando o consumo é total.
--
-- A função é SECURITY INVOKER: as políticas RLS de pantry_items e
-- stock_movements continuam valendo para auth.uid().
create or replace function public.consume_recipe_ingredients(
  p_recipe_id text,
  p_recipe_title text,
  p_items jsonb
)
returns setof public.pantry_items
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_entry jsonb;
  v_item_id uuid;
  v_quantity numeric(12, 3);
  v_current public.pantry_items%rowtype;
  v_consumed_ids uuid[] := '{}';
  v_reason text;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception 'Informe ao menos um ingrediente para registrar o consumo.'
      using errcode = '22023';
  end if;

  v_reason := format(
    'Preparo da receita: %s',
    coalesce(nullif(trim(p_recipe_title), ''), nullif(trim(p_recipe_id), ''), 'receita')
  );

  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_item_id := (v_entry ->> 'pantry_item_id')::uuid;
      v_quantity := (v_entry ->> 'quantity')::numeric;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Item ou quantidade inválida no consumo da receita.'
          using errcode = '22023';
    end;

    if v_item_id is null then
      raise exception 'Item da despensa não informado.'
        using errcode = '22023';
    end if;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'A quantidade consumida deve ser maior que zero.'
        using errcode = '22023';
    end if;

    -- O FOR UPDATE impede que duas requisições simultâneas debitem o mesmo
    -- saldo a partir de uma leitura desatualizada.
    select *
    into v_current
    from public.pantry_items
    where id = v_item_id
      and user_id = v_user_id
      and archived_at is null
    for update;

    if not found then
      raise exception 'Ingrediente não encontrado na despensa ativa.'
        using errcode = 'P0002';
    end if;

    if v_quantity > v_current.quantity then
      raise exception 'A quantidade informada para "%" supera o estoque disponível.', v_current.name
        using errcode = '22023';
    end if;

    insert into public.stock_movements (
      user_id,
      pantry_item_id,
      movement_type,
      quantity,
      reason
    )
    values (
      v_user_id,
      v_current.id,
      'consumption',
      v_quantity,
      v_reason
    );

    if v_quantity = v_current.quantity then
      -- Consumo total: zera o saldo, marca o status e arquiva o item para que
      -- ele saia da contagem ativa da despensa.
      update public.pantry_items
      set quantity = 0,
          status = 'consumido',
          archived_at = now()
      where id = v_current.id;
    else
      -- Consumo parcial: mantém o item ativo com o saldo remanescente.
      update public.pantry_items
      set quantity = v_current.quantity - v_quantity
      where id = v_current.id;
    end if;

    v_consumed_ids := array_append(v_consumed_ids, v_current.id);
  end loop;

  return query
    select *
    from public.pantry_items
    where user_id = v_user_id
      and id = any(v_consumed_ids);
end;
$$;

comment on function public.consume_recipe_ingredients(text, text, jsonb) is
  'Registra o consumo de ingredientes de uma receita em stock_movements e atualiza pantry_items de forma atômica.';

-- A função só pode ser chamada por usuários autenticados; as RLS continuam
-- restringindo cada linha ao próprio user_id.
revoke all on function public.consume_recipe_ingredients(text, text, jsonb) from public;
revoke all on function public.consume_recipe_ingredients(text, text, jsonb) from anon;
grant execute on function public.consume_recipe_ingredients(text, text, jsonb) to authenticated;
