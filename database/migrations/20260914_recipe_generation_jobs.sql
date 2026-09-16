-- Async recipe generation. Claude calls run close to the Vercel function
-- limit, so generation moves off the request path: the endpoint creates a
-- job, returns immediately, and the frontend polls this row.
-- status: pending | running | done | failed

create table public.recipe_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending',
  error text,
  recipe_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recipe_generation_jobs_household
  on public.recipe_generation_jobs (household_id, created_at desc);

alter table public.recipe_generation_jobs enable row level security;
