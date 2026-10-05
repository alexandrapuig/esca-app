import axios from 'axios';

import { DIETARY_OPTIONS, normalizeDietaryTags } from '../config/dietary';

type ClaudeTextContent = {
  type: 'text';
  text: string;
};

type ClaudeImageContent = {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
};

type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: Array<ClaudeTextContent | ClaudeImageContent>;
};

function getAnthropicApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  return apiKey;
}

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens = 1200,
): Promise<string> {
  const apiKey = getAnthropicApiKey();

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      // Vercel Pro allows 60s per function; stay just under it. Recipe
      // generation runs close to this, which is why it was timing out at 30s.
      timeout: 55000,
    },
  );

  const blocks = response.data?.content as Array<{ type: string; text?: string }> | undefined;
  const firstText = blocks?.find((block) => block.type === 'text')?.text;

  if (!firstText) {
    throw new Error('Claude response did not include text content');
  }

  return firstText;
}

function extractJsonFromText(rawText: string): string {
  // Closed fence.
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  // Unclosed fence: the response was truncated before the closing backticks.
  const openFence = rawText.match(/```(?:json)?\s*([\s\S]*)$/i);

  if (openFence?.[1]) {
    return openFence[1].trim();
  }

  return rawText.trim();
}

export async function identifyBarcodeWithClaude(params: {
  barcode: string;
  barcodeImage?: string;
}): Promise<{ name: string; category: string; typical_shelf_life_days: number } | null> {
  const prompt = `Barcode value: ${params.barcode}\nReturn JSON only.`;

  const messageContent: Array<ClaudeTextContent | ClaudeImageContent> = [
    {
      type: 'text',
      text: `Identify this grocery product. ${prompt}`,
    },
  ];

  if (params.barcodeImage) {
    messageContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: params.barcodeImage,
      },
    });
  }

  const output = await callClaude(
    'You identify food products from barcodes. A barcode number does not encode what a product is, so unless you actually recognise this specific code, or an image clearly shows the product or its label, you cannot know what it is. Guessing a plausible grocery item is worse than admitting you do not know. Return strict JSON only. If you can identify it: {"name": string, "category": one of produce|dairy|meat|seafood|bakery|frozen|pantry|beverage|other, "typical_shelf_life_days": integer}. If you cannot: {"identified": false}. Do not invent a product to fill the response.',
    [
      {
        role: 'user',
        content: messageContent,
      },
    ],
  );

  const jsonText = extractJsonFromText(output);
  const parsed = JSON.parse(jsonText) as {
    name?: string;
    category?: string;
    typical_shelf_life_days?: number;
    identified?: boolean;
  };

  // An explicit decline, or a response missing the fields, both mean the same
  // thing: no identification. Returning null lets the caller leave the form
  // blank rather than filling it with a confident guess.
  if (parsed.identified === false) {
    return null;
  }

  if (!parsed.name || !parsed.category || typeof parsed.typical_shelf_life_days !== 'number') {
    return null;
  }

  return {
    name: parsed.name,
    category: parsed.category,
    typical_shelf_life_days: Math.max(1, Math.floor(parsed.typical_shelf_life_days)),
  };
}

/**
 * Open Food Facts knows what a product is but not how long it keeps. This asks
 * for a shelf life from the product name and category alone, so a real product
 * record does not fall back to a flat per-category default.
 */
export async function estimateShelfLifeWithClaude(params: {
  name: string;
  category: string;
}): Promise<number | null> {
  try {
    const output = await callClaude(
      'You estimate how long an unopened grocery product stays good from its purchase date. Return strict JSON only: {"typical_shelf_life_days": <integer>}. Consider the product type: shelf-stable pantry goods last months to years, fresh produce and dairy days to weeks. Give the unopened shelf life.',
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({ name: params.name, category: params.category }),
            },
          ],
        },
      ],
      200,
    );

    const parsed = JSON.parse(extractJsonFromText(output)) as { typical_shelf_life_days?: number };

    if (typeof parsed.typical_shelf_life_days !== 'number' || !Number.isFinite(parsed.typical_shelf_life_days)) {
      return null;
    }

    return Math.max(1, Math.floor(parsed.typical_shelf_life_days));
  } catch (error) {
    console.error('estimateShelfLifeWithClaude failed', error);
    return null;
  }
}

export type SpoilagePredictionResult = {
  item_id: string;
  risk_level: 'low' | 'medium' | 'high';
  days_until_expiry: number;
  spoilage_probability_percent: number;
  confidence_score: number;
  reasoning: string;
};

export async function generateSpoilagePredictionsWithClaude(inventory: {
  id: string;
  name: string;
  category: string | null;
  estimated_expiry: string | null;
  quantity: number | null;
  unit: string | null;
}[]): Promise<SpoilagePredictionResult[]> {
  const today = new Date().toISOString().slice(0, 10);

  const output = await callClaude(
    `Today's date is ${today}. You are a food spoilage expert. Analyze this fridge inventory and predict spoilage risk for each item. Every estimated_expiry you are given is correct - never treat a date as a data error, and never override it with your own shelf-life assumption. Judge risk by how close estimated_expiry is to today. Return JSON only as an array of objects with keys: item_id, risk_level (low|medium|high), days_until_expiry, spoilage_probability_percent (0-100), confidence_score (0-1), reasoning.`,
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: JSON.stringify(inventory),
          },
        ],
      },
    ],
  );

  const jsonText = extractJsonFromText(output);
  const parsed = JSON.parse(jsonText) as SpoilagePredictionResult[];

  if (!Array.isArray(parsed)) {
    throw new Error('Claude spoilage response was not an array');
  }

  return parsed.map((item) => ({
    item_id: item.item_id,
    risk_level: item.risk_level,
    days_until_expiry: Math.max(0, Math.floor(item.days_until_expiry)),
    spoilage_probability_percent: Math.max(0, Math.min(100, Math.floor(item.spoilage_probability_percent))),
    confidence_score: Math.max(0, Math.min(1, Number(item.confidence_score))),
    reasoning: item.reasoning,
  }));
}

