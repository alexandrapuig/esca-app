-- Tagged ingredients for recipe suggestions. Each entry is
--   { "text": "200g grated parmesan", "status": "owned|partial|missing|staple",
--     "note": "you have 100 grams" }
-- note is present only on partials.
--
-- Added alongside the existing ingredients text[] rather than replacing it:
-- recipes generated before this change keep rendering from the plain array,
-- and nothing that reads ingredients as string[] breaks.

alter table recipe_suggestions
  add column if not exists ingredient_details jsonb default '[]'::jsonb;
