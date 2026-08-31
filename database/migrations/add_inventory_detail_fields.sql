-- Add optional detail fields to fridge_items.
-- Applied to the live database on 2026-08-31.
ALTER TABLE public.fridge_items
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS purchase_location text,
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.fridge_items.brand IS 'Product brand, auto-populated from barcode lookup where available';
COMMENT ON COLUMN public.fridge_items.purchase_location IS 'Store name, free text; a managed store list is deferred until beta data exists';
COMMENT ON COLUMN public.fridge_items.purchase_price IS 'Actual price paid, used for real money-saved figures instead of estimates';
COMMENT ON COLUMN public.fridge_items.notes IS 'Free-form user notes';
