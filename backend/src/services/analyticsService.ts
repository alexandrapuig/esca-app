import { getSupabaseAdminClient } from '../utils/supabaseAdmin';

/**
 * Product analytics, stored in our own events table rather than sent to a
 * third party. PostHog was the original plan; at two users the questions worth
 * asking are one SQL query away, and this keeps the data in one place. The
 * shape (event_name plus a properties bag) matches PostHog's, so migrating
 * later is an export rather than a rewrite.
 */

/**
 * Property values are allowlisted by KEY, not sanitised by inspection.
 *
 * The rule is that no item names, recipe names, brands, purchase locations,
 * emails, notes, or dietary restrictions ever reach this table. Trusting each
 * call site to honour that means one careless `{ name: item.name }` undoes it
 * silently and nobody notices for months. So anything not on this list is
 * dropped before the insert, and adding a key here is a deliberate act.
 *
 * Categories, risk levels, counts, booleans and enum-like sources are safe:
 * they describe behaviour without describing the person or their food.
 */
const ALLOWED_PROPERTY_KEYS = new Set([
  'category',
  'risk_level',
  'status',
  'source',
  'via',
  'count',
  'auto',
  'success',
  'difficulty',
  'cuisine',
  'had_barcode',
  'field_count',
]);

type EventProperties = Record<string, string | number | boolean | null>;

function filterProperties(properties: EventProperties): EventProperties {
  const filtered: EventProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTY_KEYS.has(key)) {
      continue;
    }

    // Strings are only safe if they are enum-like. A long or unusual string in
    // an allowed key means a call site is passing something it should not.
    if (typeof value === 'string' && value.length > 40) {
      continue;
    }

    filtered[key] = value;
  }

  return filtered;
}

/**
 * Never throws and never blocks. Analytics failing must not fail the request
 * that triggered it - the user's item is already saved either way.
 */
export async function trackEvent(params: {
  eventName: string;
  userId?: string | null;
  householdId?: string | null;
  properties?: EventProperties;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase.from('events').insert({
      event_name: params.eventName,
      user_id: params.userId ?? null,
      household_id: params.householdId ?? null,
      properties: filterProperties(params.properties ?? {}),
    });

    if (error) {
      console.error('trackEvent insert failed', { eventName: params.eventName, error });
    }
  } catch (error) {
    console.error('trackEvent failed', { eventName: params.eventName, error });
  }
}