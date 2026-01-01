"""
Product Category Schemas
Pydantic models for product category data validation and serialization
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProductCategoryBase(BaseModel):
    """Base schema for product category"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')  # Hex color validation


class ProductCategoryCreate(ProductCategoryBase):
    """Schema for creating a new product category"""
    is_active: bool = True


class ProductCategoryUpdate(BaseModel):
    """Schema for updating a product category"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    is_active: Optional[bool] = None


class ProductCategory(ProductCategoryBase):
    """Schema for product category response"""
    id: UUID
    tenant_id: UUID
    is_active: bool
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
