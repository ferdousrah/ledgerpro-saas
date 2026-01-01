-- Add PDF margin settings to tenants table
-- These margins control the spacing in generated invoice PDFs

BEGIN;

-- Add PDF margin columns with defaults
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS pdf_top_margin INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS pdf_bottom_margin INTEGER DEFAULT 20;

-- Set default values for existing rows
UPDATE tenants
SET pdf_top_margin = 70, pdf_bottom_margin = 20
WHERE pdf_top_margin IS NULL OR pdf_bottom_margin IS NULL;

-- Add comments
COMMENT ON COLUMN tenants.pdf_top_margin IS 'Top margin for invoice PDFs in millimeters (space for company letterhead)';
COMMENT ON COLUMN tenants.pdf_bottom_margin IS 'Bottom margin for invoice PDFs in millimeters (space for footer)';

COMMIT;
