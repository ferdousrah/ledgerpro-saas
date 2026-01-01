-- Migration: Implement standard discount and tax calculation
-- Description: Tax calculated on discounted amount using effective tax rate

-- Update the trigger function with standard calculation
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal NUMERIC(15, 2);
    v_line_item_taxes NUMERIC(15, 2);
    v_discount_amount NUMERIC(15, 2);
    v_taxable_amount NUMERIC(15, 2);
    v_effective_tax_rate NUMERIC(10, 6);
    v_calculated_tax NUMERIC(15, 2);
    v_total_amount NUMERIC(15, 2);
BEGIN
    -- Get invoice_id (works for INSERT, UPDATE, DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Get discount amount from invoice
    SELECT discount_amount
    INTO v_discount_amount
    FROM invoices
    WHERE id = v_invoice_id;

    -- Calculate subtotal and line item taxes (at full price)
    SELECT
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_line_item_taxes
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Standard calculation:
    -- 1. Apply discount to subtotal
    v_taxable_amount := v_subtotal - COALESCE(v_discount_amount, 0);

    -- 2. Calculate effective tax rate from line items
    IF v_subtotal > 0 THEN
        v_effective_tax_rate := v_line_item_taxes / v_subtotal;
    ELSE
        v_effective_tax_rate := 0;
    END IF;

    -- 3. Calculate tax on the discounted taxable amount
    v_calculated_tax := v_taxable_amount * v_effective_tax_rate;

    -- 4. Calculate total
    v_total_amount := v_taxable_amount + v_calculated_tax;

    -- Update invoice totals and balance_due
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        total_tax = v_calculated_tax,
        total_amount = v_total_amount,
        balance_due = v_total_amount - total_paid,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_invoice_totals() IS 'Standard calculation: tax = (subtotal - discount) × effective_tax_rate';

-- Update the discount change trigger with standard calculation
CREATE OR REPLACE FUNCTION update_invoice_totals_on_discount_change()
RETURNS TRIGGER AS $$
DECLARE
    v_line_item_taxes NUMERIC(15, 2);
    v_taxable_amount NUMERIC(15, 2);
    v_effective_tax_rate NUMERIC(10, 6);
    v_calculated_tax NUMERIC(15, 2);
BEGIN
    -- Get line item taxes (at full price)
    SELECT COALESCE(SUM(tax_amount), 0)
    INTO v_line_item_taxes
    FROM invoice_line_items
    WHERE invoice_id = NEW.id;

    -- Standard calculation:
    -- 1. Apply discount to subtotal
    v_taxable_amount := NEW.subtotal - COALESCE(NEW.discount_amount, 0);

    -- 2. Calculate effective tax rate
    IF NEW.subtotal > 0 THEN
        v_effective_tax_rate := v_line_item_taxes / NEW.subtotal;
    ELSE
        v_effective_tax_rate := 0;
    END IF;

    -- 3. Calculate tax on discounted amount
    v_calculated_tax := v_taxable_amount * v_effective_tax_rate;

    -- 4. Calculate total
    NEW.total_tax := v_calculated_tax;
    NEW.total_amount := v_taxable_amount + v_calculated_tax;
    NEW.balance_due := NEW.total_amount - NEW.total_paid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_invoice_totals_on_discount_change() IS 'Standard calculation when discount changes';
