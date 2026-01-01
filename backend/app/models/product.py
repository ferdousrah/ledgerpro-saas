"""
Product/Service Models
Database models for managing products and services catalog
"""
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from ..database import Base


class ProductType(str, enum.Enum):
    """Type of product/service"""
    product = "product"
    service = "service"


class Product(Base):
    """Products and services catalog for invoicing"""
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Product details
    name = Column(String(255), nullable=False)
    product_type = Column(Enum(ProductType), nullable=False, default=ProductType.service)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=True)  # Stock keeping unit / product code

    # Pricing
    unit_price = Column(Numeric(15, 2), nullable=False)
    cost_price = Column(Numeric(15, 2), nullable=True)  # For profit calculations

    # Tax and category defaults
    tax_rate_id = Column(UUID(as_uuid=True), ForeignKey("tax_rates.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)  # Transaction category
    product_category_id = Column(UUID(as_uuid=True), ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True, index=True)  # Catalog category

    # Stock tracking (optional, for products)
    track_inventory = Column(Boolean, nullable=False, default=False)
    stock_quantity = Column(Numeric(10, 2), nullable=True)  # Current stock level
    low_stock_threshold = Column(Numeric(10, 2), nullable=True)  # Alert threshold

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    tax_rate = relationship("TaxRate")
    category = relationship("Category")  # Transaction category
    product_category = relationship("ProductCategory")  # Catalog category
