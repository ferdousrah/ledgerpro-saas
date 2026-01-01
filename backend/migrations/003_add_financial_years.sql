-- Migration: Add Financial Year Management
-- Date: 2025-12-10
-- Description: Implements financial year management with cascade recalculation support
-- Author: System

BEGIN;

-- =======================
-- Step 1: Create ENUMS
-- =======================

-- Create financial year status enum
CREATE TYPE financial_year_status AS ENUM ('open', 'closed');

COMMENT ON TYPE financial_year_status IS 'Status of financial year: open (accepting new transactions), closed (admin only can edit)';


-- =======================
-- Step 2: Create Tables
-- =======================

-- Create financial_years table
CREATE TABLE financial_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Year identification
    year_name VARCHAR(50) NOT NULL,  -- e.g., "FY 2024-2025", "2024"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Status and metadata
    status financial_year_status NOT NULL DEFAULT 'open',
    is_current BOOLEAN NOT NULL DEFAULT FALSE,  -- Only one year can be current per tenant

    -- Closing information
    closed_at TIMESTAMP NULL,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Validation flags
    has_uncategorized_transactions BOOLEAN NOT NULL DEFAULT FALSE,
    total_transactions_count INTEGER NOT NULL DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Constraints
    CONSTRAINT financial_years_unique_tenant_year UNIQUE(tenant_id, year_name),
    CONSTRAINT financial_years_valid_date_range CHECK (end_date > start_date)
);

-- Indexes for financial_years
CREATE INDEX idx_financial_years_tenant_id ON financial_years(tenant_id);
CREATE INDEX idx_financial_years_status ON financial_years(status);
CREATE INDEX idx_financial_years_dates ON financial_years(start_date, end_date);
CREATE UNIQUE INDEX idx_financial_years_current ON financial_years(tenant_id, is_current) WHERE (is_current = TRUE);

-- Comments
COMMENT ON TABLE financial_years IS 'Financial year periods for organizing transactions and generating annual reports';
COMMENT ON COLUMN financial_years.is_current IS 'Indicates the active financial year for UI filtering. Only one per tenant can be current.';
COMMENT ON COLUMN financial_years.status IS 'open: can add transactions freely; closed: only admin can edit (with recalculation)';


-- Create account_year_balances table for historical tracking
CREATE TABLE account_year_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES money_accounts(id) ON DELETE CASCADE,

    -- Balance snapshots
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    closing_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,

    -- Transaction summaries for this account in this year
    total_income NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_expense NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    transaction_count INTEGER NOT NULL DEFAULT 0,

    -- Snapshot metadata
    snapshot_date TIMESTAMP NOT NULL DEFAULT NOW(),
    is_final BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE when year is closed

    -- Recalculation tracking
    last_recalculated_at TIMESTAMP NULL,
    recalculation_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT account_year_balances_unique_account_year UNIQUE(financial_year_id, account_id)
);

-- Indexes for account_year_balances
CREATE INDEX idx_account_year_balances_tenant_id ON account_year_balances(tenant_id);
CREATE INDEX idx_account_year_balances_financial_year_id ON account_year_balances(financial_year_id);
CREATE INDEX idx_account_year_balances_account_id ON account_year_balances(account_id);
CREATE INDEX idx_account_year_balances_is_final ON account_year_balances(is_final) WHERE (is_final = TRUE);

-- Comments
COMMENT ON TABLE account_year_balances IS 'Historical snapshots of account balances at year-end for audit trail and reporting';
COMMENT ON COLUMN account_year_balances.is_final IS 'TRUE when financial year is closed, prevents accidental modification';
COMMENT ON COLUMN account_year_balances.recalculation_count IS 'Tracks how many times balance was recalculated due to prior year edits';


-- Create year_closing_audit table for detailed audit trail
CREATE TABLE year_closing_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    financial_year_id UUID NOT NULL REFERENCES financial_years(id) ON DELETE CASCADE,

    -- Closing action
    action VARCHAR(20) NOT NULL,  -- 'close', 'reopen', 'recalculate'

    -- Snapshot of balances at closing
    balance_snapshot JSONB NOT NULL,  -- Stores account balances at time of closing

    -- Metadata
    performed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reason TEXT NULL,  -- Optional reason for reopening or recalculation

    -- Stats at time of action
    total_accounts INTEGER NOT NULL,
    total_transactions INTEGER NOT NULL
);

-- Indexes for year_closing_audit
CREATE INDEX idx_year_closing_audit_financial_year_id ON year_closing_audit(financial_year_id);
CREATE INDEX idx_year_closing_audit_performed_at ON year_closing_audit(performed_at DESC);

