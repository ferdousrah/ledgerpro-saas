"""
Invoice and Billing Models
Database models for invoices, payments, and recurring invoice templates
"""
from sqlalchemy import Column, String, Boolean, DateTime, Date, Enum, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from ..database import Base
from .single_entry import RecurrenceFrequency


class InvoiceStatus(str, enum.Enum):
    """Status for invoices"""
    draft = "draft"
    sent = "sent"
    partially_paid = "partially_paid"
    paid = "paid"
    overdue = "overdue"
    cancelled = "cancelled"


class PaymentTerms(str, enum.Enum):
    """Payment terms for invoices"""
    due_on_receipt = "due_on_receipt"
    net_15 = "net_15"
    net_30 = "net_30"
    net_60 = "net_60"
    net_90 = "net_90"
    custom = "custom"


class PaymentMethod(str, enum.Enum):
    """Payment methods for invoice payments"""
    cash = "cash"
    bank_transfer = "bank_transfer"
    check = "check"
    credit_card = "credit_card"
    mobile_money = "mobile_money"
    other = "other"


class Invoice(Base):
    """Sales invoices for tracking customer billing and payments"""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Invoice identification
    invoice_number = Column(String(50), nullable=False, unique=True)  # e.g., "INV-2024-0001"

    # Customer (required - sales invoice only)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("partners.id", ondelete="RESTRICT"), nullable=False, index=True)

    # Dates
    invoice_date = Column(Date, nullable=False, index=True)
    due_date = Column(Date, nullable=False, index=True)
    payment_terms = Column(Enum(PaymentTerms), nullable=False, default=PaymentTerms.net_30)
    custom_payment_terms_days = Column(Integer, nullable=True)  # Used when payment_terms = 'custom'

    # Status
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.draft, index=True)

    # Financial totals (calculated from line items)
    subtotal = Column(Numeric(15, 2), nullable=False, default=0.00)
    discount_amount = Column(Numeric(15, 2), nullable=False, default=0.00)  # Discount applied to invoice
    total_tax = Column(Numeric(15, 2), nullable=False, default=0.00)
    total_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    total_paid = Column(Numeric(15, 2), nullable=False, default=0.00)
    balance_due = Column(Numeric(15, 2), nullable=False, default=0.00)

    # Invoice details
    notes = Column(Text, nullable=True)  # Internal notes
    terms_and_conditions = Column(Text, nullable=True)  # Customer-facing terms
    footer_text = Column(Text, nullable=True)  # Footer message on invoice

    # References
    reference_number = Column(String(100), nullable=True)  # PO number, project code, etc.
    fiscal_year_id = Column(UUID(as_uuid=True), ForeignKey("financial_years.id", ondelete="RESTRICT"), nullable=True, index=True)

    # Recurring invoice link
    recurring_invoice_id = Column(UUID(as_uuid=True), ForeignKey("recurring_invoices.id", ondelete="SET NULL"), nullable=True, index=True)

    # PDF storage
    pdf_url = Column(String(500), nullable=True)  # Path to generated PDF
    last_pdf_generated_at = Column(DateTime, nullable=True)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    sent_at = Column(DateTime, nullable=True)  # When status changed to 'sent'
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    customer = relationship("Partner", foreign_keys=[customer_id])
    fiscal_year = relationship("FinancialYear", back_populates="invoices")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("InvoicePayment", back_populates="invoice", cascade="all, delete-orphan")
    # recurring_invoice relationship added after RecurringInvoice model is defined


class InvoiceLineItem(Base):
    """Individual line items on invoices (products/services)"""
    __tablename__ = "invoice_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    # Line item details
    line_number = Column(Integer, nullable=False)  # Order in invoice (1, 2, 3...)
    description = Column(Text, nullable=False)  # Product/service description

    # Pricing
    quantity = Column(Numeric(10, 2), nullable=False, default=1.00)
    unit_price = Column(Numeric(15, 2), nullable=False)
    subtotal = Column(Numeric(15, 2), nullable=False)  # qty * unit_price

    # Tax (uses tenant's default tax rate)
    tax_rate_percentage = Column(Numeric(5, 2), nullable=True)  # Snapshot at creation (for historical accuracy)
    tax_amount = Column(Numeric(15, 2), nullable=False, default=0.00)

    # Total
    line_total = Column(Numeric(15, 2), nullable=False)  # subtotal + tax_amount

    # Optional categorization (for reporting)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="line_items")
    category = relationship("Category")


class InvoicePayment(Base):
    """Payment history for invoices (supports partial payments)"""
    __tablename__ = "invoice_payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    # Payment details
    payment_date = Column(Date, nullable=False, index=True)
    amount = Column(Numeric(15, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)

    # Transaction link (creates INCOME transaction when payment recorded)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True, index=True)
    account_id = Column(UUID(as_uuid=True), ForeignKey("money_accounts.id", ondelete="RESTRICT"), nullable=False, index=True)  # Where money was received

    # Reference
    reference_number = Column(String(100), nullable=True)  # Check number, transaction ID, etc.
    notes = Column(Text, nullable=True)

    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
    transaction = relationship("Transaction")
    account = relationship("MoneyAccount")


class RecurringInvoice(Base):
    """Templates for automatically generating recurring invoices"""
    __tablename__ = "recurring_invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)

    # Template details
    template_name = Column(String(255), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("partners.id", ondelete="CASCADE"), nullable=False, index=True)

    # Recurrence settings
    frequency = Column(Enum(RecurrenceFrequency), nullable=False)  # daily, weekly, monthly, quarterly, yearly
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # NULL = no end date
    next_invoice_date = Column(Date, nullable=False, index=True)
    last_generated_date = Column(Date, nullable=True)

    # Invoice defaults
    payment_terms = Column(Enum(PaymentTerms), nullable=False, default=PaymentTerms.net_30)
    notes = Column(Text, nullable=True)
    terms_and_conditions = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, nullable=False, default=True, index=True)

    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    customer = relationship("Partner", foreign_keys=[customer_id])
    line_items = relationship("RecurringInvoiceLineItem", back_populates="recurring_invoice", cascade="all, delete-orphan")
    invoices = relationship("Invoice", foreign_keys="Invoice.recurring_invoice_id", back_populates="recurring_invoice")


class RecurringInvoiceLineItem(Base):
    """Template line items for recurring invoices"""
    __tablename__ = "recurring_invoice_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    recurring_invoice_id = Column(UUID(as_uuid=True), ForeignKey("recurring_invoices.id", ondelete="CASCADE"), nullable=False, index=True)

    # Line item details (tax uses tenant's default tax rate)
    line_number = Column(Integer, nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(10, 2), nullable=False, default=1.00)
    unit_price = Column(Numeric(15, 2), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)

    # Audit
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    recurring_invoice = relationship("RecurringInvoice", back_populates="line_items")
    category = relationship("Category")


# Add the recurring_invoice relationship to Invoice after RecurringInvoice is defined
Invoice.recurring_invoice = relationship("RecurringInvoice", foreign_keys=[Invoice.recurring_invoice_id], back_populates="invoices")
