-- Migration: Add Products/Services Catalog
-- Description: Create products table for managing service and product catalog

-- Create product_type enum
DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('product', 'service');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Product details
    name VARCHAR(255) NOT NULL,
    product_type product_type NOT NULL DEFAULT 'service',
    description TEXT,
    sku VARCHAR(100),  -- Stock keeping unit / product code

    -- Pricing
    unit_price NUMERIC(15, 2) NOT NULL,
    cost_price NUMERIC(15, 2),  -- For profit calculations

    -- Tax and category defaults
    tax_rate_id UUID REFERENCES tax_rates(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

    -- Stock tracking (optional, for products)
    track_inventory BOOLEAN NOT NULL DEFAULT false,
    stock_quantity NUMERIC(10, 2),  -- Current stock level
    low_stock_threshold NUMERIC(10, 2),  -- Alert threshold

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Indexes
    CONSTRAINT products_tenant_id_idx UNIQUE (tenant_id, id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_tax_rate_id ON products(tax_rate_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();
