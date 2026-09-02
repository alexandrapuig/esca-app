-- Adds household_id to spoilage_predictions and recipe_suggestions, backfills
-- from users.household_id, and appends household_id to the latest view.
-- Nullable on purpose: deployed code still inserts without it. Tighten to
-- NOT NULL only after the household-scoped services are live.

alter table spoilage_predictions add column if not exists household_id uuid references households(id);
alter table recipe_suggestions  add column if not exists household_id uuid references households(id);

update spoilage_predictions sp
set household_id = u.household_id
from users u
where sp.user_id = u.id and sp.household_id is null;

update recipe_suggestions rs
set household_id = u.household_id
from users u
where rs.user_id = u.id and rs.household_id is null;

-- CREATE OR REPLACE VIEW can only append columns, so household_id goes last.
create or replace view latest_spoilage_predictions as
  select distinct on (fridge_item_id) id,
    fridge_item_id,
    user_id,
    risk_level,
    days_until_expiry,
    spoilage_probability_percent,
    confidence_score,
    reasoning,
    created_at,
    household_id
  from spoilage_predictions
  order by fridge_item_id, created_at desc;
