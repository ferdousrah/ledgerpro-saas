-- Migration: Add logo_url to tenants table
-- Date: 2025-12-25

-- Add logo_url column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

COMMENT ON COLUMN tenants.logo_url IS 'URL of the company logo for invoices and documents';
