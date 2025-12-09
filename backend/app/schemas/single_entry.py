"""
Pydantic Schemas for Single Entry Accounting
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

from ..models.single_entry import AccountType, TransactionType, RecurrenceFrequency, PartnerCategory


# ============ Money Account Schemas ============
class MoneyAccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    account_type: AccountType
    account_number: Optional[str] = Field(None, max_length=100)
    bank_name: Optional[str] = Field(None, max_length=255)
    opening_balance: Decimal = Field(default=Decimal("0.00"), ge=0)
    description: Optional[str] = None
    is_active: bool = True


class MoneyAccountCreate(MoneyAccountBase):
    pass


class MoneyAccountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    account_number: Optional[str] = Field(None, max_length=100)
    bank_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = None


class MoneyAccountResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    account_type: AccountType
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    opening_balance: float
    current_balance: float
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Category Schemas ============
class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    transaction_type: TransactionType
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')  # Hex color
    icon: Optional[str] = Field(None, max_length=50)
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class CategoryResponse(CategoryBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Transaction Schemas ============
class TransactionBase(BaseModel):
    account_id: UUID
    category_id: Optional[UUID] = None
    partner_id: Optional[UUID] = None
    transaction_type: TransactionType
    amount: Decimal = Field(..., gt=0)
    transaction_date: date
    description: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    attachment_url: Optional[str] = Field(None, max_length=500)


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    account_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    partner_id: Optional[UUID] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    transaction_date: Optional[date] = None
    description: Optional[str] = None
    reference_number: Optional[str] = Field(None, max_length=100)
    attachment_url: Optional[str] = Field(None, max_length=500)


class TransactionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    account_id: UUID
    category_id: Optional[UUID] = None
    partner_id: Optional[UUID] = None
    transaction_type: TransactionType
    amount: float
    transaction_date: date
    description: Optional[str] = None
    reference_number: Optional[str] = None
    attachment_url: Optional[str] = None
    is_recurring: bool
    recurring_transaction_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID]

    class Config:
        from_attributes = True


class TransactionWithDetails(TransactionResponse):
    """Transaction with account and category details"""
    account_name: Optional[str] = None
    category_name: Optional[str] = None
    partner_name: Optional[str] = None


# ============ Recurring Transaction Schemas ============
class RecurringTransactionBase(BaseModel):
    account_id: UUID
    category_id: Optional[UUID] = None
    transaction_type: TransactionType
    amount: Decimal = Field(..., gt=0)
    description: Optional[str] = None
    frequency: RecurrenceFrequency
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True

    @validator('end_date')
    def end_date_after_start_date(cls, v, values):
        if v and 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class RecurringTransactionCreate(RecurringTransactionBase):
    pass


class RecurringTransactionUpdate(BaseModel):
    account_id: Optional[UUID] = None
    category_id: Optional[UUID] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    description: Optional[str] = None
    frequency: Optional[RecurrenceFrequency] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringTransactionResponse(RecurringTransactionBase):
    id: UUID
    tenant_id: UUID
    last_generated_date: Optional[date]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Dashboard & Reports Schemas ============
class DashboardStats(BaseModel):
    """Statistics for dashboard"""
    total_income: float
    total_expense: float
    net_balance: float
    active_accounts: int
    total_transactions: int


class AccountBalanceSummary(BaseModel):
    """Account balance summary for reports"""
    account_id: UUID
    account_name: str
    account_type: AccountType
    current_balance: Decimal


class CategorySummary(BaseModel):
    """Category-wise summary for reports"""
    category_id: Optional[UUID]
    category_name: str
    transaction_type: TransactionType
    total_amount: Decimal
    transaction_count: int


class MonthlyTrend(BaseModel):
    """Monthly income/expense trend"""
    month: str  # Format: YYYY-MM
    income: Decimal
    expense: Decimal
    net: Decimal


# ============ Tax Rate Schemas ============
class TaxRateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    rate: Decimal = Field(..., ge=0, le=100)  # Percentage (0-100)
    description: Optional[str] = None
    applies_to_income: bool = False
    applies_to_expense: bool = False
    is_active: bool = True


class TaxRateCreate(TaxRateBase):
    pass


class TaxRateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    rate: Optional[Decimal] = Field(None, ge=0, le=100)
    description: Optional[str] = None
    applies_to_income: Optional[bool] = None
    applies_to_expense: Optional[bool] = None
    is_active: Optional[bool] = None


class TaxRateResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    rate: float
    description: Optional[str] = None
    applies_to_income: bool
    applies_to_expense: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ Partner Schemas ============
class PartnerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    category: Literal['customer', 'vendor', 'employee', 'other']  # Use string literal instead of enum

    # Company/Vendor/Customer fields
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=100)
    registration_number: Optional[str] = Field(None, max_length=100)

    # Contact person (for companies)
    contact_person_name: Optional[str] = Field(None, max_length=255)
    contact_person_email: Optional[str] = Field(None, max_length=255)
    contact_person_mobile: Optional[str] = Field(None, max_length=50)

    # Employee-specific fields
    employee_id: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=255)

    # Employee Personal Details
    nationality: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    nid_passport_no: Optional[str] = Field(None, max_length=100)
    blood_group: Optional[str] = Field(None, max_length=10)
    photo_url: Optional[str] = Field(None, max_length=500)

    # Employee Address Details
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    # Employee Emergency Contact
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_relationship: Optional[str] = Field(None, max_length=100)

    # Employee Employment Details
    employment_type: Optional[str] = Field(None, max_length=50)
    joining_date: Optional[date] = None
    end_date: Optional[date] = None

    # Common fields
    description: Optional[str] = None
    is_active: bool = True


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[Literal['customer', 'vendor', 'employee', 'other']] = None

    # Company/Vendor/Customer fields
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=100)
    registration_number: Optional[str] = Field(None, max_length=100)

    # Contact person (for companies)
    contact_person_name: Optional[str] = Field(None, max_length=255)
    contact_person_email: Optional[str] = Field(None, max_length=255)
    contact_person_mobile: Optional[str] = Field(None, max_length=50)

    # Employee-specific fields
    employee_id: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=255)
    department: Optional[str] = Field(None, max_length=255)

    # Employee Personal Details
    nationality: Optional[str] = Field(None, max_length=100)
    date_of_birth: Optional[date] = None
    nid_passport_no: Optional[str] = Field(None, max_length=100)
    blood_group: Optional[str] = Field(None, max_length=10)
    photo_url: Optional[str] = Field(None, max_length=500)

    # Employee Address Details
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    # Employee Emergency Contact
    emergency_contact_name: Optional[str] = Field(None, max_length=255)
    emergency_contact_phone: Optional[str] = Field(None, max_length=50)
    emergency_contact_relationship: Optional[str] = Field(None, max_length=100)

    # Employee Employment Details
    employment_type: Optional[str] = Field(None, max_length=50)
    joining_date: Optional[date] = None
    end_date: Optional[date] = None

    # Common fields
    description: Optional[str] = None
    is_active: Optional[bool] = None


class PartnerResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    category: PartnerCategory

    # Company/Vendor/Customer fields
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    registration_number: Optional[str] = None

    # Contact person (for companies)
    contact_person_name: Optional[str] = None
    contact_person_email: Optional[str] = None
    contact_person_mobile: Optional[str] = None

    # Employee-specific fields
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None

    # Employee Personal Details
    nationality: Optional[str] = None
    date_of_birth: Optional[date] = None
    nid_passport_no: Optional[str] = None
    blood_group: Optional[str] = None
    photo_url: Optional[str] = None

    # Employee Address Details
    present_address: Optional[str] = None
    permanent_address: Optional[str] = None

    # Employee Emergency Contact
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None

    # Employee Employment Details
    employment_type: Optional[str] = None
    joining_date: Optional[date] = None
    end_date: Optional[date] = None

    # Common fields
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
 
