-- Indexes on household_id: every fridge, prediction, and recipe read filters on
-- it after the push 2 household scoping, and all of them were sequential scans.
-- household_members is indexed ahead of the push 4 invite/member lookups.

create index if not exists idx_fridge_items_household_id
  on public.fridge_items using btree (household_id);
create index if not exists idx_spoilage_predictions_household_id
  on public.spoilage_predictions using btree (household_id);
create index if not exists idx_recipe_suggestions_household_id
  on public.recipe_suggestions using btree (household_id);
create index if not exists idx_household_members_household_id
  on public.household_members using btree (household_id);

-- Verified 0 nulls on all four tables before applying. users.household_id is
-- deliberately NOT constrained: authenticateUser inserts the user row first and
-- provisions the household second, so a null is legitimate in that window.
-- Constraining it would break signup.

alter table public.fridge_items         alter column household_id set not null;
alter table public.spoilage_predictions alter column household_id set not null;
alter table public.recipe_suggestions   alter column household_id set not null;
