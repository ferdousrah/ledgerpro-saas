"""
Transactions API endpoints for Single Entry accounting
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.single_entry import Transaction, MoneyAccount, Category, TransactionType
from ...schemas.single_entry import (
    TransactionCreate,
    TransactionUpdate,
    TransactionResponse,
    TransactionWithDetails,
    DashboardStats,
)
from ..deps import get_current_user, get_current_tenant

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
        created_by=current_user.id
    )

    # Update account balance
    update_account_balance(account, transaction_data.amount, transaction_data.transaction_type, is_new=True)

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return new_transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: UUID,
    transaction_data: TransactionUpdate,
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

    # Apply new transaction to new account
    update_account_balance(new_account, transaction.amount, transaction.transaction_type, is_new=True)

    db.commit()
    db.refresh(transaction)

    return transaction


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    transaction_id: UUID,
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

    # Get account and reverse balance
    account = (
        db.query(MoneyAccount)
        .filter(MoneyAccount.id == transaction.account_id)
        .first()
    )

    if account:
        update_account_balance(account, transaction.amount, transaction.transaction_type, is_new=False)

    db.delete(transaction)
    db.commit()

    return None
