import axios from 'axios';

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

async function callClaude(systemPrompt: string, messages: ClaudeMessage[]): Promise<string> {
  const apiKey = getAnthropicApiKey();

  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
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
  const fencedMatch = rawText.match(/```json\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
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
  const output = await callClaude(
    'You are a food spoilage expert. Analyze this fridge inventory and predict spoilage risk for each item. Return JSON only as an array of objects with keys: item_id, risk_level (low|medium|high), days_until_expiry, spoilage_probability_percent (0-100), confidence_score (0-1), reasoning.',
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

export type RecipeSuggestionResult = {
  recipe_name: string;
  description: string;
  ingredients: string[];
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
  dietaryRestrictions: string[];
}): Promise<RecipeSuggestionResult[]> {
  const output = await callClaude(
    'You are a creative chef helping reduce food waste. Suggest 2-3 recipes using the provided ingredients (prioritize items expiring soon). Return JSON array with recipe_name, description, ingredients (list), instructions (list), difficulty (easy|medium|hard), prep_time_minutes, and reasoning.',
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
  );

  const jsonText = extractJsonFromText(output);
  const parsed = JSON.parse(jsonText) as RecipeSuggestionResult[];

  if (!Array.isArray(parsed)) {
    throw new Error('Claude recipes response was not an array');
  }

  return parsed.map((recipe) => ({
    recipe_name: recipe.recipe_name,
    description: recipe.description,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    difficulty: recipe.difficulty,
    prep_time_minutes: Math.max(1, Math.floor(recipe.prep_time_minutes)),
    reasoning: recipe.reasoning,
  }));
}
