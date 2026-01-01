"""
Single Entry Accounting Models
Database models for money accounts, categories, and transactions
"""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from ..database import Base


class AccountType(str, enum.Enum):
    """Types of money accounts"""
    CASH = "cash"
    BANK = "bank"
    MOBILE_MONEY = "mobile_money"
    OTHER = "other"


class TransactionType(str, enum.Enum):
    """Transaction types for single entry"""
    INCOME = "income"
    EXPENSE = "expense"


class RecurrenceFrequency(str, enum.Enum):
    """Frequency for recurring transactions"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class PartnerCategory(str, enum.Enum):
    """Partner categories for business relationships"""
    CUSTOMER = "customer"
    VENDOR = "vendor"
    EMPLOYEE = "employee"
    OTHER = "other"


class MoneyAccount(Base):
    """Money accounts (Cash, Bank, etc.) for single entry accounting"""
    __tablename__ = "money_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)  # e.g., "Main Cash", "ABC Bank"
    account_type = Column(Enum(AccountType), nullable=False)
    account_number = Column(String(100), nullable=True)  # Bank account number
    bank_name = Column(String(255), nullable=True)  # For bank accounts

    opening_balance = Column(Numeric(15, 2), nullable=False, default=0)
    current_balance = Column(Numeric(15, 2), nullable=False, default=0)

    is_active = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Category(Base):
    """Categories for income and expense transactions"""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)  # INCOME or EXPENSE

    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # Hex color code like #FF5733
    icon = Column(String(50), nullable=True)  # Icon name for UI

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="category", cascade="all, delete-orphan")


class Partner(Base):
    """Business partners (customers, vendors, employees, etc.)"""
    __tablename__ = "partners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    category = Column(String(20), nullable=False, index=True)  # 'customer', 'vendor', 'employee', 'other'

    # Company/Vendor/Customer fields
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    tax_id = Column(String(100), nullable=True)
    registration_number = Column(String(100), nullable=True)

    # Contact person (for companies)
    contact_person_name = Column(String(255), nullable=True)
    contact_person_email = Column(String(255), nullable=True)
    contact_person_mobile = Column(String(50), nullable=True)

    # Employee-specific fields
    employee_id = Column(String(100), nullable=True)
    designation = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)

    # Employee Personal Details
    nationality = Column(String(100), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    nid_passport_no = Column(String(100), nullable=True)
    blood_group = Column(String(10), nullable=True)  # A+, B+, O+, etc.
    photo_url = Column(String(500), nullable=True)

    # Employee Address Details
    present_address = Column(Text, nullable=True)
    permanent_address = Column(Text, nullable=True)

    # Employee Emergency Contact
    emergency_contact_name = Column(String(255), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    emergency_contact_relationship = Column(String(100), nullable=True)

    # Employee Employment Details
    employment_type = Column(String(50), nullable=True)  # Full-time, Part-time, Contract, etc.
    joining_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)

    # Common fields
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="partner")


class Transaction(Base):
    """Income and expense transactions for single entry accounting"""
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("money_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    partner_id = Column(UUID(as_uuid=True), ForeignKey("partners.id", ondelete="SET NULL"), nullable=True, index=True)
    fiscal_year_id = Column(UUID(as_uuid=True), ForeignKey("financial_years.id", ondelete="RESTRICT"), nullable=True, index=True)

    transaction_type = Column(Enum(TransactionType), nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)

    transaction_date = Column(Date, nullable=False, index=True)
    description = Column(Text, nullable=True)
    reference_number = Column(String(100), nullable=True)  # Invoice/receipt number

    # Attachment support (store file path or URL)
    attachment_url = Column(String(500), nullable=True)

    # For recurring transactions
    is_recurring = Column(Boolean, default=False, nullable=False)
    recurring_transaction_id = Column(UUID(as_uuid=True), ForeignKey("recurring_transactions.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    account = relationship("MoneyAccount", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    partner = relationship("Partner", back_populates="transactions")
    recurring_transaction = relationship("RecurringTransaction", back_populates="transactions")
    fiscal_year = relationship("FinancialYear", back_populates="transactions")


class RecurringTransaction(Base):
    """Template for recurring transactions"""
    __tablename__ = "recurring_transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("money_accounts.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    transaction_type = Column(Enum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=True)

    frequency = Column(Enum(RecurrenceFrequency), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # NULL means no end date

    is_active = Column(Boolean, default=True, nullable=False)
    last_generated_date = Column(Date, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    transactions = relationship("Transaction", back_populates="recurring_transaction")


class TaxRate(Base):
    """Tax rates for income and expense transactions"""
    __tablename__ = "tax_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    name = Column(String(255), nullable=False)  # e.g., "Sales Tax", "VAT", "Income Tax"
    rate = Column(Numeric(5, 2), nullable=False)  # e.g., 15.00 for 15%
    description = Column(Text, nullable=True)

    # Applicable to which transaction types
    applies_to_income = Column(Boolean, default=False, nullable=False)
    applies_to_expense = Column(Boolean, default=False, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
