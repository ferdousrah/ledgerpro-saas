import { api } from './api';
import type {
  ProductCategory,
  ProductCategoryCreate,
  ProductCategoryUpdate,
} from '../types';

export const productCategoriesApi = {
  // List product categories
  list: async (params?: {
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<ProductCategory[]> => {
    const response = await api.get('/product-categories', { params });
    return response.data;
  },

  // Get single product category
  get: async (id: string): Promise<ProductCategory> => {
    const response = await api.get(`/product-categories/${id}`);
    return response.data;
  },

  // Create new product category
  create: async (data: ProductCategoryCreate): Promise<ProductCategory> => {
    const response = await api.post('/product-categories', data);
    return response.data;
  },

  // Update existing product category
  update: async (id: string, data: ProductCategoryUpdate): Promise<ProductCategory> => {
    const response = await api.put(`/product-categories/${id}`, data);
    return response.data;
  },

  // Delete product category (soft delete)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/product-categories/${id}`);
  },

  // Activate product category
  activate: async (id: string): Promise<ProductCategory> => {
    const response = await api.post(`/product-categories/${id}/activate`);
    return response.data;
  },
};
