-- Migration: Add Invoice and Billing System
-- Date: 2025-12-24
-- Description: Implements comprehensive invoice and billing with line items, payments, and recurring templates
-- Author: System

BEGIN;

-- =====================================================
-- Step 1: Create ENUMS
-- =====================================================

-- Invoice status enum
CREATE TYPE invoice_status AS ENUM (
    'draft',           -- Created but not sent to customer
    'sent',            -- Sent to customer, awaiting payment
    'partially_paid',  -- Some payments received
    'paid',            -- Fully paid
    'overdue',         -- Past due date, not fully paid
    'cancelled'        -- Voided/cancelled
);

COMMENT ON TYPE invoice_status IS 'Status workflow for invoices: draft -> sent -> partially_paid/paid or overdue -> paid';

-- Payment terms enum
CREATE TYPE payment_terms AS ENUM (
    'due_on_receipt',  -- Payment due immediately
    'net_15',          -- Payment due in 15 days
    'net_30',          -- Payment due in 30 days
    'net_60',          -- Payment due in 60 days
    'net_90',          -- Payment due in 90 days
    'custom'           -- Custom number of days
);

COMMENT ON TYPE payment_terms IS 'Payment terms defining when invoice payment is due';

-- Payment method enum
CREATE TYPE payment_method AS ENUM (
    'cash',            -- Cash payment
    'bank_transfer',   -- Bank/wire transfer
    'check',           -- Check payment
    'credit_card',     -- Credit card
    'mobile_money',    -- Mobile money (bKash, etc.)
    'other'            -- Other payment method
);

COMMENT ON TYPE payment_method IS 'Method used for invoice payment';

-- Recurrence frequency enum (for recurring invoices)
CREATE TYPE recurrence_frequency AS ENUM (
    'daily',           -- Daily recurrence
    'weekly',          -- Weekly recurrence
    'monthly',         -- Monthly recurrence
    'quarterly',       -- Quarterly recurrence
    'yearly'           -- Yearly recurrence
);

COMMENT ON TYPE recurrence_frequency IS 'Frequency for recurring invoices and transactions';


-- =====================================================
-- Step 2: Create Tables
-- =====================================================

-- ==================== INVOICES TABLE ====================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Invoice identification
    invoice_number VARCHAR(50) NOT NULL UNIQUE,  -- e.g., "INV-2024-0001"

    -- Customer (required - sales invoice only)
    customer_id UUID NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,

    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms payment_terms NOT NULL DEFAULT 'net_30',
    custom_payment_terms_days INTEGER NULL,  -- Used when payment_terms = 'custom'

    -- Status
    status invoice_status NOT NULL DEFAULT 'draft',

    -- Financial totals (calculated from line items)
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_tax NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

    -- Invoice details
    notes TEXT NULL,                         -- Internal notes
    terms_and_conditions TEXT NULL,         -- Customer-facing terms
    footer_text TEXT NULL,                   -- Footer message on invoice

    -- References
    reference_number VARCHAR(100) NULL,      -- PO number, project code, etc.
    fiscal_year_id UUID NULL REFERENCES financial_years(id) ON DELETE RESTRICT,

    -- Recurring invoice link (constraint added after recurring_invoices table created)
    recurring_invoice_id UUID NULL,

    -- PDF storage
    pdf_url VARCHAR(500) NULL,               -- Path to generated PDF
    last_pdf_generated_at TIMESTAMP NULL,

    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP NULL,                  -- When status changed to 'sent'
    sent_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT invoices_due_date_after_invoice_date CHECK (due_date >= invoice_date),
    CONSTRAINT invoices_balance_non_negative CHECK (balance_due >= 0),
    CONSTRAINT invoices_paid_not_exceed_total CHECK (total_paid <= total_amount),
    CONSTRAINT invoices_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT invoices_total_tax_non_negative CHECK (total_tax >= 0),
    CONSTRAINT invoices_total_amount_non_negative CHECK (total_amount >= 0),
    CONSTRAINT invoices_custom_terms_when_custom CHECK (
        (payment_terms = 'custom' AND custom_payment_terms_days IS NOT NULL) OR
        (payment_terms != 'custom')
    )
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_fiscal_year_id ON invoices(fiscal_year_id);
CREATE INDEX idx_invoices_recurring_invoice_id ON invoices(recurring_invoice_id);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_invoice_date ON invoices(tenant_id, invoice_date DESC);
CREATE INDEX idx_invoices_tenant_customer ON invoices(tenant_id, customer_id);

