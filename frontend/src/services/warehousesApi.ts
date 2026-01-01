import { api } from './api';
import type {
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,
} from '../types';

export const warehousesApi = {
  // List warehouses
  list: async (params?: {
    is_active?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Warehouse[]> => {
    const response = await api.get('/warehouses', { params });
    return response.data;
  },

  // Get single warehouse
  get: async (id: string): Promise<Warehouse> => {
    const response = await api.get(`/warehouses/${id}`);
    return response.data;
  },

  // Create new warehouse
  create: async (data: WarehouseCreate): Promise<Warehouse> => {
    const response = await api.post('/warehouses', data);
    return response.data;
  },

  // Update existing warehouse
  update: async (id: string, data: WarehouseUpdate): Promise<Warehouse> => {
    const response = await api.put(`/warehouses/${id}`, data);
    return response.data;
  },

  // Delete warehouse (soft delete)
  delete: async (id: string): Promise<void> => {
    await api.delete(`/warehouses/${id}`);
  },

  // Activate warehouse
  activate: async (id: string): Promise<Warehouse> => {
    const response = await api.post(`/warehouses/${id}/activate`);
    return response.data;
  },
};
