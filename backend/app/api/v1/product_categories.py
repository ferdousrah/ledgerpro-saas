"""
Product Categories API Endpoints
CRUD operations for managing product/service categories
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models.product_category import ProductCategory as ProductCategoryModel
from ...models.auth import User
from ...schemas.product_category import ProductCategory, ProductCategoryCreate, ProductCategoryUpdate
from ...api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ProductCategory])
def list_product_categories(
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all product categories for the tenant"""
    query = db.query(ProductCategoryModel).filter(
        ProductCategoryModel.tenant_id == current_user.tenant_id
    )

    if is_active is not None:
        query = query.filter(ProductCategoryModel.is_active == is_active)

    categories = query.order_by(ProductCategoryModel.name).offset(skip).limit(limit).all()
    return categories


@router.get("/{category_id}", response_model=ProductCategory)
def get_product_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single product category by ID"""
    category = (
        db.query(ProductCategoryModel)
        .filter(
            ProductCategoryModel.id == category_id,
            ProductCategoryModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product category not found",
        )

    return category


@router.post("/", response_model=ProductCategory, status_code=status.HTTP_201_CREATED)
def create_product_category(
    category_data: ProductCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new product category"""
    # Check if category with same name already exists
    existing = (
        db.query(ProductCategoryModel)
        .filter(
            ProductCategoryModel.tenant_id == current_user.tenant_id,
            ProductCategoryModel.name == category_data.name,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A product category with this name already exists",
        )

    # Create category
    category = ProductCategoryModel(
        **category_data.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )

    db.add(category)
    db.commit()
    db.refresh(category)

    return category


@router.put("/{category_id}", response_model=ProductCategory)
def update_product_category(
    category_id: UUID,
    category_data: ProductCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing product category"""
    category = (
        db.query(ProductCategoryModel)
        .filter(
            ProductCategoryModel.id == category_id,
            ProductCategoryModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product category not found",
        )

    # Check name uniqueness if being updated
    if category_data.name and category_data.name != category.name:
        existing = (
            db.query(ProductCategoryModel)
            .filter(
                ProductCategoryModel.tenant_id == current_user.tenant_id,
                ProductCategoryModel.name == category_data.name,
                ProductCategoryModel.id != category_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A product category with this name already exists",
            )

    # Update fields
    update_data = category_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a product category"""
    category = (
        db.query(ProductCategoryModel)
        .filter(
            ProductCategoryModel.id == category_id,
            ProductCategoryModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product category not found",
        )

    # Soft delete by marking as inactive
    category.is_active = False
    db.commit()

    return None


@router.post("/{category_id}/activate", response_model=ProductCategory)
def activate_product_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reactivate a deactivated product category"""
    category = (
        db.query(ProductCategoryModel)
        .filter(
            ProductCategoryModel.id == category_id,
            ProductCategoryModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product category not found",
        )

    category.is_active = True
    db.commit()
    db.refresh(category)

    return category
