-- Migration: Add Partners table and update Transactions
-- Date: 2025-12-07
-- Description: Adds partners table for managing customers, vendors, employees, etc.
--              and links partners to transactions

-- Create partner category enum
CREATE TYPE partner_category AS ENUM ('customer', 'vendor', 'supplier', 'employee', 'other');

-- Create partners table
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    category partner_category NOT NULL,

    -- Contact information
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,

    -- Tax/Registration info
    tax_id VARCHAR(100),
    registration_number VARCHAR(100),

    -- Additional details
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Indexes
    CONSTRAINT partners_tenant_id_idx FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_partners_tenant_id ON partners(tenant_id);
CREATE INDEX idx_partners_category ON partners(category);
CREATE INDEX idx_partners_is_active ON partners(is_active);
CREATE INDEX idx_partners_name ON partners(name);

-- Add partner_id column to transactions table
ALTER TABLE transactions
ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE SET NULL;

-- Create index on partner_id for better query performance
CREATE INDEX idx_transactions_partner_id ON transactions(partner_id);

-- Add comment for documentation
COMMENT ON TABLE partners IS 'Business partners including customers, vendors, suppliers, and employees';
COMMENT ON COLUMN partners.category IS 'Type of partner: customer, vendor, supplier, employee, or other';
COMMENT ON COLUMN partners.tax_id IS 'Tax ID, VAT number, or similar tax identification';
COMMENT ON COLUMN partners.registration_number IS 'Business registration number or similar identifier';
COMMENT ON COLUMN transactions.partner_id IS 'Optional link to the partner involved in this transaction';
