/**
 * API service for Financial Years endpoints
 */
import { api } from './api';
import type {
  FinancialYear,
  FinancialYearCreate,
  FinancialYearUpdate,
  FinancialYearWithStats,
  AccountYearBalance,
  YearClosingRequest,
  YearClosingValidation,
  YearClosingResponse,
  RecalculationResult,
} from '../types';

export const fiscalYearsApi = {
  // ============ CRUD Operations ============

  list: async (): Promise<FinancialYear[]> => {
    const response = await api.get('/fiscal-years/');
    return response.data;
  },

  getCurrent: async (): Promise<FinancialYear> => {
    const response = await api.get('/fiscal-years/current');
    return response.data;
  },

  get: async (id: string): Promise<FinancialYearWithStats> => {
    // Add timestamp to force fresh data and bypass all caching
    const timestamp = new Date().getTime();
    const response = await api.get(`/fiscal-years/${id}?_t=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return response.data;
  },

  create: async (data: FinancialYearCreate): Promise<FinancialYear> => {
    const response = await api.post('/fiscal-years/', data);
    return response.data;
  },

  update: async (id: string, data: FinancialYearUpdate): Promise<FinancialYear> => {
    const response = await api.put(`/fiscal-years/${id}`, data);
    return response.data;
  },

  setCurrent: async (id: string): Promise<FinancialYear> => {
    const response = await api.put(`/fiscal-years/${id}/set-current`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/fiscal-years/${id}`);
  },

  // ============ Year Closing Operations ============

  validateClosing: async (id: string): Promise<YearClosingValidation> => {
    const response = await api.post(`/fiscal-years/${id}/validate-closing`);
    return response.data;
  },

  close: async (id: string, request: YearClosingRequest): Promise<YearClosingResponse> => {
    const response = await api.post(`/fiscal-years/${id}/close`, request);
    return response.data;
  },

  recalculate: async (id: string): Promise<RecalculationResult> => {
    const response = await api.post(`/fiscal-years/${id}/recalculate`);
    return response.data;
  },

  // ============ Balance Queries ============

  getBalances: async (id: string): Promise<AccountYearBalance[]> => {
    const response = await api.get(`/fiscal-years/${id}/balances`);
    return response.data;
  },
};
