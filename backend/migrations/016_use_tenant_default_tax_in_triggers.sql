-- Migration: Update triggers to use tenant's default tax rate
-- Description: Simplifies tax calculation by using tenant's default_tax_rate setting

-- Update the invoice totals trigger to use tenant's default tax rate
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_tenant_id UUID;
    v_subtotal NUMERIC(15, 2);
    v_discount_amount NUMERIC(15, 2);
    v_taxable_amount NUMERIC(15, 2);
    v_tenant_tax_rate NUMERIC(5, 2);
    v_calculated_tax NUMERIC(15, 2);
    v_total_amount NUMERIC(15, 2);
BEGIN
    -- Get invoice_id (works for INSERT, UPDATE, DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Get tenant_id from invoice
    SELECT tenant_id, discount_amount
    INTO v_tenant_id, v_discount_amount
    FROM invoices
    WHERE id = v_invoice_id;

    -- Get tenant's default tax rate
    SELECT default_tax_rate
    INTO v_tenant_tax_rate
    FROM tenants
    WHERE id = v_tenant_id;

    -- Calculate subtotal from line items
    SELECT COALESCE(SUM(subtotal), 0)
    INTO v_subtotal
    FROM invoice_line_items
    WHERE invoice_id = v_invoice_id;

    -- Calculate taxable amount (subtotal after discount)
    v_taxable_amount := v_subtotal - COALESCE(v_discount_amount, 0);

    -- Calculate tax using tenant's default rate
    -- tax_rate is stored as percentage (e.g., 15.00), so divide by 100
    v_calculated_tax := v_taxable_amount * (COALESCE(v_tenant_tax_rate, 0) / 100.0);

    -- Calculate total
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

COMMENT ON FUNCTION update_invoice_totals() IS 'Recalculates invoice totals using tenant default tax rate';

-- Update the discount change trigger to use tenant's default tax rate
CREATE OR REPLACE FUNCTION update_invoice_totals_on_discount_change()
RETURNS TRIGGER AS $$
DECLARE
    v_tenant_tax_rate NUMERIC(5, 2);
    v_taxable_amount NUMERIC(15, 2);
    v_calculated_tax NUMERIC(15, 2);
BEGIN
    -- Get tenant's default tax rate
    SELECT default_tax_rate
    INTO v_tenant_tax_rate
    FROM tenants
    WHERE id = NEW.tenant_id;

    -- Calculate taxable amount (subtotal after discount)
    v_taxable_amount := NEW.subtotal - COALESCE(NEW.discount_amount, 0);

    -- Calculate tax using tenant's default rate
    v_calculated_tax := v_taxable_amount * (COALESCE(v_tenant_tax_rate, 0) / 100.0);

    -- Update totals
    NEW.total_tax := v_calculated_tax;
    NEW.total_amount := v_taxable_amount + v_calculated_tax;
    NEW.balance_due := NEW.total_amount - NEW.total_paid;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_invoice_totals_on_discount_change() IS 'Recalculates tax using tenant default rate when discount changes';
