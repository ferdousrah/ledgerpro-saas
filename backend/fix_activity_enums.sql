-- Fix activity enum types to use UPPERCASE values
-- This script alters the existing enum types to match the Python code

BEGIN;

-- Drop and recreate activitytype enum with UPPERCASE values
DROP TYPE IF EXISTS activitytype CASCADE;
CREATE TYPE activitytype AS ENUM (
    'LOGIN',
    'LOGOUT',
    'REGISTER',
    'CREATE',
    'UPDATE',
    'DELETE',
    'VIEW',
    'EXPORT',
    'IMPORT',
    'SETTINGS_CHANGE'
);

-- Drop and recreate activity_entity if it has lowercase values
-- (The migration shows it should already have UPPERCASE, but let's ensure consistency)
DROP TYPE IF EXISTS activity_entity CASCADE;
CREATE TYPE activity_entity AS ENUM (
    'USER',
    'TENANT',
    'ACCOUNT',
    'CATEGORY',
    'TRANSACTION',
    'PARTNER',
    'FINANCIAL_YEAR',
    'SETTINGS',
    'INVOICE',
    'INVOICE_PAYMENT',
    'RECURRING_INVOICE'
);

-- Recreate the activity_logs table to use the new enum types
-- First drop existing table (WARNING: This will delete all activity log data!)
DROP TABLE IF EXISTS activity_logs CASCADE;

-- Recreate activity_logs table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Activity details
    activity_type activitytype NOT NULL,
    entity_type activity_entity NOT NULL,
    entity_id VARCHAR NULL,
    entity_name VARCHAR NULL,

    -- Details and metadata
    description TEXT NULL,
    ip_address VARCHAR NULL,
    user_agent VARCHAR NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

COMMIT;
