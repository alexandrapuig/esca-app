import { apiClient } from "./api";
import { ApiResponse, RecipeSuggestion } from "../types";

export type RecipeJob = {
  id: string;
  status: "pending" | "running" | "done" | "failed";
  error: string | null;
  recipe_count: number | null;
  created_at: string;
};

export const recipeService = {
  // Generation runs as a background job: this starts one and returns
  // immediately. Poll getRecipeJob.
  generateRecipes(): Promise<ApiResponse<RecipeJob>> {
    return apiClient.post<RecipeJob>("/api/recipes/generate");
  },

  getRecipeJob(jobId: string): Promise<ApiResponse<RecipeJob>> {
    return apiClient.get<RecipeJob>(`/api/recipes/jobs/${jobId}`);
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
