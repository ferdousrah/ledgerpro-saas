from sqlalchemy import Column, String, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
import enum
from app.database import Base


class ActivityType(str, enum.Enum):
    # Auth activities
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    REGISTER = "REGISTER"

    # CRUD operations
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    VIEW = "VIEW"

    # Other activities
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    SETTINGS_CHANGE = "SETTINGS_CHANGE"


class ActivityEntity(str, enum.Enum):
    USER = "USER"
    TENANT = "TENANT"
    ACCOUNT = "ACCOUNT"
    CATEGORY = "CATEGORY"
    TRANSACTION = "TRANSACTION"
    PARTNER = "PARTNER"
    FINANCIAL_YEAR = "FINANCIAL_YEAR"
    SETTINGS = "SETTINGS"
    INVOICE = "INVOICE"
    INVOICE_PAYMENT = "INVOICE_PAYMENT"
    RECURRING_INVOICE = "RECURRING_INVOICE"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Activity details
    activity_type = Column(SQLEnum(ActivityType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    entity_type = Column(SQLEnum(ActivityEntity, values_callable=lambda x: [e.value for e in x]), nullable=False)
    entity_id = Column(String, nullable=True)  # ID of the affected entity
    entity_name = Column(String, nullable=True)  # Name/description of the entity

    # Details and metadata
    description = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    tenant = relationship("Tenant", back_populates="activity_logs")
    user = relationship("User", back_populates="activity_logs")

    def __repr__(self):
        return f"<ActivityLog {self.activity_type} - {self.entity_type} by {self.user_id}>"
