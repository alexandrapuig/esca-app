import { getSupabaseClient } from './supabase';

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: string;
};

type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type FridgeItem = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  quantity: number | null;
  unit: string | null;
  typicalShelfLifeDays: number | null;
  purchaseDate: string;
  estimatedExpiry: string | null;
  status: 'fresh' | 'consumed' | 'expired';
  createdAt: string;
};

export type BarcodeIdentification = {
  name: string;
  category: string;
  typical_shelf_life_days: number;
};

export type SpoilagePrediction = {
  item_id: string;
  risk_level: 'low' | 'medium' | 'high';
  days_until_expiry: number;
  spoilage_probability_percent: number;
  confidence_score: number;
  reasoning: string;
};

export type RecipeSuggestion = {
  id: string;
  recipe_name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time_minutes: number;
  reasoning: string;
  saved: boolean;
  cooked: boolean;
  created_at: string;
};

function getBackendUrl(): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (backendUrl) {
    return backendUrl;
  }

  return 'http://localhost:3001';
}

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

async function apiRequest<T>(path: string, options: RequestInit): Promise<ApiResult<T>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      success: false,
      error: 'You must be signed in to manage inventory',
    };
  }

  const response = await fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  const payload = (await response.json()) as { success: boolean; data?: T; error?: string };

  if (!response.ok || !payload.success || !payload.data) {
    return {
      success: false,
      error: payload.error ?? 'Request failed',
    };
  }

  return {
    success: true,
    data: payload.data,
  };
}

export async function getFridgeItems(status?: string): Promise<ApiResult<FridgeItem[]>> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return apiRequest<FridgeItem[]>(`/api/fridge/items${query}`, { method: 'GET' });
}

export async function addFridgeItem(input: {
  name: string;
  category: string;
  quantity?: number;
  unit?: string;
  typical_shelf_life_days?: number;
}): Promise<ApiResult<FridgeItem>> {
  return apiRequest<FridgeItem>('/api/fridge/items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateFridgeItemStatus(
  id: string,
  status: 'fresh' | 'consumed' | 'expired',
): Promise<ApiResult<FridgeItem>> {
  return apiRequest<FridgeItem>(`/api/fridge/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function deleteFridgeItem(id: string): Promise<ApiResult<{ deleted: true }>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return {
      success: false,
      error: 'You must be signed in to manage inventory',
    };
  }

  const response = await fetch(`${getBackendUrl()}/api/fridge/items/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const payload = (await response.json()) as { success: boolean; error?: string };

  if (!response.ok || !payload.success) {
    return {
      success: false,
      error: payload.error ?? 'Request failed',
    };
  }

  return {
    success: true,
    data: { deleted: true },
  };
}

export async function identifyBarcode(input: {
  barcode: string;
  barcodeImage?: string;
}): Promise<ApiResult<BarcodeIdentification>> {
  return apiRequest<BarcodeIdentification>('/api/barcode/identify', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function generatePredictions(): Promise<ApiResult<SpoilagePrediction[]>> {
  return apiRequest<SpoilagePrediction[]>('/api/predictions/generate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getLatestPredictions(): Promise<ApiResult<SpoilagePrediction[]>> {
  return apiRequest<SpoilagePrediction[]>('/api/predictions/latest', {
    method: 'GET',
  });
}

export async function generateRecipes(): Promise<ApiResult<RecipeSuggestion[]>> {
  return apiRequest<RecipeSuggestion[]>('/api/recipes/generate', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getRecipes(): Promise<ApiResult<RecipeSuggestion[]>> {
  return apiRequest<RecipeSuggestion[]>('/api/recipes', {
    method: 'GET',
  });
}

export async function updateRecipe(recipeId: string, input: { saved?: boolean; cooked?: boolean }): Promise<ApiResult<RecipeSuggestion>> {
  return apiRequest<RecipeSuggestion>(`/api/recipes/${recipeId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
