from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import date, datetime
from uuid import UUID
from ..models.auth import AccountingType, SubscriptionPlan, UserRole, SubscriptionStatus


# ============= REGISTRATION SCHEMAS =============

class RegistrationStep1(BaseModel):
    """Step 1: Choose accounting type (LOCKED FOREVER!)"""
    accounting_type: AccountingType


class RegistrationStep2(BaseModel):
    """Step 2: Company Information"""
    company_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: Optional[str] = None


class RegistrationStep3(BaseModel):
    """Step 3: Admin User"""
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class RegistrationStep4(BaseModel):
    """Step 4: Preferences"""
    currency: str = Field(default="USD", max_length=10)
    fiscal_year_start: date
    timezone: str = Field(default="UTC", max_length=50)


class RegistrationStep5(BaseModel):
    """Step 5: Plan Selection"""
    plan: SubscriptionPlan
    billing_cycle: str = Field(default="monthly")


class RegistrationComplete(BaseModel):
    """Complete Registration - All Steps Combined"""
    # Step 1
    accounting_type: AccountingType

    # Step 2
    company_name: str = Field(..., min_length=2, max_length=255)
    company_email: EmailStr
    phone: Optional[str] = None

    # Step 3
    admin_name: str = Field(..., min_length=2, max_length=255)
    admin_email: EmailStr
    password: str = Field(..., min_length=8)

    # Step 4
    currency: str = Field(default="USD", max_length=10)
    fiscal_year_start: date
    timezone: str = Field(default="UTC", max_length=50)

    # Step 5
    plan: SubscriptionPlan


# ============= TENANT SCHEMAS =============

class TenantBase(BaseModel):
    company_name: str
    email: EmailStr
    phone: Optional[str] = None
    currency: str = "USD"
    fiscal_year_start: date
    timezone: str = "UTC"


class TenantCreate(TenantBase):
    accounting_type: AccountingType


class TenantResponse(TenantBase):
    id: UUID
    accounting_type: AccountingType
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ============= USER SCHEMAS =============

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.ADMIN


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    tenant_id: UUID


class UserResponse(UserBase):
    id: UUID
    tenant_id: UUID
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============= AUTH SCHEMAS =============

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    tenant: TenantResponse


class TokenData(BaseModel):
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None


# ============= SUBSCRIPTION SCHEMAS =============

class SubscriptionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    plan: SubscriptionPlan
    status: SubscriptionStatus
    start_date: date
    end_date: date
    amount: float

    class Config:
        from_attributes = True


# ============= UPDATE SCHEMAS =============

class UserProfileUpdate(BaseModel):
    """Update user profile (name and email)"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None


class UserPasswordUpdate(BaseModel):
    """Update user password"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class TenantSettingsUpdate(BaseModel):
    """Update tenant settings (company name and currency)"""
    company_name: Optional[str] = Field(None, min_length=2, max_length=255)
    currency: Optional[str] = Field(None, max_length=10)