export type RecipeIngredientDetail = {
  text: string;
  status: 'owned' | 'partial' | 'missing' | 'staple';
  note?: string;
};

export type RecipeSuggestionResult = {
  name: string;
  description: string;
  cuisine: string;
  dietary_tags: string[];
  ingredients: string[];
  ingredient_details: RecipeIngredientDetail[];
  instructions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time_minutes: number;
  reasoning: string;
};

export async function generateRecipesWithClaude(params: {
  atRiskItems: {
    item_name: string;
    category: string | null;
    risk_level: string;
  }[];
  inventory: {
    item_name: string;
    category: string | null;
    quantity: number | null;
    unit: string | null;
  }[];
  history: {
    name: string;
    cuisine: string;
    difficulty: string;
    cooked: boolean;
  }[];
  dietaryRestrictions: string[];
}): Promise<RecipeSuggestionResult[]> {
  const output = await callClaude(
    `You are a practical home cook helping reduce food waste. Suggest 2 recipes built from the user's inventory. Where at-risk items are supplied, prioritize using them; the at-risk list may be empty, in which case build from the inventory alone. Make the two suggestions differ in effort: at least one should be a quick assembly: no more than 5 ingredients (staples do not count toward this), no more than 4 steps, ready in about 10 minutes, with little or no cooking - things like toast with a topping, a simple salad, or a snack plate. The other can be a proper cooked dish. Simple and genuinely makeable beats elaborate. Return JSON array with name, description, cuisine, dietary_tags (list), ingredient_details (list), instructions (list), difficulty (easy|medium|hard), prep_time_minutes, and reasoning. Do not include a separate ingredients field - ingredient_details is the only ingredient list needed.

ingredient_details must have one entry per ingredient, in the same order as ingredients, each an object with:
  text   - the ingredient as written in ingredients
  status - one of: owned, partial, missing, staple
  note   - ONLY when status is partial, e.g. "recipe needs 200g, you have 100 grams"

Rules for status:
  owned   - the ingredient is in the inventory, in a sufficient amount, or the inventory quantity is unknown
  partial - the ingredient is in the inventory but the recipe clearly needs more than the listed quantity. Only use this when the inventory gives BOTH a quantity and a unit that can be compared. If quantity is null or the units are not comparable, use owned instead.
  missing - not in the inventory at all
  staple  - a basic item most kitchens have and this app does not track: salt, pepper, cooking oil, water, common dried spices

Prefer recipes where most ingredients are owned. Do not mark something missing if a reasonable match exists in the inventory under a different wording.

The user's previously kept recipes are supplied as history. Recipes marked cooked are a stronger signal than saved ones - saving means it looked appealing, cooking means they actually made it. Use history as a hint about cuisine, difficulty and style, NOT as a constraint: do not suggest a dish that is already in the history, and do not narrow to only what they have picked before. What is expiring matters more than what they usually cook. If history is empty, ignore this entirely.

dietary_tags MUST only contain values from this exact list, and only where the recipe genuinely qualifies: ${DIETARY_OPTIONS.join(', ')}. Return an empty array if none apply. Do not invent other tags.`,
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: JSON.stringify(params),
          },
        ],
      },
    ],
    4000,
  );

  const jsonText = extractJsonFromText(output);
  const parsed = JSON.parse(jsonText) as RecipeSuggestionResult[];

  if (!Array.isArray(parsed)) {
    throw new Error('Claude recipes response was not an array');
  }

  const allowedStatuses = ['owned', 'partial', 'missing', 'staple'];

  return parsed.map((recipe) => {
    // ingredient_details is the only ingredient list Claude generates now;
    // ingredients is derived from it here so nothing downstream needs to
    // change, and Claude is not asked to write every ingredient name twice.
    const ingredientDetails: RecipeIngredientDetail[] = Array.isArray(recipe.ingredient_details)
      ? recipe.ingredient_details
          .filter((detail): detail is RecipeIngredientDetail =>
            Boolean(detail) && typeof detail.text === 'string' && allowedStatuses.includes(detail.status),
          )
          .map((detail) => ({
            text: detail.text,
            status: detail.status,
            ...(detail.status === 'partial' && typeof detail.note === 'string' ? { note: detail.note } : {}),
          }))
      : [];

    return {
      name: recipe.name,
      description: recipe.description,
      cuisine: typeof recipe.cuisine === 'string' ? recipe.cuisine.trim().toLowerCase() : 'other',
      dietary_tags: normalizeDietaryTags(recipe.dietary_tags),
      ingredients: ingredientDetails.map((detail) => detail.text),
      ingredient_details: ingredientDetails,
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
      difficulty: recipe.difficulty,
      prep_time_minutes: Math.max(1, Math.floor(recipe.prep_time_minutes)),
      reasoning: recipe.reasoning,
    };
  });
}

