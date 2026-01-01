-- Migration: Remove tax_rate_id from invoice line items
-- Description: Simplifies tax calculation by using tenant's default tax rate instead of per-line tax rates

-- Remove tax_rate_id from invoice_line_items
ALTER TABLE invoice_line_items
DROP COLUMN IF EXISTS tax_rate_id;

-- Remove tax_rate_id from recurring_invoice_line_items
ALTER TABLE recurring_invoice_line_items
DROP COLUMN IF EXISTS tax_rate_id;

COMMENT ON TABLE invoice_line_items IS 'Invoice line items - tax calculated using tenant default rate';
COMMENT ON TABLE recurring_invoice_line_items IS 'Recurring invoice line items - tax calculated using tenant default rate';
