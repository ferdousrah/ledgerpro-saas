-- Migration: Add product_categories table
-- Purpose: Create separate category system for products/services (distinct from transaction categories)
-- Date: 2025-12-24

-- Create product_categories table
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),  -- Hex color code like #FF5733
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_id ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_is_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant_name ON product_categories(tenant_id, name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_product_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_product_categories_updated_at();

-- Add column to products table to reference product_categories
-- This creates a separate categorization from transaction categories
ALTER TABLE products
ADD COLUMN IF NOT EXISTS product_category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL;

-- Create index for product_category_id
CREATE INDEX IF NOT EXISTS idx_products_product_category_id ON products(product_category_id);

-- Note: The existing category_id column in products references the transaction categories table
-- The new product_category_id column references the product_categories table
-- Both can coexist for different purposes:
--   - category_id: Used for transaction categorization when product appears on invoice
--   - product_category_id: Used for organizing products in the catalog
