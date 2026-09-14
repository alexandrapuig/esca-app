CREATE TABLE IF NOT EXISTS public.recalls (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source              text NOT NULL,
  external_recall_id  text NOT NULL,
  product_description text NOT NULL,
  upc_codes           text[] NOT NULL DEFAULT ARRAY[]::text[],
  reason              text,
  classification      text,
  recall_date         date,
  raw_data            jsonb NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, external_recall_id)
);

CREATE INDEX IF NOT EXISTS idx_recalls_recall_date
  ON public.recalls (recall_date DESC);

CREATE TABLE IF NOT EXISTS public.recall_matches (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recall_id        uuid NOT NULL REFERENCES public.recalls(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fridge_item_id   uuid NOT NULL REFERENCES public.fridge_items(id) ON DELETE CASCADE,
  match_type       text NOT NULL CHECK (match_type IN ('barcode', 'name_fuzzy')),
  match_confidence numeric,
  notified         boolean NOT NULL DEFAULT false,
  notified_at      timestamptz,
  resolved         boolean NOT NULL DEFAULT false,
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recall_id, fridge_item_id)
);

ALTER TABLE public.recall_matches
  ADD COLUMN IF NOT EXISTS resolved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_recall_matches_unnotified
  ON public.recall_matches (notified)
  WHERE notified = false;

CREATE INDEX IF NOT EXISTS idx_recall_matches_active_user
  ON public.recall_matches (user_id, created_at DESC)
  WHERE resolved = false;

ALTER TABLE public.recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recall_matches ENABLE ROW LEVEL SECURITY;