import { api } from './api';
import type {
  Product,
  ProductWithDetails,
  ProductCreate,
  ProductUpdate,
  ProductType,
} from '../types';

export const productsApi = {
  // List products/services
  list: async (params?: {
    product_type?: ProductType;
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<ProductWithDetails[]> => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Get single product
  get: async (id: string): Promise<ProductWithDetails> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Create new product
  create: async (data: ProductCreate): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },

  // Update existing product
  update: async (id: string, data: ProductUpdate): Promise<Product> => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  // Delete product (soft delete)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },

  // Activate product
  activate: async (id: string): Promise<Product> => {
    const response = await api.post(`/products/${id}/activate`);
    return response.data;
  },

  // Update stock quantity
  updateStock: async (id: string, quantity: number): Promise<Product> => {
    const response = await api.post(`/products/${id}/update-stock`, null, {
      params: { quantity },
    });
    return response.data;
  },
};
