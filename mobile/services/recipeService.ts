import { apiClient } from "./api";
import { ApiResponse, RecipeSuggestion } from "../types";

export const recipeService = {
  generateRecipes(): Promise<ApiResponse<RecipeSuggestion[]>> {
    return apiClient.post<RecipeSuggestion[]>("/api/recipes/generate");
  },

  getRecipes(): Promise<ApiResponse<RecipeSuggestion[]>> {
    return apiClient.get<RecipeSuggestion[]>("/api/recipes");
  },

  saveRecipe(id: string): Promise<ApiResponse<RecipeSuggestion>> {
    return apiClient.put<RecipeSuggestion>(`/api/recipes/${id}`, { user_saved: true });
  },

  markCooked(id: string): Promise<ApiResponse<RecipeSuggestion>> {
    return apiClient.put<RecipeSuggestion>(`/api/recipes/${id}`, { user_cooked: true });
  }
};
