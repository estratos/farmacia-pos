import { api } from './api'
import type { Product, ApiResponse } from '../types'

export const productService = {
  async searchProducts(query: string): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>(`/api/products?search=${query}`)
    return response.data.data
  },

  async getProductByBarcode(barcode: string): Promise<Product> {
    const response = await api.get<ApiResponse<Product>>(`/api/products/barcode/${barcode}`)
    return response.data.data
  },

  async getControlledMedications(): Promise<Product[]> {
    const response = await api.get<ApiResponse<Product[]>>('/api/products/controlled')
    return response.data.data
  }
}