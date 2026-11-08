-- ============================================================
-- Smart Pantry
-- Informação nutricional (kcal por porção) no histórico de receitas
-- ============================================================

-- A estimativa é feita pelo Gemini no momento da geração e guardada junto
-- com o snapshot da receita. Receitas antigas permanecem com NULL e a
-- interface simplesmente oculta o campo.
alter table public.user_recipes
  add column if not exists calories_per_serving integer
    check (calories_per_serving is null or calories_per_serving >= 0);

comment on column public.user_recipes.calories_per_serving is
  'Estimativa de calorias por porção, em kcal, informada pelo modelo no momento do preparo.';


-- ============================================================
-- Consumo de receita + registro no histórico com calorias
-- ============================================================

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
  v_calories_per_serving integer;
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

  v_calories_per_serving := case
    when jsonb_typeof(v_recipe -> 'caloriesPerServing') = 'number'
      then greatest(round((v_recipe ->> 'caloriesPerServing')::numeric)::integer, 0)
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
    calories_per_serving,
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
    v_calories_per_serving,
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
  'Registra o consumo de uma receita, grava o histórico em user_recipes (incluindo kcal por porção) e atualiza pantry_items de forma atômica.';
