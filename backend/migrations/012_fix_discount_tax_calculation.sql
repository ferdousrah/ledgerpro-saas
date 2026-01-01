-- Migration: Fix discount and tax calculation order
-- Description: Tax should be calculated on amount after discount is applied

-- Update the trigger function to calculate tax after discount
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal NUMERIC(15, 2);
    v_original_tax NUMERIC(15, 2);
    v_recalculated_tax NUMERIC(15, 2);
    v_discount_amount NUMERIC(15, 2);
    v_subtotal_after_discount NUMERIC(15, 2);
    v_total_amount NUMERIC(15, 2);
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
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_original_tax
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Apply discount to subtotal first
    v_subtotal_after_discount := v_subtotal - COALESCE(v_discount_amount, 0);

    -- Recalculate tax proportionally based on discounted subtotal
    -- If there's a discount, reduce tax proportionally
    IF v_subtotal > 0 AND v_discount_amount > 0 THEN
        v_recalculated_tax := v_original_tax * v_subtotal_after_discount / v_subtotal;
    ELSE
        v_recalculated_tax := v_original_tax;
    END IF;

    -- Calculate final total: (subtotal - discount) + recalculated_tax
    v_total_amount := v_subtotal_after_discount + v_recalculated_tax;

    -- Update invoice totals and balance_due
    UPDATE invoices
    SET
        subtotal = v_subtotal,
        total_tax = v_recalculated_tax,
        total_amount = v_total_amount,
        balance_due = v_total_amount - total_paid,
        updated_at = NOW()
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_invoice_totals() IS 'Recalculates invoice totals with tax calculated on amount after discount';

-- Update the discount change trigger as well
CREATE OR REPLACE FUNCTION update_invoice_totals_on_discount_change()
RETURNS TRIGGER AS $$
DECLARE
    v_original_tax NUMERIC(15, 2);
    v_recalculated_tax NUMERIC(15, 2);
    v_subtotal_after_discount NUMERIC(15, 2);
BEGIN
    -- Apply discount to subtotal
    v_subtotal_after_discount := NEW.subtotal - COALESCE(NEW.discount_amount, 0);

    -- Recalculate tax proportionally
    -- Get original tax from line items sum
    SELECT COALESCE(SUM(tax_amount), 0)
    INTO v_original_tax
    FROM invoice_line_items
    WHERE invoice_id = NEW.id;

    -- Recalculate tax proportionally based on discounted subtotal
    IF NEW.subtotal > 0 AND NEW.discount_amount > 0 THEN
        v_recalculated_tax := v_original_tax * v_subtotal_after_discount / NEW.subtotal;
    ELSE
        v_recalculated_tax := v_original_tax;
    END IF;

    -- Update totals
    NEW.total_tax := v_recalculated_tax;
    NEW.total_amount := v_subtotal_after_discount + v_recalculated_tax;
    NEW.balance_due := NEW.total_amount - NEW.total_paid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_invoice_totals_on_discount_change() IS 'Recalculates tax proportionally when discount changes';
