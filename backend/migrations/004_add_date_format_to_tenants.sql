-- Migration: Add date_format column to tenants table
-- Description: Allows users to configure their preferred date format

-- Add date_format column with default value
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY';

-- Update existing records to have the default format
UPDATE tenants
SET date_format = 'DD/MM/YYYY'
WHERE date_format IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN tenants.date_format IS 'User preferred date format (e.g., DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)';
