-- Stores the scanned barcode on the item itself.
--
-- Needed so EDITING an item can teach the barcode cache, not just creating
-- one. Correcting a wrong category is the most natural moment to fix it, and
-- the edit route has no other way to know which product it is looking at.
--
-- Nullable on purpose: manually added items have no barcode, and rows created
-- before this column cannot be backfilled because the value was never stored.
-- Those items teach nothing on edit.
--
-- The index is not used by anything today. It is for looking up which
-- households hold a given barcode, which is what recall matching would need.

alter table fridge_items
  add column if not exists barcode text;

create index if not exists idx_fridge_items_barcode
  on public.fridge_items using btree (barcode);
