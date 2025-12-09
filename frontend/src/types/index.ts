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
  accounting_type: AccountingType;
  currency: string;
  fiscal_year_start: string;
  timezone: string;
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

