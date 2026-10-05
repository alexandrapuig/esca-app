import { identifyItemFromImageWithClaude, type ItemImageIdentification } from './aiService';

/**
 * Identifies a single grocery item from a photo of its packaging or a
 * screenshot of a product listing.
 *
 * Deliberately NOT cached. There is no stable key to cache against - unlike a
 * barcode, two photos of the same product are different inputs - and Claude's
 * reading is inference, not lookup. Same reasoning as the Claude branch of
 * barcode identification.
 */

const CATEGORIES = ['produce', 'dairy', 'meat', 'seafood', 'bakery', 'frozen', 'pantry', 'beverage', 'other'];

const ACCEPTED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Vercel caps a serverless request body at roughly 4.5MB and base64 inflates
// by a third, so an oversized photo fails at the platform edge with an error
// that never reaches the catch block below. Rejecting here keeps the failure
// legible. The client downscales before encoding; this is the backstop.
const MAX_IMAGE_BASE64_LENGTH = 3_500_000;

export type ItemImageResult =
  | { success: true; data: ItemImageIdentification }
  | { success: false; status: number; error: string };

/**
 * Accepts either a bare base64 string or a full data URL, and reports the
 * media type actually declared by the data URL when there is one.
 */
function splitImageInput(image: string, declaredMediaType?: string): { data: string; mediaType: string } {
  const dataUrlMatch = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.*)$/is.exec(image.trim());

  if (dataUrlMatch) {
    return { data: (dataUrlMatch[2] ?? '').trim(), mediaType: (dataUrlMatch[1] ?? 'image/jpeg').trim().toLowerCase() };
  }

  return {
    data: image.trim(),
    mediaType: (declaredMediaType ?? 'image/jpeg').trim().toLowerCase(),
  };
}

export async function identifyItemFromImage(params: {
  image: string;
  mediaType?: string;
}): Promise<ItemImageResult> {
  const { data, mediaType } = splitImageInput(params.image ?? '', params.mediaType);

  if (!data) {
    return { success: false, status: 400, error: 'An image is required.' };
  }

  if (!ACCEPTED_MEDIA_TYPES.includes(mediaType)) {
    return {
      success: false,
      status: 400,
      error: 'That image format is not supported. Use a JPEG, PNG, WebP or GIF.',
    };
  }

  if (data.length > MAX_IMAGE_BASE64_LENGTH) {
    return {
      success: false,
      status: 413,
      error: 'That image is too large. Take the photo again or pick a smaller one.',
    };
  }

  if (!/^[A-Za-z0-9+/=\s]+$/.test(data)) {
    return { success: false, status: 400, error: 'The image could not be read.' };
  }

  try {
    const identified = await identifyItemFromImageWithClaude({ image: data, mediaType });

    if (!identified) {
      // A legible photo of something unidentifiable, or nothing legible at
      // all. Leaving the form blank beats a confident wrong prefill, which is
      // more work to correct than an empty field is to fill.
      return {
        success: false,
        status: 404,
        error: 'Nothing readable in that photo. Try a clearer shot of the label, or fill the fields yourself.',
      };
    }

    // Claude is told the nine categories but a stray value would land in the
    // form as an unselectable option, so an unrecognised one becomes null and
    // the dropdown keeps its default.
    const category = identified.category && CATEGORIES.includes(identified.category) ? identified.category : null;

    // A listing shows a depiction of a product, not the carton in the
    // user's fridge: a date on a store page or a cart screenshot belongs to
    // the order or to a stock photo, never to the item being added. Dropped
    // here rather than in the UI so it cannot reach the client at all.
    const isListing = identified.source_kind === 'listing';

    return {
      success: true,
      data: {
        ...identified,
        category,
        printed_date: isListing ? null : identified.printed_date,
        printed_date_kind: isListing ? null : identified.printed_date_kind,
      },
    };
  } catch (error) {
    console.error('identifyItemFromImageWithClaude failed', error);

    // Copied from recipeService rather than shared, by decision. A single
    // fixed message hid an expired API key for two days in September: every
    // 401 was reported as a timeout. The bracketed tag is the only place a
    // cause is visible, since Vercel runtime logs are unreachable.
    const err = error as { message?: string; code?: string; response?: { status?: number } };
    const httpStatus = err?.response?.status;
    const message = err?.message ?? '';
    let userMessage = 'Could not read that photo. Please try again.';
    let tag = 'unknown';

    if (httpStatus === 401 || httpStatus === 403) {
      userMessage = 'Photo identification is misconfigured. Please contact support.';
      tag = `http ${httpStatus}`;
    } else if (httpStatus === 429) {
      userMessage = 'Photo identification is busy. Please try again in a minute.';
      tag = 'http 429';
    } else if (typeof httpStatus === 'number' && httpStatus >= 500) {
      userMessage = 'Photo identification is temporarily unavailable. Please try again.';
      tag = `http ${httpStatus}`;
    } else if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT' || message.includes('timeout')) {
      userMessage = 'Reading that photo took too long. Please try again.';
      tag = 'timeout';
    } else if (error instanceof SyntaxError) {
      userMessage = 'Photo identification returned an unexpected response. Please try again.';
      tag = 'parse';
    } else if (typeof httpStatus === 'number') {
      tag = `http ${httpStatus}`;
    }

    return { success: false, status: 503, error: `${userMessage} [${tag}]` };
  }
}
