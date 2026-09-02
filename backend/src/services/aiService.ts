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
      timeout: 30000,
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
}): Promise<{ name: string; category: string; typical_shelf_life_days: number }> {
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
    'You identify food products from barcodes. Return strict JSON only with keys: name, category, typical_shelf_life_days. category should be one of produce,dairy,meat,seafood,bakery,frozen,pantry,beverage,other. typical_shelf_life_days must be an integer.',
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
  };

  if (!parsed.name || !parsed.category || typeof parsed.typical_shelf_life_days !== 'number') {
    throw new Error('Claude barcode response was missing required fields');
  }

  return {
    name: parsed.name,
    category: parsed.category,
    typical_shelf_life_days: Math.max(1, Math.floor(parsed.typical_shelf_life_days)),
  };
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
  dietaryRestrictions: string[];
}): Promise<RecipeSuggestionResult[]> {
  const output = await callClaude(
    `You are a creative chef helping reduce food waste. Suggest 2-3 recipes built mainly from the user's inventory, prioritizing the at-risk items. Return JSON array with name, description, cuisine, dietary_tags (list), ingredients (list of plain strings), ingredient_details (list), instructions (list), difficulty (easy|medium|hard), prep_time_minutes, and reasoning.

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

  return parsed.map((recipe) => ({
    name: recipe.name,
    description: recipe.description,
    cuisine: typeof recipe.cuisine === 'string' ? recipe.cuisine.trim().toLowerCase() : 'other',
    dietary_tags: normalizeDietaryTags(recipe.dietary_tags),
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    ingredient_details: Array.isArray(recipe.ingredient_details)
      ? recipe.ingredient_details
          .filter((detail): detail is RecipeIngredientDetail =>
            Boolean(detail) && typeof detail.text === 'string' && allowedStatuses.includes(detail.status),
          )
          .map((detail) => ({
            text: detail.text,
            status: detail.status,
            ...(detail.status === 'partial' && typeof detail.note === 'string' ? { note: detail.note } : {}),
          }))
      : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    difficulty: recipe.difficulty,
    prep_time_minutes: Math.max(1, Math.floor(recipe.prep_time_minutes)),
    reasoning: recipe.reasoning,
  }));
}