-- Comments
COMMENT ON TABLE year_closing_audit IS 'Audit trail for all year closing operations including balance snapshots';


-- =======================
-- Step 3: Modify Transactions Table
-- =======================

-- Add fiscal_year_id to transactions (nullable for backward compatibility)
ALTER TABLE transactions
ADD COLUMN fiscal_year_id UUID REFERENCES financial_years(id) ON DELETE RESTRICT;

-- Create indexes for performance
CREATE INDEX idx_transactions_fiscal_year_id ON transactions(fiscal_year_id);
CREATE INDEX idx_transactions_tenant_year_date ON transactions(tenant_id, fiscal_year_id, transaction_date);

-- Comment
COMMENT ON COLUMN transactions.fiscal_year_id IS 'Links transaction to financial year. NULL for legacy data before year management implementation or transactions outside any defined fiscal year.';


-- =======================
-- Step 4: Auto-create Financial Years from Existing Data
-- =======================

DO $$
DECLARE
    tenant_rec RECORD;
    min_date DATE;
    max_date DATE;
    current_year_start DATE;
    current_year_end DATE;
    year_name VARCHAR(50);
    is_latest BOOLEAN;
    years_created INTEGER;
BEGIN
    -- For each tenant, create fiscal years based on their fiscal_year_start and transaction dates
    FOR tenant_rec IN SELECT id, fiscal_year_start FROM tenants LOOP
        years_created := 0;

        -- Get min and max transaction dates for this tenant
        SELECT MIN(transaction_date), MAX(transaction_date)
        INTO min_date, max_date
        FROM transactions
        WHERE tenant_id = tenant_rec.id;

        -- Skip if no transactions exist
        IF min_date IS NULL OR max_date IS NULL THEN
            RAISE NOTICE 'Tenant % has no transactions, skipping year creation', tenant_rec.id;
            CONTINUE;
        END IF;

        -- Calculate the starting year based on fiscal_year_start
        -- Find the fiscal year that contains the earliest transaction
        current_year_start := tenant_rec.fiscal_year_start;

        -- Adjust year if needed to include min_date
        WHILE current_year_start > min_date LOOP
            current_year_start := current_year_start - INTERVAL '1 year';
        END LOOP;

        -- Create years until we cover max_date
        WHILE current_year_start <= max_date LOOP
            current_year_end := current_year_start + INTERVAL '1 year' - INTERVAL '1 day';

            -- Generate year name (e.g., "FY 2024-2025" or "FY 2024")
            IF EXTRACT(YEAR FROM current_year_start) != EXTRACT(YEAR FROM current_year_end) THEN
                year_name := 'FY ' || EXTRACT(YEAR FROM current_year_start)::TEXT || '-' ||
                            EXTRACT(YEAR FROM current_year_end)::TEXT;
            ELSE
                year_name := 'FY ' || EXTRACT(YEAR FROM current_year_start)::TEXT;
            END IF;

            -- Check if this is the latest year (covers max_date)
            is_latest := (current_year_end >= max_date);

            -- Insert financial year
            INSERT INTO financial_years (
                tenant_id,
                year_name,
                start_date,
                end_date,
                status,
                is_current,
                has_uncategorized_transactions,
                total_transactions_count,
                created_at,
                updated_at
            )
            VALUES (
                tenant_rec.id,
                year_name,
                current_year_start,
                current_year_end,
                'open',  -- All created years start as open
                is_latest,  -- Only the most recent year is marked as current
                FALSE,
                0,  -- Will be updated in next step
                NOW(),
                NOW()
            )
            ON CONFLICT (tenant_id, year_name) DO NOTHING;

            years_created := years_created + 1;

            -- Move to next year
            current_year_start := current_year_start + INTERVAL '1 year';
        END LOOP;

        RAISE NOTICE 'Created % financial years for tenant %', years_created, tenant_rec.id;
    END LOOP;
END;
$$;


-- =======================
-- Step 5: Auto-assign Transactions to Fiscal Years
-- =======================

-- Update transactions with fiscal_year_id based on transaction_date
UPDATE transactions t
SET fiscal_year_id = fy.id
FROM financial_years fy
WHERE t.tenant_id = fy.tenant_id
  AND t.transaction_date >= fy.start_date
  AND t.transaction_date <= fy.end_date
  AND t.fiscal_year_id IS NULL;

-- Log results
DO $$
DECLARE
    assigned_count INTEGER;
    unassigned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO assigned_count
    FROM transactions
    WHERE fiscal_year_id IS NOT NULL;

    SELECT COUNT(*) INTO unassigned_count
    FROM transactions
    WHERE fiscal_year_id IS NULL;

    RAISE NOTICE 'Assigned % transactions to fiscal years', assigned_count;
    RAISE NOTICE '% transactions remain unassigned (outside any fiscal year)', unassigned_count;
