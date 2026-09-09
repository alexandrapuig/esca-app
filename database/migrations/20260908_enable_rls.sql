-- Enable RLS on tables that had policies but RLS switched off.
-- Policies currently fail closed (auth.uid() is an auth.users.id,
-- user_id holds a public.users.id) and enforce nothing. Backend uses
-- the service role key and bypasses RLS, so this closes anon/PostgREST
-- access without affecting any application path.
-- The real policy rewrite against household_id is still outstanding.

alter table public.fridge_items         enable row level security;
alter table public.spoilage_predictions enable row level security;
alter table public.recipe_suggestions   enable row level security;
alter table public.barcode_cache        enable row level security;

-- Granted to public (includes anon); only the backend reads this table.
drop policy if exists "Anyone can read barcode cache" on public.barcode_cache;
drop policy if exists "Authenticated users can insert barcode cache" on public.barcode_cache;

-- Enforce the querying user's RLS rather than the view owner's.
alter view public.latest_spoilage_predictions set (security_invoker = on);
