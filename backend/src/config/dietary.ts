/**
 * The canonical dietary vocabulary.
 *
 * Used for user profile restrictions AND recipe dietary_tags so the two can be
 * matched programmatically. Do not add values in one place only — a tag Claude
 * returns that is not in this list will never match a user restriction.
 */
export const DIETARY_OPTIONS = [
  'vegetarian',
  'vegan',
  'gluten-free',
  'dairy-free',
  'nut-free',
  'pescatarian',
  'keto',
  'halal',
  'kosher',
] as const;

export type DietaryOption = (typeof DIETARY_OPTIONS)[number];

export function normalizeDietaryTags(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const allowed: readonly string[] = DIETARY_OPTIONS;

  return Array.from(
    new Set(
      input
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => allowed.includes(item)),
    ),
  );
}
