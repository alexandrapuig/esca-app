import { apiClient } from "./api";
import { ApiResponse, SpoilagePrediction } from "../types";

export const predictionService = {
  generatePredictions(): Promise<ApiResponse<SpoilagePrediction[]>> {
    return apiClient.post<SpoilagePrediction[]>("/api/predictions/generate");
  },

  getLatestPredictions(): Promise<ApiResponse<SpoilagePrediction[]>> {
    return apiClient.get<SpoilagePrediction[]>("/api/predictions/latest");
  }
};
