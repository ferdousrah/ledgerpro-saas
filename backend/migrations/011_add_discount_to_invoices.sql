-- Migration: Add discount_amount to invoices
-- Description: Adds discount field and updates totals calculation trigger

-- Add discount_amount column to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN invoices.discount_amount IS 'Discount amount applied to invoice total';

-- Update existing invoices to have 0 discount
UPDATE invoices
SET discount_amount = 0.00
WHERE discount_amount IS NULL;

-- Update the trigger function to account for discount in total calculation
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal NUMERIC(15, 2);
    v_total_tax NUMERIC(15, 2);
    v_total_amount NUMERIC(15, 2);
    v_discount_amount NUMERIC(15, 2);
BEGIN
    -- Get invoice_id (works for INSERT, UPDATE, DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Get discount amount from invoice
    SELECT discount_amount
    INTO v_discount_amount
    FROM invoices
    WHERE id = v_invoice_id;

    -- Calculate totals from line items
    SELECT
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0),
        COALESCE(SUM(line_total), 0)
    INTO v_subtotal, v_total_tax, v_total_amount
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Apply discount to total
    -- Formula: total_amount = (subtotal + tax) - discount
    v_total_amount := v_total_amount - COALESCE(v_discount_amount, 0);

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

COMMENT ON FUNCTION update_invoice_totals() IS 'Automatically recalculates invoice totals (including discount) when line items change';

-- Also need to update totals when discount_amount changes on invoice
-- Create trigger to recalculate totals when invoice discount is updated
CREATE OR REPLACE FUNCTION update_invoice_totals_on_discount_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate total_amount with new discount
    NEW.total_amount := NEW.subtotal + NEW.total_tax - COALESCE(NEW.discount_amount, 0);
    NEW.balance_due := NEW.total_amount - NEW.total_paid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_invoice_discount ON invoices;

-- Create trigger for discount changes
CREATE TRIGGER trigger_update_invoice_discount
BEFORE UPDATE OF discount_amount ON invoices
FOR EACH ROW
WHEN (OLD.discount_amount IS DISTINCT FROM NEW.discount_amount)
EXECUTE FUNCTION update_invoice_totals_on_discount_change();

COMMENT ON TRIGGER trigger_update_invoice_discount ON invoices IS 'Recalculates invoice totals when discount amount changes';
