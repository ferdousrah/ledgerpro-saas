-- Add address field to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
