-- Open Food Facts returns brand and package size alongside the product name.
-- Cached here so a repeat scan of the same barcode fills the add form without
-- another lookup.
--
-- quantity_text holds the raw source string ("454 g", "500 ml") rather than a
-- parsed number and unit. Parsing happens at read time in the add form, so the
-- parser can be improved without a migration or a cache rebuild.

alter table barcode_cache
  add column if not exists brand text,
  add column if not exists quantity_text text;
