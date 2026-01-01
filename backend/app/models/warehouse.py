"""
Warehouse/Location Models
Manages storage locations for inventory tracking
"""
import uuid
from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from ..database import Base


class Warehouse(Base):
    """Storage location/warehouse for inventory"""
    __tablename__ = "warehouses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Warehouse details
    name = Column(String(100), nullable=False)
    code = Column(String(20), nullable=True)  # Short code like "WH-001"
    description = Column(Text, nullable=True)

    # Location details
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)

    # Settings
    is_default = Column(Boolean, nullable=False, default=False)  # Default warehouse for new stock
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<Warehouse(id={self.id}, name='{self.name}', code='{self.code}')>"
