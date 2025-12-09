-- Migration: Update Partners table with category-specific fields
-- Date: 2025-12-07
-- Description: Removes SUPPLIER category and adds fields for employees and contact persons

-- Step 1: Update existing 'supplier' entries to 'vendor'
UPDATE partners SET category = 'vendor' WHERE category = 'supplier';

-- Step 2: Recreate the enum (PostgreSQL requires this approach)
ALTER TABLE partners ALTER COLUMN category TYPE VARCHAR(8);
DROP TYPE IF EXISTS partner_category;
CREATE TYPE partner_category AS ENUM ('customer', 'vendor', 'employee', 'other');
ALTER TABLE partners ALTER COLUMN category TYPE partner_category USING category::partner_category;

-- Step 3: Add new fields for contact person (companies)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_person_email VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_person_mobile VARCHAR(50);

-- Step 4: Add new fields for employees
ALTER TABLE partners ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS designation VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS section VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS joining_date DATE;

-- Add comments
COMMENT ON COLUMN partners.contact_person_name IS 'Contact person name for companies/vendors';
COMMENT ON COLUMN partners.contact_person_email IS 'Contact person email for companies/vendors';
COMMENT ON COLUMN partners.contact_person_mobile IS 'Contact person mobile for companies/vendors';
COMMENT ON COLUMN partners.employee_id IS 'Employee ID for employee partners';
COMMENT ON COLUMN partners.designation IS 'Designation/Job title for employee partners';
COMMENT ON COLUMN partners.department IS 'Department for employee partners';
COMMENT ON COLUMN partners.section IS 'Section for employee partners';
COMMENT ON COLUMN partners.joining_date IS 'Joining date for employee partners';
