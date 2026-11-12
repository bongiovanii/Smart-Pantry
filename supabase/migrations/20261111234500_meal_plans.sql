-- ============================================================
-- Smart Pantry
-- Planejamento semanal persistente (Fase 4)
-- ============================================================

-- Cada linha representa uma refeição planejada em um slot da semana.
-- A restrição única garante um único prato por dia + tipo de refeição; ao
-- reagendar o mesmo slot, o frontend faz upsert e substitui o prato.
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  day_of_week text not null
    check (day_of_week in ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM')),

  meal_type text not null
    check (meal_type in ('Café da manhã', 'Almoço', 'Lanche', 'Jantar')),

  recipe_id text not null
    check (char_length(trim(recipe_id)) between 1 and 200),

  recipe_title text not null
    check (char_length(trim(recipe_title)) between 1 and 200),

  recipe_image text,

  -- Snapshot completo da receita no momento do agendamento. Guardar o
  -- snapshot permite abrir o modal de detalhes sem uma nova chamada ao Gemini
  -- e mantém o planejamento estável mesmo que as sugestões mudem depois.
  recipe_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(recipe_snapshot) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint meal_plans_user_slot_unique
    unique (user_id, day_of_week, meal_type)
);

comment on table public.meal_plans is
  'Planejamento semanal do usuário: um prato por dia da semana e tipo de refeição.';

create index if not exists meal_plans_user_day_idx
on public.meal_plans (user_id, day_of_week);


-- ============================================================
-- Atualização automática do campo updated_at
-- ============================================================

create trigger meal_plans_set_updated_at
before update on public.meal_plans
for each row
execute function public.set_updated_at();


-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.meal_plans enable row level security;

revoke all on table public.meal_plans from anon;

grant select, insert, update, delete
on table public.meal_plans
to authenticated;

create policy "Users can read their meal plans"
on public.meal_plans
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their meal plans"
on public.meal_plans
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their meal plans"
on public.meal_plans
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their meal plans"
on public.meal_plans
for delete
to authenticated
using ((select auth.uid()) = user_id);
