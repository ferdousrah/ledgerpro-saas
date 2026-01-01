-- Migration: Add tax_label to tenants table
-- Description: Allow users to customize tax terminology (Tax, VAT, or GST)

-- Add tax_label column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS tax_label VARCHAR(20) NOT NULL DEFAULT 'Tax';

-- Add check constraint to ensure only valid values
ALTER TABLE tenants
ADD CONSTRAINT tax_label_check CHECK (tax_label IN ('Tax', 'VAT', 'GST'));

COMMENT ON COLUMN tenants.tax_label IS 'Tax label used in invoices and reports (Tax, VAT, or GST)';
