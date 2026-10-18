import type { ItemImageReading } from './api';

/**
 * Shared inventory constants.
 *
 * These were duplicated across the add and edit forms, and splitting add into
 * single and bulk would have made four copies. The category list in particular
 * has to stay in step with normalizeCategory in backend/src/services/
 * fridgeService.ts: a value this file allows but the backend does not silently
 * becomes 'other', which changes the item's risk thresholds.
 */

export const CATEGORIES = [
  'produce',
  'dairy',
  'meat',
  'seafood',
  'bakery',
  'frozen',
  'pantry',
  'beverage',
  'condiments',
  'spices',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Must match SIZE_UNITS in backend/src/services/fridgeService.ts. 'fl oz' is
 * volume and 'oz' is mass; they are not interchangeable.
 */
export const SIZE_UNITS = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl oz', 'other'] as const;

const SIZE_UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml', milliliter: 'ml', milliliters: 'ml',
  l: 'l', litre: 'l', litres: 'l', liter: 'l', liters: 'l',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  'fl oz': 'fl oz', 'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz',
};

/**
 * Maps a free-text unit, such as one from Open Food Facts, onto the fixed
 * list. Returns an empty string when it does not match, so a dropdown stays
 * unset rather than defaulting to 'other' on a spelling we have not listed.
 */
export function normalizeSizeUnit(value: string): string {
  const raw = value.trim().toLowerCase();

  if (!raw) {
    return '';
  }

  return SIZE_UNIT_ALIASES[raw] ?? '';
}

/**
 * One parsed row awaiting review before it is saved. Extends the parser's own
 * shape rather than restating it, so a new field on ItemImageReading does not
 * need adding here too.
 */
export type ReviewItem = ItemImageReading & {
  /** Stable key for editing a row; readings carry no id of their own. */
  rowId: string;
  include: boolean;
};
