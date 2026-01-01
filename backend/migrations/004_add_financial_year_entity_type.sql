-- Migration: Add 'financial_year' to activityentity enum
-- Date: 2025-12-11
-- Description: Adds the financial_year value to the activityentity enum type
--              to support activity logging for financial year operations

-- Add the new enum value
ALTER TYPE activityentity ADD VALUE IF NOT EXISTS 'financial_year';

-- Note: This migration is safe to run multiple times
