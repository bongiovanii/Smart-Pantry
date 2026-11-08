-- ============================================================
-- Smart Pantry
-- Histórico de receitas executadas por usuário
-- ============================================================

-- Cada linha representa uma execução de receita. Guardar uma linha por
-- preparo preserva a data de cada uso e permite reconstruir o histórico,
-- enquanto a interface agrupa as repetições para formar o inventário.
create table if not exists public.user_recipes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  recipe_id text not null
    check (char_length(trim(recipe_id)) between 1 and 200),

  title text not null
    check (char_length(trim(title)) between 1 and 200),

  image text,
  category text,

  ready_in_minutes integer
    check (ready_in_minutes is null or ready_in_minutes >= 0),

  servings integer
    check (servings is null or servings >= 0),

  used_ingredients jsonb not null default '[]'::jsonb,
  missed_ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,

  image_query text,
  image_source text,
  image_author text,
  image_license text,
  image_license_url text,
  image_source_url text,

  cooked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.user_recipes is
  'Histórico de receitas executadas, com um registro por preparo e vínculo com o usuário.';

create index if not exists user_recipes_user_cooked_idx
on public.user_recipes (user_id, cooked_at desc);

create index if not exists user_recipes_user_recipe_idx
on public.user_recipes (user_id, recipe_id);


-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.user_recipes enable row level security;

revoke all on table public.user_recipes from anon;

grant select, insert, update, delete
on table public.user_recipes
to authenticated;

create policy "Users can read their cooked recipes"
on public.user_recipes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their cooked recipes"
on public.user_recipes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their cooked recipes"
on public.user_recipes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their cooked recipes"
on public.user_recipes
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- Consumo de receita + registro no histórico
-- ============================================================
-- A função passa a receber o snapshot completo da receita (p_recipe) e grava
-- o histórico na mesma transação do consumo. Se qualquer etapa falhar, nada
-- é persistido: não existe consumo sem receita registrada nem o contrário.
drop function if exists public.consume_recipe_ingredients(text, text, jsonb);

create or replace function public.consume_recipe_ingredients(
  p_recipe_id text,
  p_recipe_title text,
  p_items jsonb,
  p_recipe jsonb
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

  v_recipe jsonb := coalesce(p_recipe, '{}'::jsonb);
  v_recipe_id text;
  v_title text;
  v_image text;
  v_category text;
  v_ready_in_minutes integer;
  v_servings integer;
  v_used_ingredients jsonb;
  v_missed_ingredients jsonb;
  v_steps jsonb;
  v_image_query text;
  v_image_source text;
  v_image_author text;
  v_image_license text;
  v_image_license_url text;
  v_image_source_url text;
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

  if p_recipe is null or jsonb_typeof(p_recipe) <> 'object' then
    raise exception 'Dados da receita não informados.'
      using errcode = '22023';
  end if;

  v_title := coalesce(
    nullif(trim(v_recipe ->> 'title'), ''),
    nullif(trim(p_recipe_title), '')
  );

  if v_title is null then
    raise exception 'Informe o título da receita.'
      using errcode = '22023';
  end if;

  v_recipe_id := coalesce(
    nullif(trim(v_recipe ->> 'id'), ''),
    nullif(trim(p_recipe_id), ''),
    'receita-' || extract(epoch from now())::bigint::text
  );

  v_image := nullif(trim(coalesce(v_recipe ->> 'image', '')), '');
  v_category := nullif(trim(coalesce(v_recipe ->> 'category', '')), '');
  v_image_query := nullif(trim(coalesce(v_recipe ->> 'imageQuery', '')), '');
  v_image_source := nullif(trim(coalesce(v_recipe ->> 'imageSource', '')), '');
  v_image_author := nullif(trim(coalesce(v_recipe ->> 'imageAuthor', '')), '');
  v_image_license := nullif(trim(coalesce(v_recipe ->> 'imageLicense', '')), '');
  v_image_license_url := nullif(trim(coalesce(v_recipe ->> 'imageLicenseUrl', '')), '');
  v_image_source_url := nullif(trim(coalesce(v_recipe ->> 'imageSourceUrl', '')), '');

  v_ready_in_minutes := case
    when jsonb_typeof(v_recipe -> 'readyInMinutes') = 'number'
      then greatest(round((v_recipe ->> 'readyInMinutes')::numeric)::integer, 0)
    else null
  end;

  v_servings := case
    when jsonb_typeof(v_recipe -> 'servings') = 'number'
      then greatest(round((v_recipe ->> 'servings')::numeric)::integer, 0)
    else null
  end;

  v_used_ingredients := case
    when jsonb_typeof(v_recipe -> 'usedIngredients') = 'array'
      then v_recipe -> 'usedIngredients'
    else '[]'::jsonb
  end;

  v_missed_ingredients := case
    when jsonb_typeof(v_recipe -> 'missedIngredients') = 'array'
      then v_recipe -> 'missedIngredients'
    else '[]'::jsonb
  end;

  v_steps := case
    when jsonb_typeof(v_recipe -> 'steps') = 'array'
      then v_recipe -> 'steps'
    else '[]'::jsonb
  end;

  v_reason := format('Preparo da receita: %s', v_title);

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

  -- Registra o snapshot da receita no histórico do usuário. A RLS de
  -- user_recipes confirma novamente que user_id = auth.uid().
  insert into public.user_recipes (
    user_id,
    recipe_id,
    title,
    image,
    category,
    ready_in_minutes,
    servings,
    used_ingredients,
    missed_ingredients,
    steps,
    image_query,
    image_source,
    image_author,
    image_license,
    image_license_url,
    image_source_url
  )
  values (
    v_user_id,
    v_recipe_id,
    v_title,
    v_image,
    v_category,
    v_ready_in_minutes,
    v_servings,
    v_used_ingredients,
    v_missed_ingredients,
    v_steps,
    v_image_query,
    v_image_source,
    v_image_author,
    v_image_license,
    v_image_license_url,
    v_image_source_url
  );

  return query
    select *
    from public.pantry_items
    where user_id = v_user_id
      and id = any(v_consumed_ids);
end;
$$;

comment on function public.consume_recipe_ingredients(text, text, jsonb, jsonb) is
  'Registra o consumo de uma receita, grava o histórico em user_recipes e atualiza pantry_items de forma atômica.';

revoke all on function public.consume_recipe_ingredients(text, text, jsonb, jsonb) from public;
revoke all on function public.consume_recipe_ingredients(text, text, jsonb, jsonb) from anon;
grant execute on function public.consume_recipe_ingredients(text, text, jsonb, jsonb) to authenticated;
