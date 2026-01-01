"""
Pydantic Schemas for Invoice and Billing
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

from ..models.invoice import InvoiceStatus, PaymentTerms, PaymentMethod
from ..models.single_entry import RecurrenceFrequency


# ============ Invoice Line Item Schemas ============
class InvoiceLineItemBase(BaseModel):
    line_number: int = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    category_id: Optional[UUID] = None


class InvoiceLineItemCreate(InvoiceLineItemBase):
    """Schema for creating invoice line items"""
    pass


class InvoiceLineItemUpdate(BaseModel):
    """Schema for updating invoice line items"""
    line_number: Optional[int] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1)
    quantity: Optional[Decimal] = Field(None, gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    category_id: Optional[UUID] = None


class InvoiceLineItemResponse(BaseModel):
    """Schema for invoice line item responses"""
    id: UUID
    tenant_id: UUID
    invoice_id: UUID
    line_number: int
    description: str
    quantity: float
    unit_price: float
    subtotal: float
    tax_rate_percentage: Optional[float] = None
    tax_amount: float
    line_total: float
    category_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceLineItemWithDetails(InvoiceLineItemResponse):
    """Line item with related entity names"""
    pass
    category_name: Optional[str] = None


# ============ Invoice Schemas ============
class InvoiceBase(BaseModel):
    customer_id: UUID
    invoice_date: date
    payment_terms: PaymentTerms = PaymentTerms.net_30
    custom_payment_terms_days: Optional[int] = Field(None, gt=0)
    discount_amount: Decimal = Field(default=0.00, ge=0)  # Discount applied to invoice
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    footer_text: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)

    @validator('custom_payment_terms_days')
    def validate_custom_terms(cls, v, values):
        """Ensure custom_payment_terms_days is provided when payment_terms is CUSTOM"""
        payment_terms = values.get('payment_terms')
        if payment_terms == PaymentTerms.custom and v is None:
            raise ValueError('custom_payment_terms_days is required when payment_terms is CUSTOM')
        return v


class InvoiceCreate(InvoiceBase):
    """Schema for creating invoices"""
    line_items: List[InvoiceLineItemCreate] = Field(..., min_items=1)


class InvoiceUpdate(BaseModel):
    """Schema for updating invoices (only DRAFT or SENT allowed)"""
    customer_id: Optional[UUID] = None
    invoice_date: Optional[date] = None
    payment_terms: Optional[PaymentTerms] = None
    custom_payment_terms_days: Optional[int] = Field(None, gt=0)
    discount_amount: Optional[Decimal] = Field(None, ge=0)  # Discount applied to invoice
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    footer_text: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    line_items: Optional[List[InvoiceLineItemCreate]] = None


class InvoiceResponse(BaseModel):
    """Schema for invoice responses"""
    id: UUID
    tenant_id: UUID
    invoice_number: str
    customer_id: UUID
    invoice_date: date
    due_date: date
    payment_terms: PaymentTerms
    custom_payment_terms_days: Optional[int] = None
    status: InvoiceStatus
    subtotal: float
    discount_amount: float
    total_tax: float
    total_amount: float
    total_paid: float
    balance_due: float
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    footer_text: Optional[str] = None
    reference_number: Optional[str] = None
    fiscal_year_id: Optional[UUID] = None
    recurring_invoice_id: Optional[UUID] = None
    pdf_url: Optional[str] = None
    last_pdf_generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    sent_at: Optional[datetime] = None
    sent_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class InvoiceWithDetails(InvoiceResponse):
    """Invoice with line items and customer details"""
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    line_items: List[InvoiceLineItemWithDetails] = []
    payments_count: Optional[int] = 0


class InvoiceStats(BaseModel):
    """Dashboard statistics for invoices"""
    total_invoices: int
    draft_count: int
    sent_count: int
    paid_count: int
    overdue_count: int
    total_outstanding: float
    total_paid_this_month: float


# ============ Invoice Payment Schemas ============
class InvoicePaymentBase(BaseModel):
    payment_date: date
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    account_id: UUID
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class InvoicePaymentCreate(InvoicePaymentBase):
    """Schema for recording invoice payments"""
    pass

    @validator('amount')
    def validate_payment_amount(cls, v):
        """Ensure payment amount is positive"""
        if v <= 0:
            raise ValueError('Payment amount must be greater than zero')
        return v


class InvoicePaymentUpdate(BaseModel):
    """Schema for updating invoice payments"""
    payment_date: Optional[date] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    payment_method: Optional[PaymentMethod] = None
    account_id: Optional[UUID] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


class InvoicePaymentResponse(BaseModel):
    """Schema for invoice payment responses"""
    id: UUID
    tenant_id: UUID
    invoice_id: UUID
    payment_date: date
    amount: float
    payment_method: PaymentMethod
    transaction_id: Optional[UUID] = None
    account_id: UUID
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class InvoicePaymentWithDetails(InvoicePaymentResponse):
    """Payment with account details"""
    account_name: Optional[str] = None
    invoice_number: Optional[str] = None


# ============ Recurring Invoice Line Item Schemas ============
class RecurringInvoiceLineItemBase(BaseModel):
    line_number: int = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    quantity: Decimal = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    category_id: Optional[UUID] = None


class RecurringInvoiceLineItemCreate(RecurringInvoiceLineItemBase):
    """Schema for creating recurring invoice line items"""
    pass


class RecurringInvoiceLineItemResponse(BaseModel):
    """Schema for recurring invoice line item responses"""
    id: UUID
    tenant_id: UUID
    recurring_invoice_id: UUID
    line_number: int
    description: str
    quantity: float
    unit_price: float
    category_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Recurring Invoice Schemas ============
class RecurringInvoiceBase(BaseModel):
    template_name: str = Field(..., min_length=1, max_length=255)
    customer_id: UUID
    frequency: RecurrenceFrequency
    start_date: date
    end_date: Optional[date] = None
    payment_terms: PaymentTerms = PaymentTerms.net_30
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    is_active: bool = True

    @validator('end_date')
    def validate_end_date(cls, v, values):
        """Ensure end_date is after start_date"""
        start_date = values.get('start_date')
        if v and start_date and v < start_date:
            raise ValueError('end_date must be after start_date')
        return v


class RecurringInvoiceCreate(RecurringInvoiceBase):
    """Schema for creating recurring invoice templates"""
    line_items: List[RecurringInvoiceLineItemCreate] = Field(..., min_items=1)


class RecurringInvoiceUpdate(BaseModel):
    """Schema for updating recurring invoice templates"""
    template_name: Optional[str] = Field(None, min_length=1, max_length=255)
    customer_id: Optional[UUID] = None
    frequency: Optional[RecurrenceFrequency] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    payment_terms: Optional[PaymentTerms] = None
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    is_active: Optional[bool] = None
    line_items: Optional[List[RecurringInvoiceLineItemCreate]] = None


class RecurringInvoiceResponse(BaseModel):
    """Schema for recurring invoice responses"""
    id: UUID
    tenant_id: UUID
    template_name: str
    customer_id: UUID
    frequency: RecurrenceFrequency
    start_date: date
    end_date: Optional[date] = None
    next_invoice_date: date
    last_generated_date: Optional[date] = None
    payment_terms: PaymentTerms
    notes: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class RecurringInvoiceWithDetails(RecurringInvoiceResponse):
    """Recurring invoice with line items and customer details"""
    customer_name: Optional[str] = None
    line_items: List[RecurringInvoiceLineItemResponse] = []
    generated_invoices_count: Optional[int] = 0
