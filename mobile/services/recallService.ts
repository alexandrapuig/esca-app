import { apiClient } from "./api";
import { ApiResponse, RecallMatch, ResolveRecallResult } from "../types";

export const recallService = {
  getMatches(): Promise<ApiResponse<RecallMatch[]>> {
    return apiClient.get<RecallMatch[]>("/api/recalls/matches");
  },

  resolveMatch(matchId: string, deleteItem: boolean): Promise<ApiResponse<ResolveRecallResult>> {
    return apiClient.post<ResolveRecallResult>(`/api/recalls/matches/${matchId}/resolve`, {
      deleteItem,
    });
  },
};