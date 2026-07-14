import { apiClient } from "./api";
import { ApiResponse, FridgeItem } from "../types";

export const fridgeService = {
  addItem(item: Partial<FridgeItem>): Promise<ApiResponse<FridgeItem>> {
    return apiClient.post<FridgeItem>("/api/fridge/items", item);
  },

  getItems(): Promise<ApiResponse<FridgeItem[]>> {
    return apiClient.get<FridgeItem[]>("/api/fridge/items");
  },

  updateItem(id: string, updates: Partial<FridgeItem>): Promise<ApiResponse<FridgeItem>> {
    return apiClient.put<FridgeItem>(`/api/fridge/items/${id}`, updates);
  },

  deleteItem(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/api/fridge/items/${id}`);
  },

  markConsumed(id: string): Promise<ApiResponse<FridgeItem>> {
    return apiClient.put<FridgeItem>(`/api/fridge/items/${id}`, { status: "consumed" });
  }
};
