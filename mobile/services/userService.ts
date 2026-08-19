import { apiClient } from "./api";
import { ApiResponse, User } from "../types";

export const userService = {
  async getProfile(): Promise<ApiResponse<User>> {
    return apiClient.get<User>("/api/users/profile");
  },

  async updateProfile(updates: { name?: string; dietary_restrictions?: string[] }): Promise<ApiResponse<User>> {
    return apiClient.put<User>("/api/users/profile", updates);
  },
};
