"""
Product Warehouse Stock Model
Tracks current stock levels for each product in each warehouse
"""
import uuid
from sqlalchemy import Column, Numeric, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class ProductWarehouseStock(Base):
    """Current stock levels per product per warehouse"""
    __tablename__ = "product_warehouse_stock"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Product and warehouse
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

    # Stock quantities
    quantity = Column(Numeric(10, 2), nullable=False, default=0)  # Current available stock
    reserved_quantity = Column(Numeric(10, 2), nullable=False, default=0)  # Reserved for orders

    # Calculated field: available = quantity - reserved_quantity
    @property
    def available_quantity(self):
        return float(self.quantity) - float(self.reserved_quantity)

    # Audit fields
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    product = relationship("Product")
    warehouse = relationship("Warehouse")

    # Ensure one record per product per warehouse
    __table_args__ = (
        UniqueConstraint('tenant_id', 'product_id', 'warehouse_id', name='uix_product_warehouse_stock'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f"<ProductWarehouseStock(product_id={self.product_id}, warehouse_id={self.warehouse_id}, qty={self.quantity})>"
