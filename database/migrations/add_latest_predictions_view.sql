-- Latest prediction per fridge item.
--
-- spoilage_predictions accumulates history (one row per item per prediction
-- run, hourly) so trends can be built later. This view exposes only the most
-- recent row per item, which is what the inventory UI needs. PostgREST cannot
-- express DISTINCT ON directly, hence the view.
--
-- NOTE: this view runs with owner permissions and does not enforce RLS on the
-- underlying table. That is currently moot because the backend uses a service
-- key that bypasses RLS, but it MUST be revisited if RLS is ever fixed
-- (see the outstanding issues in schema.sql, and task E household sharing).
--
-- Applied to the live database on 2026-09-01.
CREATE OR REPLACE VIEW public.latest_spoilage_predictions AS
SELECT DISTINCT ON (fridge_item_id)
  id,
  fridge_item_id,
  user_id,
  risk_level,
  days_until_expiry,
  spoilage_probability_percent,
  confidence_score,
  reasoning,
  created_at
FROM public.spoilage_predictions
ORDER BY fridge_item_id, created_at DESC;
