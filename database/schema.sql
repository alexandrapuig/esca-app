-- Esca — database schema
--
-- SOURCE OF TRUTH: this file was generated on 2026-08-19 by reading the live
-- Supabase database (information_schema.columns, pg_constraint, pg_policies,
-- pg_indexes). It reflects what the database actually contained at that moment,
-- not what was intended.
--
-- The previous version of this file had drifted from production and caused a
-- multi-hour debugging session: it declared fridge_items.typical_shelf_life_days
-- while the live column was named shelf_life_days, so every insert failed with
-- PostgREST error PGRST204. The column has since been renamed in the live
-- database to match the application code.
--
-- KNOWN ISSUES IN THE LIVE DATABASE, PRESERVED HERE AS-IS — see notes at the
-- bottom of this file before using it as a template for a new environment.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- fridge_items, recipe_suggestions, spoilage_predictions default their primary
-- keys to uuid_generate_v4(), which requires uuid-ossp. users uses the built-in
-- gen_random_uuid() instead. This inconsistency exists in the live database.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
--
-- NOTE: id and auth_user_id are DELIBERATELY DISTINCT.
--   id            — this table's own primary key
--   auth_user_id  — the corresponding auth.users.id
--
-- All child tables reference users(id), NOT the auth user id. This distinction
-- is the single most important thing to know about this schema.
--
-- There is no trigger on auth.users. A handle_new_user trigger previously
-- existed and was dropped because it inserted into public.users without
-- auth_user_id, aborting signups. User provisioning now happens entirely in
-- authenticateUser(), which upserts on auth_user_id on every authenticated
-- request. This is intentional.

CREATE TABLE IF NOT EXISTS public.users (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id         uuid NOT NULL UNIQUE,
  email                text NOT NULL UNIQUE,
  dietary_restrictions text[] DEFAULT ARRAY[]::text[],
  cuisine_preferences  text[] DEFAULT ARRAY[]::text[],
  created_at           timestamp without time zone DEFAULT now(),
  name                 text,
  terms_accepted_at    timestamptz,
  terms_version        text
);

-- Added 2026-08-19. This FK was lost when public.users was dropped with CASCADE
-- and went unrebuilt, which allowed orphaned profile rows to accumulate when
-- auth users were deleted. One such row existed and was removed before the
-- constraint could be applied.
ALTER TABLE public.users
  ADD CONSTRAINT users_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- NOTE: users.created_at is `timestamp without time zone`, while every other
-- table uses `timestamp with time zone`. Inconsistent, but matches production.
-- terms_accepted_at, in the same table, IS timestamptz.
--
-- Added 2026-08-22. terms_accepted_at and terms_version were live in the
-- database but missing from this file; userService.getUserProfile selects both
-- on every profile request. Column order above now matches live
-- ordinal_position, verified via information_schema.columns on 2026-08-22.
--
-- Nullability and defaults for these two columns were NOT verified: the query
-- run selected only column_name and data_type. They are written as nullable
-- with no default, which is an assumption, not a confirmed fact.

-- ---------------------------------------------------------------------------
-- fridge_items
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fridge_items (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name                    text NOT NULL,
  category                text NOT NULL,
  quantity                numeric DEFAULT 1,
  unit                    text DEFAULT 'pieces',
  purchase_date           date,
  expiry_date             date,
  estimated_expiry        date,
  typical_shelf_life_days integer,
  storage_location        text DEFAULT 'fridge',
  status                  text DEFAULT 'fresh',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now(),
  brand                   text,
  purchase_location       text,
  purchase_price          numeric,
  notes                   text
);

CREATE INDEX IF NOT EXISTS idx_fridge_items_user_id
  ON public.fridge_items USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_fridge_items_storage_location
  ON public.fridge_items USING btree (storage_location);

-- NOTE: category is NOT NULL with no default. The backend always supplies a
-- value via normalizeCategory(), but any other writer must set it explicitly.
--
-- NOTE: both expiry_date and estimated_expiry exist. The application only ever
-- writes estimated_expiry; expiry_date appears to be vestigial.
--
-- NOTE: there are NO CHECK constraints on status, category, or storage_location
-- in the live database, despite the application treating them as enums.
-- Validation is application-side only. See notes at the bottom.

