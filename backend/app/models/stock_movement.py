"""
Stock Movement Models
Tracks all inventory movements (in, out, adjustments, transfers)
"""
import uuid
import enum
from sqlalchemy import Column, String, Text, Numeric, ForeignKey, DateTime, Enum, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class MovementType(str, enum.Enum):
    """Types of stock movements"""
    STOCK_IN = "stock_in"  # Receiving stock (purchase, return from customer)
    STOCK_OUT = "stock_out"  # Removing stock (sale, return to supplier, wastage)
    ADJUSTMENT = "adjustment"  # Manual adjustment (increase or decrease)
    TRANSFER = "transfer"  # Transfer between warehouses


class StockMovement(Base):
    """Records all stock movements for audit trail"""
    __tablename__ = "stock_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Movement details
    movement_type = Column(Enum(MovementType), nullable=False, index=True)
    movement_date = Column(Date, nullable=False, server_default=func.current_date(), index=True)

    # Product and location
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    warehouse_id = Column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # For transfers
    to_warehouse_id = Column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    # Quantity (positive for IN, negative for OUT)
    quantity = Column(Numeric(10, 2), nullable=False)

    # Cost tracking
    unit_cost = Column(Numeric(15, 2), nullable=True)  # Cost per unit at time of movement
    total_cost = Column(Numeric(15, 2), nullable=True)  # Total value of movement

    # Reference documents
    reference_type = Column(String(50), nullable=True)  # "invoice", "purchase_order", "adjustment", etc.
    reference_id = Column(UUID(as_uuid=True), nullable=True)  # ID of related document
    reference_number = Column(String(100), nullable=True)  # Document number for display

    # Additional info
    notes = Column(Text, nullable=True)
    reason = Column(String(255), nullable=True)  # Reason for adjustment/wastage

    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    product = relationship("Product")
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id])
    to_warehouse = relationship("Warehouse", foreign_keys=[to_warehouse_id])

    def __repr__(self):
        return f"<StockMovement(id={self.id}, type={self.movement_type}, qty={self.quantity})>"