COMMENT ON TABLE invoices IS 'Sales invoices for tracking customer billing and payments';
COMMENT ON COLUMN invoices.invoice_number IS 'Unique invoice number generated per tenant (e.g., INV-2024-0001)';
COMMENT ON COLUMN invoices.customer_id IS 'Customer (partner with category=customer) being invoiced';
COMMENT ON COLUMN invoices.balance_due IS 'Outstanding balance (total_amount - total_paid)';
COMMENT ON COLUMN invoices.recurring_invoice_id IS 'Link to recurring invoice template if auto-generated';


-- ==================== INVOICE LINE ITEMS TABLE ====================
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Line item details
    line_number INTEGER NOT NULL,            -- Order in invoice (1, 2, 3...)
    description TEXT NOT NULL,               -- Product/service description

    -- Pricing
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL,        -- qty * unit_price

    -- Tax
    tax_rate_id UUID NULL REFERENCES tax_rates(id) ON DELETE SET NULL,
    tax_rate_percentage NUMERIC(5, 2) NULL,  -- Snapshot at creation (for historical accuracy)
    tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

    -- Total
    line_total NUMERIC(15, 2) NOT NULL,      -- subtotal + tax_amount

    -- Optional categorization (for reporting)
    category_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT invoice_line_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT invoice_line_items_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT invoice_line_items_subtotal_non_negative CHECK (subtotal >= 0),
    CONSTRAINT invoice_line_items_tax_amount_non_negative CHECK (tax_amount >= 0),
    CONSTRAINT invoice_line_items_line_total_non_negative CHECK (line_total >= 0),
    CONSTRAINT invoice_line_items_line_number_positive CHECK (line_number > 0),
    CONSTRAINT invoice_line_items_unique_line_number UNIQUE(invoice_id, line_number)
);

-- Create indexes for invoice line items
CREATE INDEX idx_invoice_line_items_tenant_id ON invoice_line_items(tenant_id);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_tax_rate_id ON invoice_line_items(tax_rate_id);
CREATE INDEX idx_invoice_line_items_category_id ON invoice_line_items(category_id);

COMMENT ON TABLE invoice_line_items IS 'Individual line items on invoices (products/services)';
COMMENT ON COLUMN invoice_line_items.line_number IS 'Display order on invoice (1-based)';
COMMENT ON COLUMN invoice_line_items.tax_rate_percentage IS 'Snapshot of tax rate at time of creation (for historical accuracy if rate changes)';
COMMENT ON COLUMN invoice_line_items.subtotal IS 'Calculated as quantity * unit_price';
COMMENT ON COLUMN invoice_line_items.line_total IS 'Calculated as subtotal + tax_amount';


-- ==================== INVOICE PAYMENTS TABLE ====================
CREATE TABLE invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Payment details
    payment_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method payment_method NOT NULL,

    -- Transaction link (creates INCOME transaction when payment recorded)
    transaction_id UUID NULL REFERENCES transactions(id) ON DELETE SET NULL,
    account_id UUID NOT NULL REFERENCES money_accounts(id) ON DELETE RESTRICT,  -- Where money was received

    -- Reference
    reference_number VARCHAR(100) NULL,       -- Check number, transaction ID, etc.
    notes TEXT NULL,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT invoice_payments_amount_positive CHECK (amount > 0)
);

-- Create indexes for invoice payments
CREATE INDEX idx_invoice_payments_tenant_id ON invoice_payments(tenant_id);
CREATE INDEX idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_transaction_id ON invoice_payments(transaction_id);
CREATE INDEX idx_invoice_payments_account_id ON invoice_payments(account_id);
CREATE INDEX idx_invoice_payments_payment_date ON invoice_payments(payment_date);
CREATE INDEX idx_invoice_payments_tenant_payment_date ON invoice_payments(tenant_id, payment_date DESC);