-- ---------------------------------------------------------------------------
-- spoilage_predictions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.spoilage_predictions (
  id                           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fridge_item_id               uuid NOT NULL REFERENCES public.fridge_items(id) ON DELETE CASCADE,
  user_id                      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  risk_level                   text NOT NULL,
  days_until_expiry            integer,
  spoilage_probability_percent numeric DEFAULT 0,
  confidence_score             numeric DEFAULT 0,
  reasoning                    text,
  created_at                   timestamptz DEFAULT now(),
  updated_at                   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spoilage_predictions_user_id
  ON public.spoilage_predictions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_spoilage_predictions_fridge_item_id
  ON public.spoilage_predictions USING btree (fridge_item_id);

-- ---------------------------------------------------------------------------
-- recipe_suggestions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.recipe_suggestions (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              text NOT NULL,
  ingredients       text[] DEFAULT '{}'::text[],
  instructions      text[] DEFAULT '{}'::text[],
  difficulty        text DEFAULT 'medium',
  prep_time_minutes integer,
  cuisine           text DEFAULT 'other',
  dietary_tags      text[] DEFAULT '{}'::text[],
  saved             boolean DEFAULT false,
  cooked            boolean DEFAULT false,
  variants          jsonb DEFAULT '[]'::jsonb,
  description       text,
  reasoning         text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_suggestions_user_id
  ON public.recipe_suggestions USING btree (user_id);

-- ---------------------------------------------------------------------------
-- barcode_cache
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.barcode_cache (
  barcode         text PRIMARY KEY,
  product_name    text NOT NULL,
  category        text NOT NULL,
  shelf_life_days integer,
  created_at      timestamptz DEFAULT now()
);

-- NOTE: this table's column is shelf_life_days, NOT typical_shelf_life_days.
-- That differs from fridge_items and is correct here — verify barcodeService.ts
-- uses this exact name before changing anything.

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
--
-- WARNING: the policies below are reproduced from the live database and are
-- BROKEN. See issue 1 at the bottom of this file.
--
-- The backend uses a Supabase secret key (sb_secret_...), which carries
-- BYPASSRLS, so these policies are not exercised by the application today.

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fridge_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spoilage_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_suggestions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_cache        ENABLE ROW LEVEL SECURITY;

-- users — these two are CORRECT: they compare auth.uid() to auth_user_id.
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- fridge_items — BROKEN: compares auth.uid() to user_id, but user_id holds a
-- public.users.id, not an auth.users.id. The condition can never be true.
CREATE POLICY "Users can read own fridge items"
  ON public.fridge_items FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fridge items"
  ON public.fridge_items FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fridge items"
  ON public.fridge_items FOR UPDATE TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fridge items"
  ON public.fridge_items FOR DELETE TO public
  USING (auth.uid() = user_id);

-- spoilage_predictions — BROKEN, same reason. Also note: no DELETE policy.
CREATE POLICY "Users can read own predictions"
  ON public.spoilage_predictions FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON public.spoilage_predictions FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
  ON public.spoilage_predictions FOR UPDATE TO public
  USING (auth.uid() = user_id);

-- recipe_suggestions — BROKEN, same reason.
CREATE POLICY "Users can read own recipes"
  ON public.recipe_suggestions FOR SELECT TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON public.recipe_suggestions FOR INSERT TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON public.recipe_suggestions FOR UPDATE TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON public.recipe_suggestions FOR DELETE TO public
  USING (auth.uid() = user_id);

-- barcode_cache — intentionally open; the cache holds no user data.
CREATE POLICY "Anyone can read barcode cache"
  ON public.barcode_cache FOR SELECT TO public
  USING (true);

CREATE POLICY "Authenticated users can insert barcode cache"
  ON public.barcode_cache FOR INSERT TO public
  WITH CHECK (true);


-- ===========================================================================
-- OUTSTANDING ISSUES  (documented 2026-08-19, none fixed)
-- ===========================================================================
--
-- 1. RLS IS NOT CURRENTLY FUNCTIONAL
--
--    Every policy on fridge_items, spoilage_predictions, and recipe_suggestions
--    tests `auth.uid() = user_id`. auth.uid() returns an auth.users.id; user_id
--    holds a public.users.id. These are different UUIDs by design, so the
--    condition is never true and every policy fails closed.
--
--    This is currently harmless — the backend uses a secret key that bypasses
--    RLS — but it means the policies provide no protection. If anything ever
--    reaches these tables with a user token, all operations will be denied.
--
--    The correct form is:
--      USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()))
--
--    Do NOT apply that change without testing: fixing the condition turns
--    policies that currently deny everything into policies that actually
--    control access, which is a meaningful behavioural change.
--
-- 2. POLICIES ARE GRANTED TO `public`, NOT `authenticated`
--
--    The `public` role includes `anon`. The users table policies correctly use
--    `authenticated`; the three child tables do not. Moot while the conditions
--    are unsatisfiable, but it should be fixed alongside issue 1.
--
-- 3. NO CHECK CONSTRAINTS
--
--    status, category, storage_location, risk_level, and difficulty are all
--    treated as enums by the application but are unconstrained `text` in the
--    database. Validation is application-side only.
--
-- 4. NO DELETE POLICY ON spoilage_predictions
--
--    The other tables have four policies each; this one has three.
--
-- ===========================================================================
-- RESOLVED
-- ===========================================================================
--
-- 2026-08-19  fridge_items.shelf_life_days renamed to typical_shelf_life_days
--             to match the application code. This was the cause of PGRST204 on
--             every insert, and of 500s on the list and status-update endpoints,
--             which named the same column in their SELECT lists.
--
-- 2026-08-19  users_auth_user_id_fkey added (see the users table above). One
--             orphaned profile row was deleted first; it had no dependent
--             fridge items, predictions, or recipes.
--
-- ===========================================================================
-- KEEPING THIS FILE HONEST
-- ===========================================================================
--
-- This file is documentation, not a migration history — nothing enforces that
-- it matches production. It drifted once and cost hours. To re-derive it, run
-- these four queries in the Supabase SQL Editor (one at a time; the editor only
-- shows output from the last statement):
--
--   SELECT table_name, column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns
--    WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
--
--   SELECT rel.relname, con.conname, pg_get_constraintdef(con.oid)
--     FROM pg_constraint con
--     JOIN pg_class rel ON rel.oid = con.conrelid
--     JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
--    WHERE nsp.nspname = 'public' ORDER BY rel.relname, con.contype;
--
--   SELECT tablename, policyname, roles, cmd, qual, with_check
--     FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
--
--   SELECT tablename, indexname, indexdef
--     FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;
--
-- When a schema change is made in the SQL Editor, update this file in the same
-- commit as any application code that depends on it.