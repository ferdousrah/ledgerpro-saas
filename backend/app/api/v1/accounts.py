"""
Money Accounts API endpoints for Single Entry accounting
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from decimal import Decimal

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.single_entry import MoneyAccount
from ...schemas.single_entry import (
    MoneyAccountCreate,
    MoneyAccountUpdate,
    MoneyAccountResponse,
)
from ..deps import get_current_user, get_current_tenant
from .activity_logs import log_activity

router = APIRouter()


@router.get("/", response_model=List[MoneyAccountResponse])
def list_accounts(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """List all money accounts for current tenant"""
    accounts = (
        db.query(MoneyAccount)
        .filter(MoneyAccount.tenant_id == current_tenant.id)
        .order_by(MoneyAccount.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return accounts


@router.get("/{account_id}", response_model=MoneyAccountResponse)
def get_account(
    account_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific money account by ID"""
    account = (
        db.query(MoneyAccount)
        .filter(
            MoneyAccount.id == account_id,
            MoneyAccount.tenant_id == current_tenant.id
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    return account


@router.post("/", response_model=MoneyAccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account_data: MoneyAccountCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new money account"""
    # Check if account name already exists for this tenant
    existing = (
        db.query(MoneyAccount)
        .filter(
            MoneyAccount.tenant_id == current_tenant.id,
            MoneyAccount.name == account_data.name
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with this name already exists"
        )

    # Create new account
    new_account = MoneyAccount(
        tenant_id=current_tenant.id,
        name=account_data.name,
        account_type=account_data.account_type,
        account_number=account_data.account_number,
        bank_name=account_data.bank_name,
        opening_balance=account_data.opening_balance,
        current_balance=account_data.opening_balance,  # Initialize with opening balance
        description=account_data.description,
        is_active=account_data.is_active
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="create",
        entity_type="ACCOUNT",
        entity_id=str(new_account.id),
        entity_name=new_account.name,
        description=f"Created account: {new_account.name}",
        request=request,
    )

    return new_account


@router.put("/{account_id}", response_model=MoneyAccountResponse)
def update_account(
    account_id: UUID,
    account_data: MoneyAccountUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update an existing money account"""
    account = (
        db.query(MoneyAccount)
        .filter(
            MoneyAccount.id == account_id,
            MoneyAccount.tenant_id == current_tenant.id
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Check if new name conflicts with existing account
    if account_data.name and account_data.name != account.name:
        existing = (
            db.query(MoneyAccount)
            .filter(
                MoneyAccount.tenant_id == current_tenant.id,
                MoneyAccount.name == account_data.name,
                MoneyAccount.id != account_id
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account with this name already exists"
            )

    # Update fields
    update_data = account_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(account, field, value)

    db.commit()
    db.refresh(account)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="update",
        entity_type="ACCOUNT",
        entity_id=str(account.id),
        entity_name=account.name,
        description=f"Updated account: {account.name}",
        request=request,
    )

    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete a money account"""
    account = (
        db.query(MoneyAccount)
        .filter(
            MoneyAccount.id == account_id,
            MoneyAccount.tenant_id == current_tenant.id
        )
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )

    # Check if account has transactions
    if account.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete account with existing transactions. Consider deactivating instead."
        )

    # Save account info for logging
    account_name = account.name
    account_id_str = str(account.id)

    db.delete(account)
    db.commit()

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="delete",
        entity_type="ACCOUNT",
        entity_id=account_id_str,
        entity_name=account_name,
        description=f"Deleted account: {account_name}",
        request=request,
    )

    return None