COMMENT ON TABLE invoice_payments IS 'Payment history for invoices (supports partial payments)';
COMMENT ON COLUMN invoice_payments.transaction_id IS 'Link to INCOME transaction created when payment recorded';
COMMENT ON COLUMN invoice_payments.account_id IS 'Money account where payment was deposited';


-- ==================== RECURRING INVOICES TABLE ====================
CREATE TABLE recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Template details
    template_name VARCHAR(255) NOT NULL,
    customer_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- Recurrence settings
    frequency recurrence_frequency NOT NULL,  -- daily, weekly, monthly, quarterly, yearly
    start_date DATE NOT NULL,
    end_date DATE NULL,                       -- NULL = no end date
    next_invoice_date DATE NOT NULL,
    last_generated_date DATE NULL,

    -- Invoice defaults
    payment_terms payment_terms NOT NULL DEFAULT 'net_30',
    notes TEXT NULL,
    terms_and_conditions TEXT NULL,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT recurring_invoices_end_after_start CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT recurring_invoices_next_date_after_start CHECK (next_invoice_date >= start_date)
);

-- Create indexes for recurring invoices
CREATE INDEX idx_recurring_invoices_tenant_id ON recurring_invoices(tenant_id);
CREATE INDEX idx_recurring_invoices_customer_id ON recurring_invoices(customer_id);
CREATE INDEX idx_recurring_invoices_next_invoice_date ON recurring_invoices(next_invoice_date);
CREATE INDEX idx_recurring_invoices_is_active ON recurring_invoices(is_active);
CREATE INDEX idx_recurring_invoices_active_next_date ON recurring_invoices(is_active, next_invoice_date) WHERE is_active = TRUE;

COMMENT ON TABLE recurring_invoices IS 'Templates for automatically generating recurring invoices';
COMMENT ON COLUMN recurring_invoices.next_invoice_date IS 'Date when next invoice should be generated (updated after each generation)';
COMMENT ON COLUMN recurring_invoices.last_generated_date IS 'Date when last invoice was generated from this template';

-- Add foreign key constraint to invoices table now that recurring_invoices exists
ALTER TABLE invoices
ADD CONSTRAINT fk_invoices_recurring_invoice
FOREIGN KEY (recurring_invoice_id) REFERENCES recurring_invoices(id) ON DELETE SET NULL;


-- ==================== RECURRING INVOICE LINE ITEMS TABLE ====================
CREATE TABLE recurring_invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    recurring_invoice_id UUID NOT NULL REFERENCES recurring_invoices(id) ON DELETE CASCADE,

    -- Line item details (same as invoice_line_items)
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(15, 2) NOT NULL,
    tax_rate_id UUID NULL REFERENCES tax_rates(id) ON DELETE SET NULL,
    category_id UUID NULL REFERENCES categories(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT recurring_invoice_line_items_quantity_positive CHECK (quantity > 0),
    CONSTRAINT recurring_invoice_line_items_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT recurring_invoice_line_items_line_number_positive CHECK (line_number > 0),
    CONSTRAINT recurring_invoice_line_items_unique_line_number UNIQUE(recurring_invoice_id, line_number)
);

-- Create indexes for recurring invoice line items
CREATE INDEX idx_recurring_invoice_line_items_tenant_id ON recurring_invoice_line_items(tenant_id);
CREATE INDEX idx_recurring_invoice_line_items_recurring_invoice_id ON recurring_invoice_line_items(recurring_invoice_id);
CREATE INDEX idx_recurring_invoice_line_items_tax_rate_id ON recurring_invoice_line_items(tax_rate_id);
CREATE INDEX idx_recurring_invoice_line_items_category_id ON recurring_invoice_line_items(category_id);

COMMENT ON TABLE recurring_invoice_line_items IS 'Template line items for recurring invoices';


-- =====================================================
-- Step 3: Create/Update ActivityEntity Enum
-- =====================================================

-- Create activity_entity enum if it doesn't exist (with existing + new values)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_entity') THEN
        CREATE TYPE activity_entity AS ENUM (
            'USER',
            'TENANT',
            'ACCOUNT',
            'CATEGORY',
            'TRANSACTION',
            'PARTNER',
            'FINANCIAL_YEAR',
            'SETTINGS',
            'INVOICE',
            'INVOICE_PAYMENT',
            'RECURRING_INVOICE'
        );
    ELSE
        -- Add new entity types for activity logging (if enum already exists)
        ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'INVOICE';
        ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'INVOICE_PAYMENT';
        ALTER TYPE activity_entity ADD VALUE IF NOT EXISTS 'RECURRING_INVOICE';
    END IF;
