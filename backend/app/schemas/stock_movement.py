"""
Stock Movement Schemas
Pydantic models for stock movement data validation and serialization
"""
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal


class StockMovementBase(BaseModel):
    """Base schema for stock movement"""
    movement_type: str = Field(..., pattern="^(stock_in|stock_out|adjustment|transfer)$")
    movement_date: date
    product_id: UUID
    warehouse_id: UUID
    to_warehouse_id: Optional[UUID] = None
    quantity: Decimal = Field(..., decimal_places=2)
    unit_cost: Optional[Decimal] = Field(None, decimal_places=2)
    total_cost: Optional[Decimal] = Field(None, decimal_places=2)
    reference_type: Optional[str] = Field(None, max_length=50)
    reference_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    reason: Optional[str] = Field(None, max_length=255)


class StockMovementCreate(StockMovementBase):
    """Schema for creating a new stock movement"""
    pass


class StockMovement(StockMovementBase):
    """Schema for stock movement response"""
    id: UUID
    tenant_id: UUID
    created_by: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class StockMovementWithDetails(StockMovement):
    """Stock movement with related entity details"""
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    warehouse_name: Optional[str] = None
    to_warehouse_name: Optional[str] = None


class StockAdjustmentRequest(BaseModel):
    """Schema for creating a stock adjustment"""
    product_id: UUID
    warehouse_id: UUID
    quantity: Decimal = Field(..., decimal_places=2)  # Can be positive or negative
    reason: str = Field(..., min_length=1, max_length=255)
    notes: Optional[str] = None
    movement_date: Optional[date] = None


class StockTransferRequest(BaseModel):
    """Schema for transferring stock between warehouses"""
    product_id: UUID
    from_warehouse_id: UUID
    to_warehouse_id: UUID
    quantity: Decimal = Field(..., gt=0, decimal_places=2)
    notes: Optional[str] = None
    movement_date: Optional[date] = None
