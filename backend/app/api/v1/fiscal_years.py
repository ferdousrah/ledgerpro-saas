"""
Financial Years API endpoints
Manages fiscal periods, year closing, and balance snapshots
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case
from typing import List, Optional
from uuid import UUID
from datetime import date

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.fiscal_year import FinancialYear, FinancialYearStatus, AccountYearBalance
from ...schemas.fiscal_year import (
    FinancialYearCreate,
    FinancialYearUpdate,
    FinancialYearResponse,
    FinancialYearWithStats,
    YearClosingRequest,
    YearClosingValidation,
    YearClosingResponse,
    AccountYearBalanceResponse,
    RecalculationResult,
)
from ..deps import get_current_user, get_current_tenant
from ...services.fiscal_year_service import FiscalYearService
from .activity_logs import log_activity

router = APIRouter()


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin users can perform this action"
        )
    return current_user


@router.get("/", response_model=List[FinancialYearResponse])
def list_financial_years(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    List all financial years for the current tenant
    Ordered by start_date descending (most recent first)
    """
    years = db.query(FinancialYear).filter(
        FinancialYear.tenant_id == current_tenant.id
    ).order_by(
        FinancialYear.start_date.desc()
    ).offset(skip).limit(limit).all()

    return years


@router.get("/current", response_model=FinancialYearResponse)
def get_current_financial_year(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get the current active financial year"""
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.tenant_id == current_tenant.id,
            FinancialYear.is_current == True
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No current financial year found. Please create one."
        )

    return year


@router.get("/{year_id}", response_model=FinancialYearWithStats)
def get_financial_year(
    year_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific financial year with statistics"""
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Calculate statistics for the financial year
    from ...models.single_entry import Transaction, TransactionType
    from decimal import Decimal

    stats = db.query(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.transaction_type == TransactionType.INCOME, Transaction.amount),
                    else_=0
                )
            ),
            0
        ).label('total_income'),
        func.coalesce(
            func.sum(
                case(
                    (Transaction.transaction_type == TransactionType.EXPENSE, Transaction.amount),
                    else_=0
                )
            ),
            0
        ).label('total_expense')
    ).filter(
        Transaction.fiscal_year_id == year_id
    ).first()

    total_income = Decimal(str(stats.total_income)) if stats else Decimal('0')
    total_expense = Decimal(str(stats.total_expense)) if stats else Decimal('0')
    net_balance = total_income - total_expense

    # Count active accounts
    active_accounts = db.query(func.count(func.distinct(AccountYearBalance.account_id))).filter(
        AccountYearBalance.financial_year_id == year_id
    ).scalar()

    # Count total transactions
    total_transactions = db.query(func.count(Transaction.id)).filter(
        Transaction.fiscal_year_id == year_id
    ).scalar()

    # Convert to response with stats
    year_dict = {
        **{c.name: getattr(year, c.name) for c in year.__table__.columns},
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": net_balance,
        "active_accounts_count": active_accounts or 0,
        "total_transactions_count": total_transactions or 0
    }

    return FinancialYearWithStats(**year_dict)


@router.post("/", response_model=FinancialYearResponse)
async def create_financial_year(
    year_data: FinancialYearCreate,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Create a new financial year (Admin only)

    Validates:
    - No overlapping dates with existing years
    - end_date is after start_date
    - Only one year can be marked as current
    """
    # Check for overlapping dates
    overlap = db.query(FinancialYear).filter(
        and_(
            FinancialYear.tenant_id == current_tenant.id,
            or_(
                and_(
                    FinancialYear.start_date <= year_data.start_date,
                    FinancialYear.end_date >= year_data.start_date
                ),
                and_(
                    FinancialYear.start_date <= year_data.end_date,
                    FinancialYear.end_date >= year_data.end_date
                )
            )
        )
    ).first()

    if overlap:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Date range overlaps with existing financial year '{overlap.year_name}'"
        )

    # If marking as current, unset other current years
    if year_data.is_current:
        db.query(FinancialYear).filter(
            and_(
                FinancialYear.tenant_id == current_tenant.id,
                FinancialYear.is_current == True
            )
        ).update({"is_current": False})

    # Create year
    new_year = FinancialYear(
        tenant_id=current_tenant.id,
        year_name=year_data.year_name,
        start_date=year_data.start_date,
        end_date=year_data.end_date,
        status=FinancialYearStatus.OPEN,
        is_current=year_data.is_current,
        has_uncategorized_transactions=False,
        total_transactions_count=0,
        created_by=current_user.id
    )

    db.add(new_year)
    db.commit()
    db.refresh(new_year)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="create",
        entity_type="FINANCIAL_YEAR",
        entity_id=new_year.id,
        entity_name=year_data.year_name,
        description=f"Created financial year '{year_data.year_name}'"
    )

    return new_year


@router.put("/{year_id}", response_model=FinancialYearResponse)
async def update_financial_year(
    year_id: UUID,
    year_data: FinancialYearUpdate,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update a financial year (Admin only)"""
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Cannot modify closed year dates
    if year.status == FinancialYearStatus.CLOSED:
        if year_data.start_date or year_data.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify dates of a closed financial year"
            )

    changes = []

    if year_data.year_name is not None:
        year.year_name = year_data.year_name
        changes.append(f"name to '{year_data.year_name}'")

    if year_data.start_date is not None:
        year.start_date = year_data.start_date
        changes.append(f"start_date to {year_data.start_date}")

    if year_data.end_date is not None:
        year.end_date = year_data.end_date
        changes.append(f"end_date to {year_data.end_date}")

    if year_data.is_current is not None:
        if year_data.is_current:
            # Unset other current years
            db.query(FinancialYear).filter(
                and_(
                    FinancialYear.tenant_id == current_tenant.id,
                    FinancialYear.id != year_id,
                    FinancialYear.is_current == True
                )
            ).update({"is_current": False})

        year.is_current = year_data.is_current
        changes.append(f"is_current to {year_data.is_current}")

    db.commit()
    db.refresh(year)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="update",
        entity_type="FINANCIAL_YEAR",
        entity_id=year.id,
        entity_name=year.year_name,
        description=f"Updated financial year: {', '.join(changes)}"
    )

    return year


