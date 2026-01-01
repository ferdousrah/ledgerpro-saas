// Authentication Types
export enum AccountingType {
  SINGLE = 'single',
  DOUBLE = 'double',
}

export enum SubscriptionPlan {
  // Single Entry
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  // Double Entry
  STARTER = 'starter',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface User {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'viewer';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface Tenant {
  id: string;
  company_name: string;
  email: string;
  phone?: string;
  address?: string;
  accounting_type: AccountingType;
  currency: string;
  fiscal_year_start: string;
  timezone: string;
  date_format: string;
  logo_url?: string;
  pdf_top_margin: number;  // Space for company letterhead (mm)
  pdf_bottom_margin: number;  // Space for footer (mm)
  default_tax_rate: number;  // Default tax rate percentage (0-100)
  tax_label: string;  // Tax label: Tax, VAT, or GST
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  amount: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  // Step 1
  accounting_type: AccountingType;
  // Step 2
  company_name: string;
  company_email: string;
  phone?: string;
  // Step 3
  admin_name: string;
  admin_email: string;
  password: string;
  // Step 4
  currency: string;
  fiscal_year_start: string;
  timezone: string;
  // Step 5
  plan: SubscriptionPlan;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  tenant: Tenant;
}

// ============ Single Entry Types ============

export enum AccountType {
  CASH = 'cash',
  BANK = 'bank',
  MOBILE_MONEY = 'mobile_money',
  OTHER = 'other',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export interface MoneyAccount {
  id: string;
  tenant_id: string;
  name: string;
  account_type: AccountType;
  account_number?: string;
  bank_name?: string;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MoneyAccountCreate {
  name: string;
  account_type: AccountType;
  account_number?: string;
  bank_name?: string;
  opening_balance?: number;
  description?: string;
  is_active?: boolean;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  transaction_type: TransactionType;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryCreate {
  name: string;
  transaction_type: TransactionType;
  description?: string;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  account_id: string;
  category_id?: string;
  partner_id?: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  description?: string;
  reference_number?: string;
  attachment_url?: string;
  is_recurring: boolean;
  recurring_transaction_id?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface TransactionCreate {
  account_id: string;
  category_id?: string;
  partner_id?: string;
  transaction_type: TransactionType;
  amount: number;
  transaction_date: string;
  description?: string;
  reference_number?: string;
  attachment_url?: string;
}

export interface DashboardStats {
  total_income: number;
  total_expense: number;
  net_balance: number;
  active_accounts: number;
  total_transactions: number;
}

export interface TaxRate {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  description?: string;
  applies_to_income: boolean;
  applies_to_expense: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxRateCreate {
  name: string;
  rate: number;
  description?: string;
  applies_to_income?: boolean;
  applies_to_expense?: boolean;
  is_active?: boolean;
}

// ============ Partner Types ============

export enum PartnerCategory {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  EMPLOYEE = 'employee',
  OTHER = 'other',
}

export interface Partner {
  id: string;
  tenant_id: string;
  name: string;
  category: 'customer' | 'vendor' | 'employee' | 'other';

  // Company/Vendor/Customer fields
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  registration_number?: string;

  // Contact person (for companies)
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_mobile?: string;

  // Employee-specific fields
  employee_id?: string;
  designation?: string;
  department?: string;

  // Employee Personal Details
  nationality?: string;
  date_of_birth?: string;
  nid_passport_no?: string;
  blood_group?: string;
  photo_url?: string;

  // Employee Address Details
  present_address?: string;
  permanent_address?: string;

  // Employee Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;

  // Employee Employment Details
  employment_type?: string;
  joining_date?: string;
  end_date?: string;

  // Common fields
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerCreate {
  name: string;
  category: 'customer' | 'vendor' | 'employee' | 'other';

  // Company/Vendor/Customer fields
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  registration_number?: string;

  // Contact person (for companies)
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_mobile?: string;

  // Employee-specific fields
  employee_id?: string;
  designation?: string;
  department?: string;

  // Employee Personal Details
  nationality?: string;
  date_of_birth?: string;
  nid_passport_no?: string;
  blood_group?: string;
  photo_url?: string;

  // Employee Address Details
  present_address?: string;
  permanent_address?: string;

  // Employee Emergency Contact
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;

  // Employee Employment Details
  employment_type?: string;
  joining_date?: string;
  end_date?: string;

  // Common fields
  description?: string;
  is_active?: boolean;
}

// ============ Financial Year Types ============

export enum FinancialYearStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export interface FinancialYear {
  id: string;
  tenant_id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  status: FinancialYearStatus;
  is_current: boolean;
  closed_at?: string;
  closed_by?: string;
  has_uncategorized_transactions: boolean;
  total_transactions_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface FinancialYearCreate {
  year_name: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

export interface FinancialYearUpdate {
  year_name?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
}

export interface FinancialYearWithStats extends FinancialYear {
  total_income: number;
  total_expense: number;
  net_balance: number;
  active_accounts_count: number;
}

export interface AccountYearBalance {
  id: string;
  financial_year_id: string;
  account_id: string;
  account_name: string;
  opening_balance: number;
  closing_balance: number;
  total_income: number;
  total_expense: number;
  transaction_count: number;
  is_final: boolean;
  last_recalculated_at?: string;
  recalculation_count: number;
}

export interface YearClosingRequest {
  validate_categories?: boolean;
  create_next_year?: boolean;
}

export interface YearClosingValidation {
  can_close: boolean;
  uncategorized_transactions: number;
  total_transactions: number;
  accounts_summary: Array<{
    account_id: string;
    account_name: string;
    opening_balance: number;
    closing_balance: number;
    total_income: number;
    total_expense: number;
    transaction_count: number;
  }>;
  warnings: string[];
  errors: string[];
}

export interface YearClosingResponse {
  success: boolean;
  message: string;
  financial_year_id: string;
  closed_at: string;
  next_year_id?: string;
  balance_snapshots_created: number;
}

export interface RecalculationResult {
  success: boolean;
  affected_years: string[];
  affected_accounts: string[];
  recalculated_balances: number;
  execution_time_ms: number;
  warnings: string[];
}

// ============ Financial Reports Types ============

export interface CashFlowStatementItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface CashFlowStatement {
  financial_year_id: string;
  year_name: string;
  period_start: string;
  period_end: string;
  opening_cash_balance: number;
  cash_inflows: CashFlowStatementItem[];
  cash_outflows: CashFlowStatementItem[];
  total_inflows: number;
  total_outflows: number;
  net_cash_flow: number;
  closing_cash_balance: number;
  account_balances: AccountYearBalance[];
}

export interface TrialBalanceItem {
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
}

export interface TrialBalance {
  financial_year_id: string;
  year_name: string;
  as_of_date: string;
  accounts: TrialBalanceItem[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

export interface IncomeStatementItem {
  category_name: string;
  amount: number;
  percentage: number;
}

export interface IncomeStatement {
  financial_year_id: string;
  year_name: string;
  period_start: string;
  period_end: string;
  income_items: IncomeStatementItem[];
  expense_items: IncomeStatementItem[];
  total_income: number;
  total_expense: number;
  net_profit_loss: number;
  profit_margin_percentage: number;
}

export interface BalanceSheetSection {
  account_name: string;
  amount: number;
}

export interface BalanceSheet {
  financial_year_id: string;
  year_name: string;
  as_of_date: string;
  assets: BalanceSheetSection[];
  total_assets: number;
  retained_earnings: number;
  current_period_profit_loss: number;
  total_equity: number;
}

// ============ Invoice and Billing Types ============

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum PaymentTerms {
  DUE_ON_RECEIPT = 'due_on_receipt',
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_60 = 'net_60',
  NET_90 = 'net_90',
  CUSTOM = 'custom',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  MOBILE_MONEY = 'mobile_money',
  OTHER = 'other',
}

export interface InvoiceLineItem {
  id: string;
  tenant_id: string;
  invoice_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_rate_percentage?: number;
  tax_amount: number;
  line_total: number;
  category_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItemWithDetails extends InvoiceLineItem {
  category_name?: string;
}

export interface InvoiceLineItemCreate {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  category_id?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  customer_id: string;
  invoice_date: string;
  due_date: string;
  payment_terms: PaymentTerms;
  custom_payment_terms_days?: number;
  status: InvoiceStatus;
  subtotal: number;
  discount_amount: number;
  total_tax: number;
  total_amount: number;
  total_paid: number;
  balance_due: number;
  notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  reference_number?: string;
  fiscal_year_id?: string;
  recurring_invoice_id?: string;
  pdf_url?: string;
  last_pdf_generated_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  sent_at?: string;
  sent_by?: string;
}

export interface InvoiceWithDetails extends Invoice {
  customer_name?: string;
  customer_email?: string;
  customer_address?: string;
  line_items: InvoiceLineItemWithDetails[];
  payments_count: number;
}

export interface InvoiceCreate {
  customer_id: string;
  invoice_date: string;
  payment_terms: PaymentTerms;
  custom_payment_terms_days?: number;
  discount_amount?: number;
  notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  reference_number?: string;
  line_items: InvoiceLineItemCreate[];
}

export interface InvoiceUpdate {
  customer_id?: string;
  invoice_date?: string;
  payment_terms?: PaymentTerms;
  custom_payment_terms_days?: number;
  discount_amount?: number;
  notes?: string;
  terms_and_conditions?: string;
  footer_text?: string;
  reference_number?: string;
  line_items?: InvoiceLineItemCreate[];
}

export interface InvoiceStats {
  total_invoices: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  overdue_count: number;
  total_outstanding: number;
  total_paid_this_month: number;
}

export interface InvoicePayment {
  id: string;
  tenant_id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_id?: string;
  account_id: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export interface InvoicePaymentWithDetails extends InvoicePayment {
  account_name?: string;
  invoice_number?: string;
}

export interface InvoicePaymentCreate {
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  account_id: string;
  reference_number?: string;
  notes?: string;
}

export interface RecurringInvoiceLineItem {
  id: string;
  tenant_id: string;
  recurring_invoice_id: string;
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  category_id?: string;
  created_at: string;
}

export interface RecurringInvoiceLineItemCreate {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  category_id?: string;
}

export interface RecurringInvoice {
  id: string;
  tenant_id: string;
  template_name: string;
  customer_id: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string;
  next_invoice_date: string;
  last_generated_date?: string;
  payment_terms: PaymentTerms;
  notes?: string;
  terms_and_conditions?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface RecurringInvoiceWithDetails extends RecurringInvoice {
  customer_name?: string;
  line_items: RecurringInvoiceLineItem[];
  generated_invoices_count: number;
}

export interface RecurringInvoiceCreate {
  template_name: string;
  customer_id: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string;
  payment_terms: PaymentTerms;
  notes?: string;
  terms_and_conditions?: string;
  is_active?: boolean;
  line_items: RecurringInvoiceLineItemCreate[];
}

export interface RecurringInvoiceUpdate {
  template_name?: string;
  customer_id?: string;
  frequency?: RecurrenceFrequency;
  start_date?: string;
  end_date?: string;
  payment_terms?: PaymentTerms;
  notes?: string;
  terms_and_conditions?: string;
  is_active?: boolean;
  line_items?: RecurringInvoiceLineItemCreate[];
}

// ============ Products/Services ============

export type ProductType = 'product' | 'service';

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  product_type: ProductType;
  description?: string;
  sku?: string;
  unit_price: number;
  cost_price?: number;
  tax_rate_id?: string;
  category_id?: string;
  product_category_id?: string;
  track_inventory: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ProductWithDetails extends Product {
  tax_rate_name?: string;
  tax_rate_percentage?: number;
  category_name?: string;
  product_category_name?: string;
  product_category_color?: string;
}

export interface ProductCreate {
  name: string;
  product_type: ProductType;
  description?: string;
  sku?: string;
  unit_price: number;
  cost_price?: number;
  tax_rate_id?: string;
  category_id?: string;
  product_category_id?: string;
  track_inventory?: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
}

export interface ProductUpdate {
  name?: string;
  product_type?: ProductType;
  description?: string;
  sku?: string;
  unit_price?: number;
  cost_price?: number;
  tax_rate_id?: string;
  category_id?: string;
  product_category_id?: string;
  track_inventory?: boolean;
  stock_quantity?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
}

// ============ Product Categories ============

export interface ProductCategory {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  color?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryCreate {
  name: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface ProductCategoryUpdate {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

// ============ Inventory Management ============

export interface Warehouse {
  id: string;
  tenant_id: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseCreate {
  name: string;
  code?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface WarehouseUpdate {
  name?: string;
  code?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export type MovementType = 'stock_in' | 'stock_out' | 'adjustment' | 'transfer';

export interface StockMovement {
  id: string;
  tenant_id: string;
  movement_type: MovementType;
  movement_date: string;
  product_id: string;
  warehouse_id: string;
  to_warehouse_id?: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_type?: string;
  reference_id?: string;
  reference_number?: string;
  notes?: string;
  reason?: string;
  created_by?: string;
  created_at: string;
}

export interface StockMovementWithDetails extends StockMovement {
  product_name?: string;
  product_sku?: string;
  warehouse_name?: string;
  to_warehouse_name?: string;
}

export interface StockAdjustmentRequest {
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reason: string;
  notes?: string;
  movement_date?: string;
}

export interface StockTransferRequest {
  product_id: string;
  from_warehouse_id: string;
  to_warehouse_id: string;
  quantity: number;
  notes?: string;
  movement_date?: string;
}

export interface StockLevel {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  warehouse_id: string;
  warehouse_name?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  updated_at: string;
}

