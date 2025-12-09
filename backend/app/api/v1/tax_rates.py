"""
Tax Rates API endpoints for Single Entry accounting
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ...database import get_db
from ...models.auth import Tenant
from ...models.single_entry import TaxRate
from ...schemas.single_entry import (
    TaxRateCreate,
    TaxRateUpdate,
    TaxRateResponse,
)
from ..deps import get_current_tenant

router = APIRouter()


@router.get("/", response_model=List[TaxRateResponse])
def list_tax_rates(
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    List all tax rates for current tenant
    """
    tax_rates = (
        db.query(TaxRate)
        .filter(TaxRate.tenant_id == current_tenant.id)
        .order_by(TaxRate.name)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return tax_rates


@router.get("/{tax_rate_id}", response_model=TaxRateResponse)
def get_tax_rate(
    tax_rate_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific tax rate by ID"""
    tax_rate = (
        db.query(TaxRate)
        .filter(
            TaxRate.id == tax_rate_id,
            TaxRate.tenant_id == current_tenant.id
        )
        .first()
    )

    if not tax_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax rate not found"
        )

    return tax_rate


@router.post("/", response_model=TaxRateResponse, status_code=status.HTTP_201_CREATED)
def create_tax_rate(
    tax_rate_data: TaxRateCreate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new tax rate"""
    # Check if tax rate name already exists for this tenant
    existing = (
        db.query(TaxRate)
        .filter(
            TaxRate.tenant_id == current_tenant.id,
            TaxRate.name == tax_rate_data.name
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tax rate '{tax_rate_data.name}' already exists"
        )

    # Create new tax rate
    new_tax_rate = TaxRate(
        tenant_id=current_tenant.id,
        name=tax_rate_data.name,
        rate=tax_rate_data.rate,
        description=tax_rate_data.description,
        applies_to_income=tax_rate_data.applies_to_income,
        applies_to_expense=tax_rate_data.applies_to_expense,
        is_active=tax_rate_data.is_active
    )

    db.add(new_tax_rate)
    db.commit()
    db.refresh(new_tax_rate)

    return new_tax_rate


@router.put("/{tax_rate_id}", response_model=TaxRateResponse)
def update_tax_rate(
    tax_rate_id: UUID,
    tax_rate_data: TaxRateUpdate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update an existing tax rate"""
    tax_rate = (
        db.query(TaxRate)
        .filter(
            TaxRate.id == tax_rate_id,
            TaxRate.tenant_id == current_tenant.id
        )
        .first()
    )

    if not tax_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax rate not found"
        )

    # Check if new name conflicts with existing tax rate
    if tax_rate_data.name and tax_rate_data.name != tax_rate.name:
        existing = (
            db.query(TaxRate)
            .filter(
                TaxRate.tenant_id == current_tenant.id,
                TaxRate.name == tax_rate_data.name,
                TaxRate.id != tax_rate_id
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tax rate '{tax_rate_data.name}' already exists"
            )

    # Update fields
    update_data = tax_rate_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tax_rate, field, value)

    db.commit()
    db.refresh(tax_rate)

    return tax_rate


@router.delete("/{tax_rate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tax_rate(
    tax_rate_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete a tax rate"""
    tax_rate = (
        db.query(TaxRate)
        .filter(
            TaxRate.id == tax_rate_id,
            TaxRate.tenant_id == current_tenant.id
        )
        .first()
    )

    if not tax_rate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tax rate not found"
        )

    db.delete(tax_rate)
    db.commit()

    return None
