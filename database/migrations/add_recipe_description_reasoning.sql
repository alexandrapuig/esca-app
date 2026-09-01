-- Align recipe_suggestions with what the application actually writes.
--
-- description and reasoning were produced by Claude and written by
-- recipeService, but had no columns and every insert failed. instructions was
-- text while the code wrote an array, matching ingredients.
--
-- Applied to the live database on 2026-09-01.
ALTER TABLE public.recipe_suggestions
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS reasoning text;

ALTER TABLE public.recipe_suggestions
  ALTER COLUMN instructions TYPE text[]
  USING CASE
    WHEN instructions IS NULL THEN NULL
    ELSE ARRAY[instructions]
  END;

COMMENT ON COLUMN public.recipe_suggestions.description IS 'Short recipe summary from Claude';
COMMENT ON COLUMN public.recipe_suggestions.reasoning IS 'Why this recipe was suggested, given at-risk items';
COMMENT ON COLUMN public.recipe_suggestions.instructions IS 'Ordered steps; array to match ingredients';
