export interface User {
  id: string;
  email: string;
  created_at: string;
  dietary_restrictions?: string[];
  notification_preferences?: Record<string, boolean>;
}

export interface FridgeItem {
  id: string;
  user_id: string;
  barcode?: string;
  name: string;
  category: string;
  purchase_date?: string;
  estimated_expiry: string;
  quantity: number;
  unit: string;
  status: "active" | "consumed" | "expired";
  storage_location?: "fridge" | "pantry";
  created_at?: string;
  updated_at?: string;
}

export interface SpoilagePrediction {
  id: string;
  user_id: string;
  item_id: string;
  risk_level: "low" | "medium" | "high";
  days_until_expiry: number;
  reasoning: string;
  confidence_score: number;
}

export interface RecipeSuggestion {
  id: string;
  user_id: string;
  recipe_name: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  difficulty: "easy" | "medium" | "hard";
  prep_time_minutes: number;
  user_saved: boolean;
  user_cooked: boolean;
}

export interface BarcodeProduct {
  name: string;
  category: string;
  typical_shelf_life_days: number;
}

export interface UserStats {
  items_consumed_count: number;
  waste_prevented_kg: number;
  co2_saved_kg: number;
  money_saved: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
