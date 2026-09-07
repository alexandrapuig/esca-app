-- Distinguishes where a cached barcode came from.
--
--   openfoodfacts - a real product record from the Open Food Facts API
--   user          - what a user entered after identification failed for them
--
-- When a lookup fails, the user fills the form in themselves and learnBarcode
-- records that mapping, so the next person to scan the same code gets a real
-- answer. learnBarcode only inserts when no row exists, so a user entry never
-- replaces an Open Food Facts record - but it WILL correct that record's
-- category, since Open Food Facts is reliable on names and unreliable on
-- categories.
--
-- Existing rows all predate this column and came from Open Food Facts, which
-- is why that is the default.
--
-- Known limitation: one user's typo becomes everyone's product name. Accepted
-- at current scale; this column is what makes those rows findable later.

alter table barcode_cache
  add column if not exists source text default 'openfoodfacts';
