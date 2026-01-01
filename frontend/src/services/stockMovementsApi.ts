import { api } from './api';
import type {
  StockMovement,
  StockMovementWithDetails,
  StockAdjustmentRequest,
  StockTransferRequest,
  StockLevel,
  MovementType,
} from '../types';

export const stockMovementsApi = {
  // List stock movements
  list: async (params?: {
    product_id?: string;
    warehouse_id?: string;
    movement_type?: MovementType;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<StockMovementWithDetails[]> => {
    const response = await api.get('/stock-movements', { params });
    return response.data;
  },

  // Create stock adjustment
  createAdjustment: async (data: StockAdjustmentRequest): Promise<StockMovement> => {
    const response = await api.post('/stock-movements/adjustment', data);
    return response.data;
  },

  // Create stock transfer
  createTransfer: async (data: StockTransferRequest): Promise<StockMovement> => {
    const response = await api.post('/stock-movements/transfer', data);
    return response.data;
  },

  // Get current stock levels
  getStockLevels: async (params?: {
    product_id?: string;
    warehouse_id?: string;
  }): Promise<StockLevel[]> => {
    const response = await api.get('/stock-movements/stock-levels', { params });
    return response.data;
  },
};
