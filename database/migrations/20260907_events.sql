-- Product analytics, kept in our own table rather than sent to a third party.
-- PostHog was the original plan for task C; at current scale the questions
-- worth asking are one SQL query away. The shape (event_name plus a properties
-- bag) matches PostHog's, so migrating later is an export, not a rewrite.
--
-- Writes go through analyticsService.trackEvent, which allowlists property
-- KEYS. No item names, recipe names, brands, purchase locations, emails,
-- notes, or dietary restrictions ever reach this table. Adding a key to that
-- allowlist is a deliberate act - do not widen it casually.
--
-- user_id is nullable so events can be recorded before a user row exists.
-- RLS is enabled with no policies, denying client access; the service key
-- bypasses it as usual.

create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete cascade,
  event_name   text not null,
  properties   jsonb default '{}'::jsonb,
  created_at   timestamptz default now()
);

create index if not exists idx_events_event_name on public.events using btree (event_name);
create index if not exists idx_events_created_at on public.events using btree (created_at);

alter table public.events enable row level security;