const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const IMAGE_SIZE_UNITS = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'fl oz', 'other'];

function normalizeImageSizeUnit(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const raw = value.trim().toLowerCase();

  return IMAGE_SIZE_UNITS.includes(raw) ? raw : null;
}

function normalizePrintedDate(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }

  const parsed = new Date(value.trim() + 'T00:00:00Z');

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const years = (parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365);

  return years > -3 && years < 6 ? value.trim() : null;
}

export type ItemImageReading = {
  name: string | null;
  category: string | null;
  brand: string | null;
  quantity: number | null;
  size: number | null;
  size_unit: string | null;
  price: number | null;
  unit_price: number | null;
  printed_date: string | null;
  printed_date_kind: 'expiry' | 'best_before' | 'use_by' | 'packed' | null;
  typical_shelf_life_days: number | null;
};

export type ItemImageReadingSet = {
  source_kind: 'physical_item' | 'listing';
  items: ItemImageReading[];
};

function readOneItem(raw: Record<string, unknown>): ItemImageReading | null {
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : null;

  // A nameless entry is not an item anyone can act on.
  if (!name) {
    return null;
  }

  const size = typeof raw.size === 'number' && Number.isFinite(raw.size) && raw.size > 0 ? raw.size : null;
  const sizeUnit = normalizeImageSizeUnit(raw.size_unit);
  const quantity =
    typeof raw.quantity === 'number' && Number.isFinite(raw.quantity) && raw.quantity > 0
      ? Math.floor(raw.quantity)
      : null;
  const shelfLife =
    typeof raw.typical_shelf_life_days === 'number' && Number.isFinite(raw.typical_shelf_life_days)
      ? Math.max(1, Math.floor(raw.typical_shelf_life_days))
      : null;
  const price =
    typeof raw.price === 'number' && Number.isFinite(raw.price) && raw.price >= 0
      ? Math.round(raw.price * 100) / 100
      : null;
  const unitPrice =
    typeof raw.unit_price === 'number' && Number.isFinite(raw.unit_price) && raw.unit_price >= 0
      ? Math.round(raw.unit_price * 100) / 100
      : null;
  const dateKind = raw.printed_date_kind;

  return {
    name,
    category: typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim().toLowerCase() : null,
    brand: typeof raw.brand === 'string' && raw.brand.trim() ? raw.brand.trim() : null,
    quantity,
    // A size without a unit is meaningless and a unit without a size is
    // nothing to store, so they stand or fall together.
    size: size !== null && sizeUnit !== null ? size : null,
    size_unit: size !== null && sizeUnit !== null ? sizeUnit : null,
    price,
    unit_price: unitPrice,
    printed_date: normalizePrintedDate(raw.printed_date),
    printed_date_kind:
      dateKind === 'expiry' || dateKind === 'best_before' || dateKind === 'use_by' || dateKind === 'packed'
        ? dateKind
        : null,
    typical_shelf_life_days: shelfLife,
  };
}