END $$;


-- =====================================================
-- Step 4: Create Triggers for Auto-Update
-- =====================================================

-- Trigger function to update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal NUMERIC(15, 2);
    v_total_tax NUMERIC(15, 2);
    v_total_amount NUMERIC(15, 2);
BEGIN
    -- Get invoice_id (works for INSERT, UPDATE, DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate totals from line items
    SELECT
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(line_total), 0)
    INTO v_subtotal, v_total_tax, v_total_amount
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Update invoice totals and balance_due
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        total_tax = v_total_tax,
        total_amount = v_total_amount,
        balance_due = v_total_amount - total_paid,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to invoice_line_items table
CREATE TRIGGER trigger_update_invoice_totals_on_line_items
AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
FOR EACH ROW
EXECUTE FUNCTION update_invoice_totals();

COMMENT ON FUNCTION update_invoice_totals() IS 'Automatically recalculates invoice totals when line items change';


-- Trigger function to update invoice status and balance when payment recorded
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_new_total_paid NUMERIC(15, 2);
    v_invoice_total NUMERIC(15, 2);
    v_new_status invoice_status;
BEGIN
    -- Get invoice_id (works for INSERT, UPDATE, DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate new total_paid from all payments
    SELECT COALESCE(SUM(amount), 0)
    INTO v_new_total_paid
    FROM invoice_payments
    WHERE invoice_id = v_invoice_id;

    -- Get invoice total_amount
    SELECT total_amount INTO v_invoice_total
    FROM invoices
    WHERE id = v_invoice_id;

    -- Determine new status based on payments
    IF v_new_total_paid >= v_invoice_total THEN
        v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
        v_new_status := 'partially_paid';
    ELSE
        -- Keep existing status if no payments (handles DELETE)
        SELECT status INTO v_new_status
        FROM invoices
        WHERE id = v_invoice_id;
    END IF;

    -- Update invoice
    UPDATE invoices
    SET
        total_paid = v_new_total_paid,
        balance_due = total_amount - v_new_total_paid,
        status = CASE
            WHEN status IN ('draft', 'cancelled') THEN status  -- Don't auto-update if draft or cancelled
            ELSE v_new_status
        END,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to invoice_payments table
CREATE TRIGGER trigger_update_invoice_on_payment
AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_on_payment();

COMMENT ON FUNCTION update_invoice_on_payment() IS 'Automatically updates invoice total_paid, balance_due, and status when payments change';


-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to all tables with updated_at
CREATE TRIGGER trigger_invoices_updated_at BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_recurring_invoices_updated_at BEFORE UPDATE ON recurring_invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Step 5: Grant Permissions (if needed)
-- =====================================================

-- Permissions will be inherited from tenant-based access control


COMMIT;


-- =====================================================
-- ROLLBACK SCRIPT (Keep as comment for reference)
-- =====================================================

/*
-- To rollback this migration, run:

BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
DROP TRIGGER IF EXISTS trigger_invoice_line_items_updated_at ON invoice_line_items;
DROP TRIGGER IF EXISTS trigger_recurring_invoices_updated_at ON recurring_invoices;
DROP TRIGGER IF EXISTS trigger_update_invoice_totals_on_line_items ON invoice_line_items;
DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON invoice_payments;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_invoice_totals();
DROP FUNCTION IF EXISTS update_invoice_on_payment();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS recurring_invoice_line_items;
DROP TABLE IF EXISTS recurring_invoices;
DROP TABLE IF EXISTS invoice_payments;
DROP TABLE IF EXISTS invoice_line_items;
DROP TABLE IF EXISTS invoices;

-- Drop enums
DROP TYPE IF EXISTS payment_method;
DROP TYPE IF EXISTS payment_terms;
DROP TYPE IF EXISTS invoice_status;

-- Note: Cannot easily remove values from activity_entity enum
-- Would need to recreate the enum or keep the values

COMMIT;
*/
