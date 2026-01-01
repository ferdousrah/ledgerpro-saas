-- Migration: Fix Invoice Status When All Payments Are Deleted
-- Issue: When all payments are deleted, status should revert to SENT or OVERDUE, not stay PAID

BEGIN;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON invoice_payments;

-- Update the trigger function to properly handle status when all payments deleted
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_new_total_paid NUMERIC(15, 2);
    v_invoice_total NUMERIC(15, 2);
    v_due_date DATE;
    v_new_status invoice_status;
    v_current_status invoice_status;
BEGIN
    -- Get invoice_id (works for INSERT, UPDATE, DELETE)
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Get current invoice data
    SELECT total_amount, due_date, status
    INTO v_invoice_total, v_due_date, v_current_status
    FROM invoices
    WHERE id = v_invoice_id;

    -- Calculate new total_paid from all payments
    SELECT COALESCE(SUM(amount), 0)
    INTO v_new_total_paid
    FROM invoice_payments
    WHERE invoice_id = v_invoice_id;

    -- Determine new status based on payments
    IF v_new_total_paid >= v_invoice_total THEN
        v_new_status := 'paid';
    ELSIF v_new_total_paid > 0 THEN
        -- Partially paid - check if overdue
        IF v_due_date < CURRENT_DATE THEN
            v_new_status := 'overdue';
        ELSE
            v_new_status := 'partially_paid';
        END IF;
    ELSE
        -- No payments - check if overdue or sent
        IF v_due_date < CURRENT_DATE THEN
            v_new_status := 'overdue';
        ELSE
            v_new_status := 'sent';
        END IF;
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

-- Recreate trigger
CREATE TRIGGER trigger_update_invoice_on_payment
AFTER INSERT OR UPDATE OR DELETE ON invoice_payments
FOR EACH ROW
EXECUTE FUNCTION update_invoice_on_payment();

COMMENT ON FUNCTION update_invoice_on_payment() IS 'Automatically updates invoice total_paid, balance_due, and status when payments change. Properly handles status when all payments are deleted.';

COMMIT;
