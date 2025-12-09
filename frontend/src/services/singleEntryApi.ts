/**
 * API service for Single Entry accounting endpoints
 */
import { api } from './api';
import type {
  MoneyAccount,
  MoneyAccountCreate,
  Category,
  CategoryCreate,
  Transaction,
  TransactionCreate,
  DashboardStats,
  TaxRate,
  TaxRateCreate,
  Partner,
  PartnerCreate,
} from '../types';
import { TransactionType, AccountType, PartnerCategory } from '../types';

// Re-export all types (workaround for module resolution issues)
export type {
  MoneyAccount,
  MoneyAccountCreate,
  Category,
  CategoryCreate,
  Transaction,
  TransactionCreate,
  DashboardStats,
  TaxRate,
  TaxRateCreate,
  Partner,
  PartnerCreate,
};
// Re-export enums (needed at runtime)
export { TransactionType, AccountType, PartnerCategory };

// ============ Money Accounts API ============

export const accountsApi = {
  list: async (): Promise<MoneyAccount[]> => {
    const response = await api.get('/accounts/');
    return response.data;
  },

  get: async (id: string): Promise<MoneyAccount> => {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  },

  create: async (data: MoneyAccountCreate): Promise<MoneyAccount> => {
    const response = await api.post('/accounts/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<MoneyAccountCreate>): Promise<MoneyAccount> => {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/accounts/${id}`);
  },
};

// ============ Categories API ============

export const categoriesApi = {
  list: async (transactionType?: TransactionType): Promise<Category[]> => {
    const params = transactionType ? { transaction_type: transactionType } : {};
    const response = await api.get('/categories/', { params });
    return response.data;
  },

  get: async (id: string): Promise<Category> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  create: async (data: CategoryCreate): Promise<Category> => {
    const response = await api.post('/categories/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CategoryCreate>): Promise<Category> => {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// ============ Transactions API ============

interface TransactionFilters {
  transaction_type?: TransactionType;
  account_id?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export const transactionsApi = {
  list: async (filters?: TransactionFilters): Promise<Transaction[]> => {
    const response = await api.get('/transactions/', { params: filters });
    return response.data;
  },

  get: async (id: string): Promise<Transaction> => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },

  create: async (data: TransactionCreate): Promise<Transaction> => {
    const response = await api.post('/transactions/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<TransactionCreate>): Promise<Transaction> => {
    const response = await api.put(`/transactions/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/transactions/${id}`);
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/transactions/dashboard-stats');
    return response.data;
  },
};

// ============ Tax Rates API ============

export const taxRatesApi = {
  list: async (): Promise<TaxRate[]> => {
    const response = await api.get('/tax-rates/');
    return response.data;
  },

  get: async (id: string): Promise<TaxRate> => {
    const response = await api.get(`/tax-rates/${id}`);
    return response.data;
  },

  create: async (data: TaxRateCreate): Promise<TaxRate> => {
    const response = await api.post('/tax-rates/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<TaxRateCreate>): Promise<TaxRate> => {
    const response = await api.put(`/tax-rates/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tax-rates/${id}`);
  },
};

// ============ Partners API ============

interface PartnerFilters {
  category?: PartnerCategory;
  is_active?: boolean;
}

export const partnersApi = {
  list: async (filters?: PartnerFilters): Promise<Partner[]> => {
    const response = await api.get('/partners/', { params: filters });
    return response.data;
  },

  get: async (id: string): Promise<Partner> => {
    const response = await api.get(`/partners/${id}`);
    return response.data;
  },

  create: async (data: PartnerCreate): Promise<Partner> => {
    const response = await api.post('/partners/', data);
    return response.data;
  },

  update: async (id: string, data: Partial<PartnerCreate>): Promise<Partner> => {
    const response = await api.put(`/partners/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/partners/${id}`);
  },
};
