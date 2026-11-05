-- ============================================================
-- Smart Pantry
-- Incremento 2: cache de imagens de receitas e bucket público
-- ============================================================

-- Guarda o resultado da busca de imagens no Wikimedia Commons.
-- A chave é a consulta normalizada (sem acentos e em minúsculas), para que
-- receitas diferentes que usem o mesmo prato reutilizem a mesma imagem.
create table if not exists public.recipe_image_cache (
  query text primary key,
  image_url text not null,
  storage_path text not null,
  source_page_url text,
  author text,
  license text,
  license_url text,
  source text not null default 'wikimedia-commons',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recipe_image_cache is
  'Cache de imagens de receitas obtidas do Wikimedia Commons e armazenadas no Supabase Storage.';

alter table public.recipe_image_cache enable row level security;

-- Somente a Edge Function (service_role) acessa este cache.
revoke all on table public.recipe_image_cache from anon, authenticated;
grant select, insert, update, delete
on table public.recipe_image_cache
to service_role;

create index if not exists recipe_image_cache_updated_idx
on public.recipe_image_cache (updated_at desc);


-- Bucket público usado para servir as imagens já baixadas.
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do update set public = excluded.public;

-- Leitura pública das imagens. O upload é feito pela Edge Function com a
-- service_role, que ignora RLS.
drop policy if exists "Public can read recipe images" on storage.objects;

create policy "Public can read recipe images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'recipe-images');
