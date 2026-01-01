-- Migration: Add Inventory Management System
-- Purpose: Create warehouses, stock movements, and product-warehouse stock tracking
-- Date: 2025-12-25

-- Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_default ON warehouses(is_default);

-- Create movement_type enum
DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('stock_in', 'stock_out', 'adjustment', 'transfer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    movement_type movement_type NOT NULL,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    to_warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_cost NUMERIC(15, 2),
    total_cost NUMERIC(15, 2),
    reference_type VARCHAR(50),
    reference_id UUID,
    reference_number VARCHAR(100),
    notes TEXT,
    reason VARCHAR(255),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id ON stock_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_to_warehouse_id ON stock_movements(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- Create product_warehouse_stock table
CREATE TABLE IF NOT EXISTS product_warehouse_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reserved_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, product_id, warehouse_id)
);

-- Create indexes for product_warehouse_stock
CREATE INDEX IF NOT EXISTS idx_product_warehouse_stock_tenant_id ON product_warehouse_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouse_stock_product_id ON product_warehouse_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouse_stock_warehouse_id ON product_warehouse_stock(warehouse_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouses_updated_at();

CREATE OR REPLACE FUNCTION update_product_warehouse_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_product_warehouse_stock_updated_at
    BEFORE UPDATE ON product_warehouse_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_product_warehouse_stock_updated_at();

-- Notes:
-- 1. Movement quantity: positive for IN movements, can be negative for OUT
-- 2. product_warehouse_stock maintains current stock levels
-- 3. stock_movements provides complete audit trail
-- 4. Each product can have stock in multiple warehouses
