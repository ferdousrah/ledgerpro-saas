"""
Categories API endpoints for Single Entry accounting
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models.auth import Tenant
from ...models.single_entry import Category, TransactionType
from ...schemas.single_entry import (
    CategoryCreate,
    CategoryUpdate,
    CategoryResponse,
)
from ..deps import get_current_tenant

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
def list_categories(
    transaction_type: Optional[TransactionType] = None,
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    List all categories for current tenant
    Optionally filter by transaction_type (INCOME or EXPENSE)
    """
    query = db.query(Category).filter(Category.tenant_id == current_tenant.id)

    if transaction_type:
        query = query.filter(Category.transaction_type == transaction_type)

    categories = (
        query
        .order_by(Category.transaction_type, Category.name)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return categories


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific category by ID"""
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.tenant_id == current_tenant.id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return category


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new category"""
    # Check if category name already exists for this tenant and transaction type
    existing = (
        db.query(Category)
        .filter(
            Category.tenant_id == current_tenant.id,
            Category.name == category_data.name,
            Category.transaction_type == category_data.transaction_type
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{category_data.name}' already exists for {category_data.transaction_type.value}"
        )

    # Create new category
    new_category = Category(
        tenant_id=current_tenant.id,
        name=category_data.name,
        transaction_type=category_data.transaction_type,
        description=category_data.description,
        color=category_data.color,
        icon=category_data.icon,
        is_active=category_data.is_active
    )

    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return new_category


@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update an existing category"""
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.tenant_id == current_tenant.id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if new name conflicts with existing category
    if category_data.name and category_data.name != category.name:
        existing = (
            db.query(Category)
            .filter(
                Category.tenant_id == current_tenant.id,
                Category.name == category_data.name,
                Category.transaction_type == category.transaction_type,
                Category.id != category_id
            )
            .first()
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category '{category_data.name}' already exists for {category.transaction_type.value}"
            )

    # Update fields
    update_data = category_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete a category"""
    category = (
        db.query(Category)
        .filter(
            Category.id == category_id,
            Category.tenant_id == current_tenant.id
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if category has transactions
    if category.transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with existing transactions. Consider deactivating instead."
        )

    db.delete(category)
    db.commit()

    return None