END;
$$;


-- =======================
-- Step 6: Update Financial Year Statistics
-- =======================

-- Update total_transactions_count for each year
UPDATE financial_years fy
SET total_transactions_count = (
    SELECT COUNT(*)
    FROM transactions t
    WHERE t.fiscal_year_id = fy.id
);

-- Update has_uncategorized_transactions flag
UPDATE financial_years fy
SET has_uncategorized_transactions = EXISTS (
    SELECT 1
    FROM transactions t
    WHERE t.fiscal_year_id = fy.id
      AND t.category_id IS NULL
);


-- =======================
-- Step 7: Initialize Account Year Balances
-- =======================

-- For each financial year and account, calculate opening/closing balances
DO $$
DECLARE
    year_rec RECORD;
    account_rec RECORD;
    income_sum NUMERIC(15, 2);
    expense_sum NUMERIC(15, 2);
    txn_count INTEGER;
    opening_bal NUMERIC(15, 2);
    closing_bal NUMERIC(15, 2);
    prev_year_closing NUMERIC(15, 2);
    balances_created INTEGER := 0;
BEGIN
    -- Process years in chronological order for proper balance carry-forward
    FOR year_rec IN
        SELECT id, tenant_id, start_date, end_date, year_name
        FROM financial_years
        ORDER BY tenant_id, start_date
    LOOP
        -- For each account in this tenant
        FOR account_rec IN
            SELECT id, opening_balance
            FROM money_accounts
            WHERE tenant_id = year_rec.tenant_id
        LOOP
            -- Get previous year's closing balance for this account
            SELECT closing_balance INTO prev_year_closing
            FROM account_year_balances ayb
            JOIN financial_years fy ON ayb.financial_year_id = fy.id
            WHERE ayb.account_id = account_rec.id
              AND fy.tenant_id = year_rec.tenant_id
              AND fy.end_date < year_rec.start_date
            ORDER BY fy.end_date DESC
            LIMIT 1;

            -- If no previous year, use account's opening_balance
            IF prev_year_closing IS NULL THEN
                opening_bal := account_rec.opening_balance;
            ELSE
                opening_bal := prev_year_closing;
            END IF;

            -- Calculate income and expense sums for this year
            SELECT
                COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0),
                COUNT(*)
            INTO income_sum, expense_sum, txn_count
            FROM transactions
            WHERE fiscal_year_id = year_rec.id
              AND account_id = account_rec.id;

            -- Calculate closing balance
            closing_bal := opening_bal + income_sum - expense_sum;

            -- Insert account year balance snapshot
            INSERT INTO account_year_balances (
                tenant_id,
                financial_year_id,
                account_id,
                opening_balance,
                closing_balance,
                total_income,
                total_expense,
                transaction_count,
                snapshot_date,
                is_final,
                created_at,
                updated_at
            )
            VALUES (
                year_rec.tenant_id,
                year_rec.id,
                account_rec.id,
                opening_bal,
                closing_bal,
                income_sum,
                expense_sum,
                txn_count,
                NOW(),
                FALSE,  -- Years start as open (not final)
                NOW(),
                NOW()
            );

            balances_created := balances_created + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Created % account year balance snapshots', balances_created;
END;
$$;


-- =======================
-- Step 8: Update Current Balances
-- =======================

-- Update money_accounts.current_balance to match the most recent year's closing balance
UPDATE money_accounts ma
SET current_balance = ayb.closing_balance
FROM account_year_balances ayb
JOIN financial_years fy ON ayb.financial_year_id = fy.id
WHERE ayb.account_id = ma.id
  AND fy.is_current = TRUE;

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Financial year management migration completed successfully!';
    RAISE NOTICE 'Created tables: financial_years, account_year_balances, year_closing_audit';
    RAISE NOTICE 'Added fiscal_year_id column to transactions';
    RAISE NOTICE 'Auto-created fiscal years from existing transaction data';
    RAISE NOTICE 'Initialized account balance snapshots with historical calculations';
END;
$$;

COMMIT;

-- =======================
-- Rollback Instructions (for reference)
-- =======================

-- To rollback this migration, run:
-- BEGIN;
-- ALTER TABLE transactions DROP COLUMN fiscal_year_id;
-- DROP TABLE year_closing_audit;
-- DROP TABLE account_year_balances;
-- DROP TABLE financial_years;
-- DROP TYPE financial_year_status;
-- COMMIT;
