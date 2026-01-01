/**
 * API service for Financial Reports endpoints
 */
import { api } from './api';
import type {
  CashFlowStatement,
  TrialBalance,
  IncomeStatement,
  BalanceSheet,
} from '../types';

export const reportsApi = {
  // ============ Financial Reports ============

  getCashFlowStatement: async (yearId: string): Promise<CashFlowStatement> => {
    const response = await api.get(`/reports/cash-flow/${yearId}`);
    return response.data;
  },

  getTrialBalance: async (yearId: string): Promise<TrialBalance> => {
    const response = await api.get(`/reports/trial-balance/${yearId}`);
    return response.data;
  },

  getIncomeStatement: async (yearId: string): Promise<IncomeStatement> => {
    const response = await api.get(`/reports/income-statement/${yearId}`);
    return response.data;
  },

  getBalanceSheet: async (yearId: string): Promise<BalanceSheet> => {
    const response = await api.get(`/reports/balance-sheet/${yearId}`);
    return response.data;
  },
};
