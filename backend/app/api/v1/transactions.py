"""
Transactions API endpoints for Single Entry accounting
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.single_entry import Transaction, MoneyAccount, Category, TransactionType
from ...models.fiscal_year import FinancialYear, FinancialYearStatus
from ...schemas.single_entry import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionWithDetails,
    DashboardStats,
)
from ..deps import get_current_user, get_current_tenant
from .activity_logs import log_activity
from ...services.fiscal_year_service import FiscalYearService

router = APIRouter()


def update_account_balance(
    account: MoneyAccount,
    amount: Decimal,
    transaction_type: TransactionType,
    is_new: bool = True
):
    """
    Update account balance based on transaction
    is_new: True for new transaction, False for reversal (delete/update)
    """
    if is_new:
        # Adding a new transaction
        if transaction_type == TransactionType.INCOME:
            account.current_balance += amount
        else:  # EXPENSE
            account.current_balance -= amount
    else:
        # Reversing a transaction (delete or update - reverse old amount)
        if transaction_type == TransactionType.INCOME:
            account.current_balance -= amount
        else:  # EXPENSE
            account.current_balance += amount


def assign_fiscal_year(
    transaction_date: date,
    tenant_id: UUID,
    db: Session
) -> Optional[UUID]:
    """
    Auto-assign fiscal_year_id based on transaction_date
    Returns the fiscal year ID that contains the transaction date, or None
    """
    fiscal_year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.tenant_id == tenant_id,
            FinancialYear.start_date <= transaction_date,
            FinancialYear.end_date >= transaction_date
        )
    ).first()

    return fiscal_year.id if fiscal_year else None


def check_fiscal_year_permissions(
    fiscal_year_id: Optional[UUID],
    current_user: User,
    db: Session
) -> None:
    """
    Check if user can edit transactions in this fiscal year
    Raises HTTPException if:
    - Year is closed and user is not admin
    """
    if not fiscal_year_id:
        return  # No fiscal year assigned, allow edit

    fiscal_year = db.query(FinancialYear).filter(
        FinancialYear.id == fiscal_year_id
    ).first()

    if fiscal_year and fiscal_year.status == FinancialYearStatus.CLOSED:
        if current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This transaction is in a closed financial year ('{fiscal_year.year_name}'). Only admin users can edit transactions in closed years."
            )


def validate_new_year_transaction(
    transaction_date: date,
    fiscal_year_id: Optional[UUID],
    tenant_id: UUID,
    db: Session
) -> None:
    """
    Validate that previous fiscal year is closed before allowing transactions in new year
    Business rule: Cannot create transactions in new year until previous year is closed
    """
    if not fiscal_year_id:
        return  # No fiscal year assigned

    current_year = db.query(FinancialYear).filter(
        FinancialYear.id == fiscal_year_id
    ).first()

    if not current_year:
        return

    # Find previous year (year that ends before current year starts)
    previous_year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.tenant_id == tenant_id,
            FinancialYear.end_date < current_year.start_date
        )
    ).order_by(FinancialYear.end_date.desc()).first()

    if previous_year and previous_year.status != FinancialYearStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Previous financial year '{previous_year.year_name}' must be closed before creating transactions in '{current_year.year_name}'. Please close the previous year first."
        )


@router.get("/", response_model=List[TransactionResponse])
def list_transactions(
    transaction_type: Optional[TransactionType] = None,
    account_id: Optional[UUID] = None,
    category_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    List transactions with optional filters:
    - transaction_type: INCOME or EXPENSE
    - account_id: Filter by money account
    - category_id: Filter by category
    - start_date: Filter from this date
    - end_date: Filter until this date
    """
    query = db.query(Transaction).filter(Transaction.tenant_id == current_tenant.id)

    # Apply filters
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)

    transactions = (
        query
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return transactions


@router.get("/dashboard-stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for current tenant"""
    # Calculate total income
    total_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.tenant_id == current_tenant.id,
            Transaction.transaction_type == TransactionType.INCOME
        )
        .scalar() or Decimal("0.00")
    )

    # Calculate total expense
    total_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.tenant_id == current_tenant.id,
            Transaction.transaction_type == TransactionType.EXPENSE
        )
        .scalar() or Decimal("0.00")
    )

    # Get active accounts count
    active_accounts = (
        db.query(func.count(MoneyAccount.id))
        .filter(
            MoneyAccount.tenant_id == current_tenant.id,
            MoneyAccount.is_active == True
        )
        .scalar() or 0
    )

    # Get total transactions count
    total_transactions = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.tenant_id == current_tenant.id)
        .scalar() or 0
    )

    return DashboardStats(
        total_income=float(total_income),
        total_expense=float(total_expense),
        net_balance=float(total_income - total_expense),
        active_accounts=active_accounts,
        total_transactions=total_transactions
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific transaction by ID"""
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.tenant_id == current_tenant.id
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return transaction


@router.post("/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(
    transaction_data: TransactionCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new transaction and update account balance"""
    # Verify account belongs to tenant
    account = (
        db.query(MoneyAccount)
        .filter(
            MoneyAccount.id == transaction_data.account_id,
            MoneyAccount.tenant_id == current_tenant.id
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Verify category belongs to tenant and matches transaction type (if provided)
    if transaction_data.category_id:
        category = (
            db.query(Category)
            .filter(
                Category.id == transaction_data.category_id,
                Category.tenant_id == current_tenant.id
            )
            .first()
        )

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

        if category.transaction_type != transaction_data.transaction_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category is for {category.transaction_type.value} but transaction is {transaction_data.transaction_type.value}"
            )

    # Auto-assign fiscal year based on transaction date
    fiscal_year_id = assign_fiscal_year(
        transaction_data.transaction_date,
        current_tenant.id,
        db
    )

    # Validate new year transaction (ensure previous year is closed if needed)
    validate_new_year_transaction(
        transaction_data.transaction_date,
        fiscal_year_id,
        current_tenant.id,
        db
    )

    # Create new transaction
    new_transaction = Transaction(
        tenant_id=current_tenant.id,
        account_id=transaction_data.account_id,
        category_id=transaction_data.category_id,
        transaction_type=transaction_data.transaction_type,
        amount=transaction_data.amount,
        transaction_date=transaction_data.transaction_date,
        description=transaction_data.description,
        reference_number=transaction_data.reference_number,
        attachment_url=transaction_data.attachment_url,
        fiscal_year_id=fiscal_year_id,
        created_by=current_user.id
    )

    # Update account balance
    update_account_balance(account, transaction_data.amount, transaction_data.transaction_type, is_new=True)

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="create",
        entity_type="TRANSACTION",
        entity_id=str(new_transaction.id),
        entity_name=f"{new_transaction.transaction_type.value} - {account.name}",
        description=f"Created {new_transaction.transaction_type.value} transaction: {new_transaction.amount} on {account.name}",
        request=request,
    )

    return new_transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    transaction_data: TransactionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update an existing transaction and adjust account balances"""
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.tenant_id == current_tenant.id
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Check if transaction is in closed fiscal year (require admin)
    check_fiscal_year_permissions(transaction.fiscal_year_id, current_user, db)

    # Store old fiscal year for cascade recalculation
    old_fiscal_year_id = transaction.fiscal_year_id

    # Get current account
    old_account = (
        db.query(MoneyAccount)
        .filter(MoneyAccount.id == transaction.account_id)
        .first()
    )

    # Reverse old transaction from old account
    update_account_balance(old_account, transaction.amount, transaction.transaction_type, is_new=False)

    # Update transaction fields
    update_data = transaction_data.dict(exclude_unset=True)

    # Verify new account if changed
    if transaction_data.account_id:
        new_account = (
            db.query(MoneyAccount)
            .filter(
                MoneyAccount.id == transaction_data.account_id,
                MoneyAccount.tenant_id == current_tenant.id
            )
            .first()
        )

        if not new_account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
    else:
        new_account = old_account

    # Verify category if changed
    if transaction_data.category_id:
        category = (
            db.query(Category)
            .filter(
                Category.id == transaction_data.category_id,
                Category.tenant_id == current_tenant.id
            )
            .first()
        )

        if not category:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Category not found"
            )

    # Apply updates
    for field, value in update_data.items():
        setattr(transaction, field, value)

    # If transaction_date changed, reassign fiscal_year_id
    if transaction_data.transaction_date:
        new_fiscal_year_id = assign_fiscal_year(
            transaction.transaction_date,
            current_tenant.id,
            db
        )
        transaction.fiscal_year_id = new_fiscal_year_id

        # Validate new year transaction
        validate_new_year_transaction(
            transaction.transaction_date,
            new_fiscal_year_id,
            current_tenant.id,
            db
        )

    # Apply new transaction to new account
    update_account_balance(new_account, transaction.amount, transaction.transaction_type, is_new=True)

    db.commit()
    db.refresh(transaction)

    # Trigger cascade recalculation if fiscal year changed or transaction in closed year
    need_recalculation = False
    recalc_year_id = None

    if old_fiscal_year_id and old_fiscal_year_id != transaction.fiscal_year_id:
        # Fiscal year changed, recalculate from the earlier year
        need_recalculation = True
        recalc_year_id = old_fiscal_year_id
    elif transaction.fiscal_year_id:
        # Check if current fiscal year is closed
        fiscal_year = db.query(FinancialYear).filter(
            FinancialYear.id == transaction.fiscal_year_id
        ).first()
        if fiscal_year and fiscal_year.status == FinancialYearStatus.CLOSED:
            need_recalculation = True
            recalc_year_id = fiscal_year.id

    if need_recalculation and recalc_year_id:
        # Trigger cascade recalculation
        service = FiscalYearService(db, current_tenant.id)
        service.recalculate_cascade(recalc_year_id, [transaction.account_id])

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="update",
        entity_type="TRANSACTION",
        entity_id=str(transaction.id),
        entity_name=f"{transaction.transaction_type.value} - {new_account.name}",
        description=f"Updated {transaction.transaction_type.value} transaction: {transaction.amount}",
        request=request,
    )

    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete a transaction and reverse account balance"""
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id,
            Transaction.tenant_id == current_tenant.id
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    # Check if transaction is in closed fiscal year (require admin)
    check_fiscal_year_permissions(transaction.fiscal_year_id, current_user, db)

    # Store fiscal year and account for cascade recalculation
    deleted_fiscal_year_id = transaction.fiscal_year_id
    deleted_account_id = transaction.account_id

    # Get account and reverse balance
    account = (
        db.query(MoneyAccount)
        .filter(MoneyAccount.id == transaction.account_id)
        .first()
    )

    # Save transaction info for logging
    transaction_id_str = str(transaction.id)
    transaction_type = transaction.transaction_type.value
    transaction_amount = transaction.amount
    account_name = account.name if account else "Unknown"

    if account:
        update_account_balance(account, transaction.amount, transaction.transaction_type, is_new=False)

    db.delete(transaction)
    db.commit()

    # Trigger cascade recalculation if transaction was in closed year
    if deleted_fiscal_year_id:
        fiscal_year = db.query(FinancialYear).filter(
            FinancialYear.id == deleted_fiscal_year_id
        ).first()
        if fiscal_year and fiscal_year.status == FinancialYearStatus.CLOSED:
            service = FiscalYearService(db, current_tenant.id)
            service.recalculate_cascade(deleted_fiscal_year_id, [deleted_account_id])

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="delete",
        entity_type="TRANSACTION",
        entity_id=transaction_id_str,
        entity_name=f"{transaction_type} - {account_name}",
        description=f"Deleted {transaction_type} transaction: {transaction_amount}",
        request=request,
    )

    return None
