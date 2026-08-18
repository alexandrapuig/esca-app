-- Ensure users table has updated_at column
alter table if exists public.users
  add column if not exists updated_at timestamptz default now();

-- Function to keep updated_at current on every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger on public.users to call set_updated_at before each UPDATE
drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
