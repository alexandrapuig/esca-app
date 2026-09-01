-- Households: shared inventory across multiple user accounts.
--
-- One household per user, enforced by UNIQUE (user_id) on household_members.
-- Every existing user was backfilled into a household of one, so this is inert
-- until reads switch to household scope.
--
-- max_members defaults to 1. Shared households are a paid feature; the cap is
-- enforced at the invite endpoint, not here.
--
-- RLS is ENABLED with NO POLICIES on both tables. That denies all access to
-- anon/authenticated clients while the backend's service key bypasses RLS as
-- usual. Real policies come with the RLS rewrite, once the ownership model is
-- final. See outstanding issues in schema.sql.
--
-- Applied to the live database on 2026-09-01.

CREATE TABLE IF NOT EXISTS public.households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  max_members integer NOT NULL DEFAULT 1,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.household_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member',
  joined_at    timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.households        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE SET NULL;

ALTER TABLE public.fridge_items
  ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES public.households(id) ON DELETE CASCADE;

-- Backfill. Generates each household id alongside its user so the pairing is
-- explicit; an earlier version matched them by row_number() after the fact and
-- swapped two users' households.
WITH pairs AS (
  SELECT u.id AS user_id,
         gen_random_uuid() AS household_id,
         COALESCE(NULLIF(trim(u.name), ''), split_part(u.email, '@', 1)) || '''s household' AS household_name
    FROM public.users u
   WHERE u.household_id IS NULL
), inserted_households AS (
  INSERT INTO public.households (id, name, max_members)
  SELECT household_id, household_name, 1 FROM pairs
  RETURNING id
)
INSERT INTO public.household_members (household_id, user_id, role)
SELECT household_id, user_id, 'owner' FROM pairs;

UPDATE public.users u
   SET household_id = hm.household_id
  FROM public.household_members hm
 WHERE hm.user_id = u.id AND u.household_id IS NULL;

UPDATE public.fridge_items f
   SET household_id = u.household_id
  FROM public.users u
 WHERE u.id = f.user_id AND f.household_id IS NULL;
