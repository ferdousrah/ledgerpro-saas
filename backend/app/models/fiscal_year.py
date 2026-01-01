"""
Financial Year Management Models
Handles fiscal periods, year closing, and historical balance snapshots
"""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum, ForeignKey, Integer, Numeric, Text, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, date
import uuid
import enum

from ..database import Base


class FinancialYearStatus(str, enum.Enum):
    """Status of financial year"""
    OPEN = "open"
    CLOSED = "closed"


class YearClosingAction(str, enum.Enum):
    """Actions performed on financial year"""
    CLOSE = "close"
    REOPEN = "reopen"
    RECALCULATE = "recalculate"


class FinancialYear(Base):
    """Financial year periods for organizing transactions"""
    __tablename__ = "financial_years"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Year identification
    year_name = Column(String(50), nullable=False)  # "FY 2024-2025"
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)

    # Status
    status = Column(Enum(FinancialYearStatus), nullable=False, default=FinancialYearStatus.OPEN, index=True)
    is_current = Column(Boolean, nullable=False, default=False, index=True)

    # Closing information
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Validation flags
    has_uncategorized_transactions = Column(Boolean, nullable=False, default=False)
    total_transactions_count = Column(Integer, nullable=False, default=0)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    transactions = relationship("Transaction", back_populates="fiscal_year")
    invoices = relationship("Invoice", back_populates="fiscal_year")
    account_year_balances = relationship("AccountYearBalance", back_populates="financial_year", cascade="all, delete-orphan")
    closing_audits = relationship("YearClosingAudit", back_populates="financial_year", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint('end_date > start_date', name='financial_years_valid_date_range'),
    )


class AccountYearBalance(Base):
    """Historical snapshots of account balances at year-end"""
    __tablename__ = "account_year_balances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    financial_year_id = Column(UUID(as_uuid=True), ForeignKey("financial_years.id", ondelete="CASCADE"), nullable=False, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("money_accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # Balance snapshots
    opening_balance = Column(Numeric(15, 2), nullable=False, default=0)
    closing_balance = Column(Numeric(15, 2), nullable=False, default=0)

    # Transaction summaries
    total_income = Column(Numeric(15, 2), nullable=False, default=0)
    total_expense = Column(Numeric(15, 2), nullable=False, default=0)
    transaction_count = Column(Integer, nullable=False, default=0)

    # Snapshot metadata
    snapshot_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_final = Column(Boolean, nullable=False, default=False, index=True)

    # Recalculation tracking
    last_recalculated_at = Column(DateTime, nullable=True)
    recalculation_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    financial_year = relationship("FinancialYear", back_populates="account_year_balances")
    account = relationship("MoneyAccount")


class YearClosingAudit(Base):
    """Audit trail for year closing operations"""
    __tablename__ = "year_closing_audit"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    financial_year_id = Column(UUID(as_uuid=True), ForeignKey("financial_years.id", ondelete="CASCADE"), nullable=False, index=True)

    # Closing action
    action = Column(String(20), nullable=False)

    # Snapshot
    balance_snapshot = Column(JSONB, nullable=False)

    # Metadata
    performed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)
    performed_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    reason = Column(Text, nullable=True)

    # Stats
    total_accounts = Column(Integer, nullable=False)
    total_transactions = Column(Integer, nullable=False)

    # Relationships
    financial_year = relationship("FinancialYear", back_populates="closing_audits")
