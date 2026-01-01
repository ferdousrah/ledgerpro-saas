"""
Product/Service Schemas
Pydantic models for API validation
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class ProductBase(BaseModel):
    """Base product schema"""
    name: str = Field(..., min_length=1, max_length=255)
    product_type: str = Field(..., pattern="^(product|service)$")
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    unit_price: float = Field(..., ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    tax_rate_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    product_category_id: Optional[UUID] = None
    track_inventory: bool = False
    stock_quantity: Optional[float] = Field(None, ge=0)
    low_stock_threshold: Optional[float] = Field(None, ge=0)
    is_active: bool = True


class ProductCreate(ProductBase):
    """Schema for creating a product"""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating a product"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    product_type: Optional[str] = Field(None, pattern="^(product|service)$")
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    unit_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    tax_rate_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    product_category_id: Optional[UUID] = None
    track_inventory: Optional[bool] = None
    stock_quantity: Optional[float] = Field(None, ge=0)
    low_stock_threshold: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None


class Product(ProductBase):
    """Complete product schema"""
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class ProductWithDetails(Product):
    """Product with related entity details"""
    tax_rate_name: Optional[str] = None
    tax_rate_percentage: Optional[float] = None
    category_name: Optional[str] = None
    product_category_name: Optional[str] = None
    product_category_color: Optional[str] = None
