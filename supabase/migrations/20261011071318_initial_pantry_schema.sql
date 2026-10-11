-- ============================================================
-- Smart Pantry
-- Migration inicial: estoque, movimentações, índices e RLS
-- ============================================================

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null
    check (char_length(trim(name)) between 1 and 120),

  category text not null default 'outros'
    check (char_length(trim(category)) between 1 and 60),

  quantity numeric(12, 3) not null default 1
    check (quantity >= 0),

  unit text not null
    check (
      unit in (
        'un',
        'g',
        'kg',
        'ml',
        'l',
        'pacote',
        'caixa',
        'lata'
      )
    ),

  expiration_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  constraint pantry_items_id_user_unique
    unique (id, user_id)
);


create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  pantry_item_id uuid not null,

  movement_type text not null
    check (
      movement_type in (
        'entry',
        'consumption',
        'waste',
        'adjustment',
        'reversal'
      )
    ),

  quantity numeric(12, 3) not null
    check (quantity > 0),

  reason text,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint stock_movements_item_owner_fk
    foreign key (pantry_item_id, user_id)
    references public.pantry_items(id, user_id)
    on delete restrict,

  constraint stock_movements_waste_reason_check
    check (
      movement_type <> 'waste'
      or nullif(trim(reason), '') is not null
    )
);


-- ============================================================
-- Atualização automática do campo updated_at
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create trigger pantry_items_set_updated_at
before update on public.pantry_items
for each row
execute function public.set_updated_at();


-- ============================================================
-- Índices
-- ============================================================

create index pantry_items_user_active_idx
on public.pantry_items (user_id)
where archived_at is null;


create index pantry_items_expiration_idx
on public.pantry_items (user_id, expiration_date)
where archived_at is null;


create index stock_movements_user_date_idx
on public.stock_movements (user_id, occurred_at desc);


create index stock_movements_item_idx
on public.stock_movements (pantry_item_id);


-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.pantry_items enable row level security;
alter table public.stock_movements enable row level security;


-- Usuários sem sessão não acessam as tabelas.

revoke all on table public.pantry_items from anon;
revoke all on table public.stock_movements from anon;


-- Usuários autenticados dependem das políticas RLS.

grant select, insert, update, delete
on table public.pantry_items
to authenticated;


grant select, insert, update, delete
on table public.stock_movements
to authenticated;


-- ============================================================
-- Políticas da despensa
-- ============================================================

create policy "Users can read their pantry items"
on public.pantry_items
for select
to authenticated
using ((select auth.uid()) = user_id);


create policy "Users can create their pantry items"
on public.pantry_items
for insert
to authenticated
with check ((select auth.uid()) = user_id);


create policy "Users can update their pantry items"
on public.pantry_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


create policy "Users can delete their pantry items"
on public.pantry_items
for delete
to authenticated
using ((select auth.uid()) = user_id);


-- ============================================================
-- Políticas das movimentações
-- ============================================================

create policy "Users can read their stock movements"
on public.stock_movements
for select
to authenticated
using ((select auth.uid()) = user_id);


create policy "Users can create their stock movements"
on public.stock_movements
for insert
to authenticated
with check ((select auth.uid()) = user_id);


create policy "Users can update their stock movements"
on public.stock_movements
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);


create policy "Users can delete their stock movements"
on public.stock_movements
for delete
to authenticated
using ((select auth.uid()) = user_id);