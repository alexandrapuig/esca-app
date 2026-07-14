import { apiClient } from "./api";
import { ApiResponse, BarcodeProduct } from "../types";

export const barcodeService = {
  identifyProduct(barcode: string, image?: string): Promise<ApiResponse<BarcodeProduct>> {
    return apiClient.post<BarcodeProduct>("/api/barcode/identify", { barcode, image });
  }
};
