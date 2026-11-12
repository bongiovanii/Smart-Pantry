-- ============================================================
-- Smart Pantry
-- Fase 7: biblioteca de receitas persistida + cache-first
-- ============================================================

-- Cada linha representa uma receita salva pelo usuário. A biblioteca é a
-- fonte de verdade para as sugestões, o planejamento, as favoritas e o chat.
-- O snapshot completo (ingredientes e passos) fica em JSONB para que a
-- receita possa ser aberta sem uma nova chamada ao Gemini.
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    check (char_length(trim(title)) between 1 and 200),

  -- Título normalizado (sem acentos, minúsculas e sem pontuação) usado para
  -- impedir que a mesma receita seja gravada duas vezes para o mesmo usuário.
  title_normalized text not null
    check (char_length(trim(title_normalized)) between 1 and 200),

  category text not null default 'outros',

  image text,
  image_query text,
  image_source text,
  image_author text,
  image_license text,
  image_license_url text,
  image_source_url text,

  ready_in_minutes integer not null default 0
    check (ready_in_minutes >= 0),

  servings integer not null default 0
    check (servings >= 0),

  calories_per_serving integer not null default 0
    check (calories_per_serving >= 0),

  used_ingredients jsonb not null default '[]'::jsonb
    check (jsonb_typeof(used_ingredients) = 'array'),

  missed_ingredients jsonb not null default '[]'::jsonb
    check (jsonb_typeof(missed_ingredients) = 'array'),

  steps jsonb not null default '[]'::jsonb
    check (jsonb_typeof(steps) = 'array'),

  -- Nomes normalizados dos ingredientes usados. O índice GIN acelera a
  -- consulta por sobreposição com os ingredientes da despensa.
  ingredient_names text[] not null default '{}',

  source text not null default 'ai'
    check (source in ('ai', 'cooked', 'manual')),

  is_favorite boolean not null default false,
  favorited_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recipes_user_title_unique
    unique (user_id, title_normalized)
);

comment on table public.recipes is
  'Biblioteca de receitas do usuário, com snapshot completo e cache de ingredientes.';

create index if not exists recipes_ingredients_gin_idx
on public.recipes using gin (ingredient_names);

create index if not exists recipes_user_created_idx
on public.recipes (user_id, created_at desc);

create index if not exists recipes_user_title_search_idx
on public.recipes (user_id, title_normalized);

create index if not exists recipes_user_favorite_idx
on public.recipes (user_id, is_favorite)
where is_favorite;


-- ============================================================
-- Auditoria e limite diário de gerações
-- ============================================================

create table if not exists public.recipe_generations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  generated_at timestamptz not null default now(),

  requested_count integer not null default 0
    check (requested_count >= 0),

  generated_count integer not null default 0
    check (generated_count >= 0),

  cache_hits integer not null default 0
    check (cache_hits >= 0),

  source text not null default 'ai'
    check (source in ('ai', 'cache', 'mixed'))
);

comment on table public.recipe_generations is
  'Registro das gerações de receitas por IA, usado para auditoria e limite diário.';

create index if not exists recipe_generations_user_day_idx
on public.recipe_generations (user_id, generated_at desc);


-- ============================================================
-- Atualização automática do campo updated_at
-- ============================================================

drop trigger if exists recipes_set_updated_at on public.recipes;

create trigger recipes_set_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();


-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.recipes enable row level security;
alter table public.recipe_generations enable row level security;

revoke all on table public.recipes from anon;
revoke all on table public.recipe_generations from anon;

grant select, insert, update, delete
on table public.recipes
to authenticated;

grant select, insert
on table public.recipe_generations
to authenticated;

create policy "Users can read their recipes"
on public.recipes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their recipes"
on public.recipes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their recipes"
on public.recipes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their recipes"
on public.recipes
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their recipe generations"
on public.recipe_generations
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their recipe generations"
on public.recipe_generations
for insert
to authenticated
with check ((select auth.uid()) = user_id);


-- ============================================================
-- Busca cache-first por sobreposição de ingredientes
-- ============================================================

create or replace function public.find_recipes_for_pantry(
  p_ingredients text[],
  p_limit integer default 6
)
returns setof public.recipes
language sql
stable
security invoker
set search_path = public
as $$
  select r.*
  from public.recipes r
  where r.user_id = (select auth.uid())
    and r.ingredient_names && p_ingredients
  order by
    cardinality(
      array(
        select unnest(r.ingredient_names)
        intersect
        select unnest(p_ingredients)
      )
    ) desc,
    r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 6), 24));
$$;

comment on function public.find_recipes_for_pantry(text[], integer) is
  'Retorna receitas da biblioteca do usuário ordenadas pela quantidade de ingredientes em comum com a despensa.';

revoke all on function public.find_recipes_for_pantry(text[], integer) from anon;
grant execute on function public.find_recipes_for_pantry(text[], integer)
to authenticated;
