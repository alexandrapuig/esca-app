import AsyncStorage from "@react-native-async-storage/async-storage";
import { FridgeItem, RecipeSuggestion, SpoilagePrediction } from "../types";

const KEYS = {
  fridgeItems: "fridge_items",
  predictions: "predictions",
  recipes: "recipes",
  lastSyncTime: "last_sync_time"
};

const readJson = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = async <T>(key: string, value: T): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const storageService = {
  async initialize(): Promise<void> {
    const existingSync = await AsyncStorage.getItem(KEYS.lastSyncTime);
    if (!existingSync) {
      await AsyncStorage.setItem(KEYS.lastSyncTime, new Date(0).toISOString());
    }
  },

  saveFridgeItems(items: FridgeItem[]): Promise<void> {
    return writeJson(KEYS.fridgeItems, items);
  },

  async getFridgeItems(): Promise<FridgeItem[]> {
    return (await readJson<FridgeItem[]>(KEYS.fridgeItems)) || [];
  },

  savePredictions(predictions: SpoilagePrediction[]): Promise<void> {
    return writeJson(KEYS.predictions, predictions);
  },

  async getPredictions(): Promise<SpoilagePrediction[]> {
    return (await readJson<SpoilagePrediction[]>(KEYS.predictions)) || [];
  },

  saveRecipes(recipes: RecipeSuggestion[]): Promise<void> {
    return writeJson(KEYS.recipes, recipes);
  },

  async getRecipes(): Promise<RecipeSuggestion[]> {
    return (await readJson<RecipeSuggestion[]>(KEYS.recipes)) || [];
  },

  setLastSyncTime(): Promise<void> {
    return AsyncStorage.setItem(KEYS.lastSyncTime, new Date().toISOString());
  },

  async getLastSyncTime(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.lastSyncTime);
  },

  async isOffline(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      await fetch("https://www.google.com/generate_204", {
        method: "HEAD",
        signal: controller.signal
      });
      clearTimeout(timeout);
      return false;
    } catch {
      return true;
    }
  }
};
