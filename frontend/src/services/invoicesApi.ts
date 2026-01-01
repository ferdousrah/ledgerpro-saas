import { api } from './api';
import type {
  Invoice,
  InvoiceWithDetails,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceStats,
  InvoicePayment,
  InvoicePaymentWithDetails,
  InvoicePaymentCreate,
  InvoiceStatus,
  RecurringInvoice,
  RecurringInvoiceWithDetails,
  RecurringInvoiceCreate,
  RecurringInvoiceUpdate,
} from '../types';

// ============ Invoice APIs ============

export const invoicesApi = {
  // Get invoice statistics
  getStats: async (): Promise<InvoiceStats> => {
    const response = await api.get('/invoices/stats');
    return response.data;
  },

  // List invoices with optional filters
  list: async (params?: {
    status_filter?: InvoiceStatus;
    customer_id?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
  }): Promise<InvoiceWithDetails[]> => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  // Get single invoice by ID
  get: async (id: string): Promise<InvoiceWithDetails> => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  // Create new invoice
  create: async (data: InvoiceCreate): Promise<Invoice> => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  // Update existing invoice
  update: async (id: string, data: InvoiceUpdate): Promise<Invoice> => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  // Delete invoice
  delete: async (id: string): Promise<void> => {
    await api.delete(`/invoices/${id}`);
  },

  // Send invoice (change status to SENT)
  send: async (id: string): Promise<Invoice> => {
    const response = await api.post(`/invoices/${id}/send`);
    return response.data;
  },

  // Cancel invoice
  cancel: async (id: string): Promise<Invoice> => {
    const response = await api.post(`/invoices/${id}/cancel`);
    return response.data;
  },

  // ============ Invoice Payment APIs ============

  // List payments for an invoice
  listPayments: async (invoiceId: string): Promise<InvoicePaymentWithDetails[]> => {
    const response = await api.get(`/invoices/${invoiceId}/payments`);
    return response.data;
  },

  // Record payment for invoice
  recordPayment: async (invoiceId: string, data: InvoicePaymentCreate): Promise<InvoicePayment> => {
    const response = await api.post(`/invoices/${invoiceId}/payments`, data);
    return response.data;
  },

  // Delete payment
  deletePayment: async (invoiceId: string, paymentId: string): Promise<void> => {
    await api.delete(`/invoices/${invoiceId}/payments/${paymentId}`);
  },
};

// ============ Recurring Invoice APIs ============

export const recurringInvoicesApi = {
  // List recurring invoice templates
  list: async (params?: {
    is_active?: boolean;
    customer_id?: string;
    skip?: number;
    limit?: number;
  }): Promise<RecurringInvoiceWithDetails[]> => {
    const response = await api.get('/recurring-invoices', { params });
    return response.data;
  },

  // Get single recurring invoice template
  get: async (id: string): Promise<RecurringInvoiceWithDetails> => {
    const response = await api.get(`/recurring-invoices/${id}`);
    return response.data;
  },

  // Create new recurring invoice template
  create: async (data: RecurringInvoiceCreate): Promise<RecurringInvoice> => {
    const response = await api.post('/recurring-invoices', data);
    return response.data;
  },

  // Update existing recurring invoice template
  update: async (id: string, data: RecurringInvoiceUpdate): Promise<RecurringInvoice> => {
    const response = await api.put(`/recurring-invoices/${id}`, data);
    return response.data;
  },

  // Delete recurring invoice template
  delete: async (id: string): Promise<void> => {
    await api.delete(`/recurring-invoices/${id}`);
  },

  // Pause recurring invoice
  pause: async (id: string): Promise<RecurringInvoice> => {
    const response = await api.post(`/recurring-invoices/${id}/pause`);
    return response.data;
  },

  // Resume recurring invoice
  resume: async (id: string, newNextDate?: string): Promise<RecurringInvoice> => {
    const response = await api.post(`/recurring-invoices/${id}/resume`, {
      new_next_date: newNextDate,
    });
    return response.data;
  },

  // Manually generate invoice from template
  generateNow: async (id: string): Promise<Invoice> => {
    const response = await api.post(`/recurring-invoices/${id}/generate`);
    return response.data;
  },
};
