from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date as dt_date
from uuid import UUID

from ...database import get_db
from ...schemas.auth import (
    RegistrationComplete,
    UserLogin,
    TokenResponse,
    UserResponse,
    TenantResponse,
    UserProfileUpdate,
    UserPasswordUpdate,
    TenantSettingsUpdate,
)
from ...models.auth import (
    Tenant,
    User,
    Subscription,
    AccountingType,
    SubscriptionPlan,
    SubscriptionStatus,
)
from ...core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
)
from ...config import settings
from ..deps import get_current_user

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(registration: RegistrationComplete, db: Session = Depends(get_db)):
    """
    Register new tenant with all 6 steps:
    1. Choose accounting type (LOCKED FOREVER)
    2. Company info
    3. Admin user
    4. Preferences
    5. Plan selection
    6. Complete registration
    """

    # Check if company email already exists
    existing_tenant = db.query(Tenant).filter(Tenant.email == registration.company_email).first()
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company email already registered"
        )

    # Check if admin email already exists
    existing_user = db.query(User).filter(User.email == registration.admin_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin email already registered"
        )

    # Validate plan matches accounting type
    single_plans = [SubscriptionPlan.FREE, SubscriptionPlan.BASIC, SubscriptionPlan.PRO]
    double_plans = [SubscriptionPlan.STARTER, SubscriptionPlan.BUSINESS, SubscriptionPlan.ENTERPRISE]

    if registration.accounting_type == AccountingType.SINGLE and registration.plan not in single_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan for Single Entry accounting. Choose from: {[p.value for p in single_plans]}"
        )

    if registration.accounting_type == AccountingType.DOUBLE and registration.plan not in double_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan for Double Entry accounting. Choose from: {[p.value for p in double_plans]}"
        )

    # Create tenant
    tenant = Tenant(
        company_name=registration.company_name,
        email=registration.company_email,
        phone=registration.phone,
        accounting_type=registration.accounting_type,  # LOCKED FOREVER
        currency=registration.currency,
        fiscal_year_start=registration.fiscal_year_start,
        timezone=registration.timezone,
        is_active=True,
    )
    db.add(tenant)
    db.flush()  # Get tenant ID

    # Create admin user
    hashed_password = get_password_hash(registration.password)
    admin_user = User(
        tenant_id=tenant.id,
        name=registration.admin_name,
        email=registration.admin_email,
        password_hash=hashed_password,
        role="admin",
        is_active=True,
    )
    db.add(admin_user)
    db.flush()  # Get user ID

    # Create subscription
    # Determine pricing
    plan_pricing = {
        SubscriptionPlan.FREE: 0,
        SubscriptionPlan.BASIC: 5,
        SubscriptionPlan.PRO: 12,
        SubscriptionPlan.STARTER: 15,
        SubscriptionPlan.BUSINESS: 35,
        SubscriptionPlan.ENTERPRISE: 75,
    }

    amount = plan_pricing.get(registration.plan, 0)

    # Start date is today, end date is trial period or 1 month
    start_date = dt_date.today()
    if registration.plan == SubscriptionPlan.FREE:
        # Free plan is permanent
        end_date = start_date + timedelta(days=365 * 100)  # 100 years
        subscription_status = SubscriptionStatus.ACTIVE
    else:
        # Paid plans get trial period
        end_date = start_date + timedelta(days=settings.TRIAL_DAYS)
        subscription_status = SubscriptionStatus.TRIAL

    subscription = Subscription(
        tenant_id=tenant.id,
        plan=registration.plan,
        billing_cycle="monthly",
        start_date=start_date,
        end_date=end_date,
        status=subscription_status,
        amount=amount,
    )
    db.add(subscription)

    # Commit all changes
    db.commit()
    db.refresh(tenant)
    db.refresh(admin_user)
    db.refresh(subscription)

    # Create tokens
    access_token = create_access_token(data={"sub": str(admin_user.id), "tenant_id": str(tenant.id)})
    refresh_token = create_refresh_token(data={"sub": str(admin_user.id), "tenant_id": str(tenant.id)})

    # Return response
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.from_orm(admin_user),
        tenant=TenantResponse.from_orm(tenant),
    )


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login with email and password
    Returns access token, refresh token, user info, and tenant info
    """

    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    # Check if user exists and password is correct
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Get tenant
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    # Check if tenant is active
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant account is inactive. Please contact support.",
        )

    # Check subscription status
    active_subscription = (
        db.query(Subscription)
        .filter(
            Subscription.tenant_id == tenant.id,
            Subscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
            Subscription.end_date >= dt_date.today(),
        )
        .first()
    )

    if not active_subscription:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Subscription expired. Please renew your subscription.",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id), "tenant_id": str(tenant.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "tenant_id": str(tenant.id)})

    # Return response
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.from_orm(user),
        tenant=TenantResponse.from_orm(tenant),
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse.from_orm(current_user)


@router.post("/logout")
def logout():
    """
    Logout endpoint
    Note: With JWT, actual logout is handled on the client side by removing the token
    This endpoint is here for consistency and can be used for logging/analytics
    """
    return {"message": "Successfully logged out"}


@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current user's profile (name and email)
    """
    # Check if email is being changed and if it's already taken
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(User).filter(User.email == profile_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        current_user.email = profile_data.email

    # Update name if provided
    if profile_data.name:
        current_user.name = profile_data.name

    db.commit()
    db.refresh(current_user)

    return UserResponse.from_orm(current_user)


@router.put("/password")
def update_password(
    password_data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current user's password
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Hash and update new password
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


@router.put("/tenant-settings", response_model=TenantResponse)
def update_tenant_settings(
    settings_data: TenantSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update tenant settings (company name and currency)
    Only admin users can update tenant settings
    """
    # Get the tenant
    tenant = db.query(Tenant).filter(Tenant.id == current_user.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found",
        )

    # Check if user is admin (optional: add role-based access control)
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can update tenant settings",
        )

    # Update company name if provided
    if settings_data.company_name:
        tenant.company_name = settings_data.company_name

    # Update currency if provided
    if settings_data.currency:
        tenant.currency = settings_data.currency

    db.commit()
    db.refresh(tenant)

    return TenantResponse.from_orm(tenant)