@router.put("/{year_id}/set-current", response_model=FinancialYearResponse)
async def set_current_year(
    year_id: UUID,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Set a financial year as the current active year (Admin only)"""
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Unset other current years
    db.query(FinancialYear).filter(
        and_(
            FinancialYear.tenant_id == current_tenant.id,
            FinancialYear.id != year_id,
            FinancialYear.is_current == True
        )
    ).update({"is_current": False})

    year.is_current = True
    db.commit()
    db.refresh(year)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="update",
        entity_type="FINANCIAL_YEAR",
        entity_id=year.id,
        entity_name=year.year_name,
        description=f"Set '{year.year_name}' as current financial year"
    )

    return year


@router.delete("/{year_id}")
async def delete_financial_year(
    year_id: UUID,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Delete a financial year (Admin only)

    Cannot delete if:
    - Year has transactions
    - Year is closed
    """
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Check if closed
    if year.status == FinancialYearStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a closed financial year"
        )

    # Check for transactions
    if year.total_transactions_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete financial year with {year.total_transactions_count} transactions"
        )

    year_name = year.year_name
    db.delete(year)
    db.commit()

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="delete",
        entity_type="FINANCIAL_YEAR",
        entity_id=year_id,
        entity_name=year_name,
        description=f"Deleted financial year '{year_name}'"
    )

    return {"message": f"Financial year '{year_name}' deleted successfully"}


# ============ Year Closing Endpoints ============

@router.post("/{year_id}/validate-closing", response_model=YearClosingValidation)
def validate_year_closing(
    year_id: UUID,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Validate if a financial year can be closed (Admin only)

    Returns validation results with warnings and errors
    """
    service = FiscalYearService(db, current_tenant.id)
    return service.validate_year_closing(year_id)


@router.post("/{year_id}/close", response_model=YearClosingResponse)
async def close_financial_year(
    year_id: UUID,
    closing_request: YearClosingRequest,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Close a financial year (Admin only)

    Steps:
    1. Validates all transactions have categories (if validate_categories=True)
    2. Runs cascade recalculation to ensure balances are correct
    3. Marks all balances as final
    4. Updates year status to CLOSED
    5. Creates audit trail with balance snapshot
    6. Optionally creates next year with opening balances
    """
    service = FiscalYearService(db, current_tenant.id)
    result = service.close_financial_year(
        year_id=year_id,
        user_id=current_user.id,
        validate_categories=closing_request.validate_categories,
        create_next_year=closing_request.create_next_year
    )

    if result.success:
        # Log activity
        log_activity(
            db=db,
            user=current_user,
            activity_type="update",
            entity_type="FINANCIAL_YEAR",
            entity_id=str(year_id),
            description=result.message
        )

    return result


@router.post("/{year_id}/recalculate", response_model=RecalculationResult)
async def recalculate_year(
    year_id: UUID,
    current_user: User = Depends(require_admin),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Manually trigger cascade recalculation from this year onwards (Admin only)

    This is useful after:
    - Editing transactions in a closed year
    - Fixing data inconsistencies
    - Migrating historical data
    """
    service = FiscalYearService(db, current_tenant.id)
    result = service.recalculate_cascade(year_id)

    if result.success:
        # Log activity
        log_activity(
            db=db,
            user=current_user,
            activity_type="update",
            entity_type="FINANCIAL_YEAR",
            entity_id=str(year_id),
            description=f"Recalculated {result.recalculated_balances} balances across {len(result.affected_years)} years"
        )

    return result


# ============ Account Year Balances ============

@router.get("/{year_id}/balances", response_model=List[AccountYearBalanceResponse])
def get_year_balances(
    year_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Get all account balance snapshots for a specific financial year

    Returns opening, closing balances and transaction summaries for each account
    """
    # Verify year belongs to tenant
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Get balances with account names
    from ...models.single_entry import MoneyAccount

    balances = db.query(
        AccountYearBalance,
        MoneyAccount.name.label('account_name')
    ).join(
        MoneyAccount,
        AccountYearBalance.account_id == MoneyAccount.id
    ).filter(
        AccountYearBalance.financial_year_id == year_id
    ).order_by(
        MoneyAccount.name
    ).all()

    result = []
    for balance, account_name in balances:
        balance_dict = {c.name: getattr(balance, c.name) for c in balance.__table__.columns}
        balance_dict['account_name'] = account_name
        result.append(AccountYearBalanceResponse(**balance_dict))

    return result
