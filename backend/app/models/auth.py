from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum
from ..database import Base


class AccountingType(str, enum.Enum):
    SINGLE = "single"
    DOUBLE = "double"


class SubscriptionStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class SubscriptionPlan(str, enum.Enum):
    # Single Entry Plans
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"

    # Double Entry Plans
    STARTER = "starter"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentProvider(str, enum.Enum):
    PAYPAL = "paypal"
    STRIPE = "stripe"
    BKASH = "bkash"
    MANUAL = "manual"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ACCOUNTANT = "accountant"
    VIEWER = "viewer"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50))

    # CRITICAL: This is LOCKED after registration
    accounting_type = Column(Enum(AccountingType), nullable=False)

    # Preferences
    currency = Column(String(10), default="USD")
    fiscal_year_start = Column(Date, nullable=False)
    timezone = Column(String(50), default="UTC")

    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    role = Column(Enum(UserRole), default=UserRole.ADMIN)
    is_active = Column(Boolean, default=True)

    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    plan = Column(Enum(SubscriptionPlan), nullable=False)
    billing_cycle = Column(Enum(BillingCycle), default=BillingCycle.MONTHLY)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)

    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    amount = Column(Numeric(10, 2), default=0.00)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    tenant = relationship("Tenant", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)

    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), default="USD")

    provider = Column(Enum(PaymentProvider), nullable=False)
    provider_txn_id = Column(String(255), nullable=True)

    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)

    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    subscription = relationship("Subscription", back_populates="payments")
