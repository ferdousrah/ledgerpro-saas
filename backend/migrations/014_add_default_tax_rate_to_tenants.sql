-- Migration: Add default_tax_rate to tenants
-- Description: Adds a default tax rate setting for each tenant to simplify invoice calculations

-- Add default_tax_rate column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN tenants.default_tax_rate IS 'Default tax rate percentage (e.g., 15.00 for 15%) applied to all invoices';

-- Set a reasonable default for existing tenants (0% - can be updated in settings)
UPDATE tenants
SET default_tax_rate = 0.00
WHERE default_tax_rate IS NULL;

-- Add constraint to ensure tax rate is between 0 and 100
ALTER TABLE tenants
ADD CONSTRAINT check_default_tax_rate_range
CHECK (default_tax_rate >= 0 AND default_tax_rate <= 100);

COMMENT ON CONSTRAINT check_default_tax_rate_range ON tenants IS 'Ensures default tax rate is between 0% and 100%';
