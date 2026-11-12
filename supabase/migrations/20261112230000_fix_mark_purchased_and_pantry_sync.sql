-- ============================================================
-- Smart Pantry
-- Correção e aprimoramento da RPC mark_shopping_item_purchased
-- Garante que o item comprado seja adicionado/reativado na despensa
-- ============================================================

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
    -- 1. Se tem pantry_item_id vinculado, busca o item (inclusive se estava arquivado)
    if v_pantry_id is not null then
      select * into v_pantry_item
      from public.pantry_items
      where id = v_pantry_id
        and user_id = v_user_id;
    end if;

    -- 2. Se não encontrou, busca por nome e unidade (priorizando os ativos)
    if v_pantry_item.id is null then
      select * into v_pantry_item
      from public.pantry_items
      where user_id = v_user_id
        and lower(trim(name)) = lower(trim(v_item.name))
        and unit = v_item.unit
      order by (archived_at is null) desc, created_at desc
      limit 1;
    end if;

    if v_pantry_item.id is not null then
      v_pantry_id := v_pantry_item.id;

      update public.pantry_items
      set quantity = case
            when archived_at is not null then v_qty
            else quantity + v_qty
          end,
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
  'Marca o item da lista como comprado e, se solicitado, adiciona ou reativa o alimento na despensa de forma transacional.';