export async function identifyItemsFromImageWithClaude(params: {
  image: string;
  mediaType?: string;
}): Promise<ItemImageReadingSet> {
  const mediaType =
    params.mediaType && IMAGE_MEDIA_TYPES.includes(params.mediaType) ? params.mediaType : 'image/jpeg';

  const output = await callClaude(
    'You read grocery items from an image. The image is either a photo of an actual item (its packaging, label, or the food itself) or a screenshot depicting products: a store page, shopping cart, order confirmation, receipt, or advertisement. Report only what is legible. Do not use product knowledge to fill in a size, brand, or date you cannot read - a blurred weight panel means null, not your best guess at the usual size. Return strict JSON only, an object with two keys: source_kind, and items (an array). source_kind is physical_item when the image shows the actual object in front of the camera, or listing when it depicts products rather than being them. A screenshot of a shopping cart is a listing even though it shows real products the user bought. A photo of an actual item has exactly one entry in items, even when several units of it are visible - three identical yogurt pots are one item. A listing has one entry per distinct product line, in the order they appear. Each entry in items is an object with: name (string or null), category (one of produce|dairy|meat|seafood|bakery|frozen|pantry|beverage|other, or null), brand (string or null), quantity (integer or null - how many packages of this product, which a cart line often states explicitly; null when not stated), size (number or null - the amount in ONE package, never a count of packages), size_unit (one of g|kg|ml|l|oz|lb|fl oz|other, or null - fl oz is volume and oz is mass, never substitute one for the other; when a package is counted in pieces or bunches rather than measured, leave size and size_unit null), price (number or null - the total paid for this line as printed, as a plain number without a currency symbol; null on a photo of a physical item, which carries no price), unit_price (number or null - a per-unit price ONLY where one is printed, such as a per-pound rate shown beside the line. Do not divide a line total by a quantity to produce one: report what is printed, never a figure you worked out), printed_date (YYYY-MM-DD or null - only from a date physically printed on the item itself, and only if you can read it in full; if the year is absent or any digit is uncertain, return null), printed_date_kind (one of expiry|best_before|use_by|packed, or null), typical_shelf_life_days (integer or null - this one may be inferred from the product type, as unopened shelf life from purchase). Every field is independently optional: an entry with a legible name and everything else null is useful. Omit an entry entirely only if you cannot read a name for it. If the image shows no food items at all, return {"items": []}.',
    [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify the grocery items in this image. Return JSON only.' },
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: params.image } },
        ],
      },
    ],
    2000,
  );

  const parsed = JSON.parse(extractJsonFromText(output)) as {
    source_kind?: unknown;
    items?: unknown;
  };

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map(readOneItem)
        .filter((entry): entry is ItemImageReading => entry !== null)
    : [];

  return {
    // physical_item is the conservative default: it is the reading that keeps
    // a printed date, and a date is only dropped when we are sure it came
    // from a depiction rather than the object itself.
    source_kind: parsed.source_kind === 'listing' ? 'listing' : 'physical_item',
    items,
  };
}
