"""
Products/Services API Endpoints
CRUD operations for managing products and services catalog
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models import Product as ProductModel, ProductType, ProductCategory
from ...models.auth import User
from ...models.single_entry import TaxRate, Category
from ...schemas.product import Product, ProductCreate, ProductUpdate, ProductWithDetails
from ...api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ProductWithDetails])
def list_products(
    product_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all products/services for the tenant"""
    query = db.query(ProductModel).filter(ProductModel.tenant_id == current_user.tenant_id)

    # Apply filters
    if product_type:
        query = query.filter(ProductModel.product_type == product_type)
    if is_active is not None:
        query = query.filter(ProductModel.is_active == is_active)

    # Get products
    products = query.order_by(ProductModel.name).offset(skip).limit(limit).all()

    # Enrich with tax rate and category details
    result = []
    for product in products:
        product_dict = {
            **product.__dict__,
            "tax_rate_name": None,
            "tax_rate_percentage": None,
            "category_name": None,
            "product_category_name": None,
            "product_category_color": None,
        }

        if product.tax_rate_id:
            tax_rate = db.query(TaxRate).filter(TaxRate.id == product.tax_rate_id).first()
            if tax_rate:
                product_dict["tax_rate_name"] = tax_rate.name
                product_dict["tax_rate_percentage"] = float(tax_rate.percentage)

        if product.category_id:
            category = db.query(Category).filter(Category.id == product.category_id).first()
            if category:
                product_dict["category_name"] = category.name

        if product.product_category_id:
            product_category = db.query(ProductCategory).filter(ProductCategory.id == product.product_category_id).first()
            if product_category:
                product_dict["product_category_name"] = product_category.name
                product_dict["product_category_color"] = product_category.color

        result.append(product_dict)

    return result


@router.get("/{product_id}", response_model=ProductWithDetails)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single product by ID"""
    product = (
        db.query(ProductModel)
        .filter(
            ProductModel.id == product_id,
            ProductModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Enrich with details
    product_dict = {
        **product.__dict__,
        "tax_rate_name": None,
        "tax_rate_percentage": None,
        "category_name": None,
        "product_category_name": None,
        "product_category_color": None,
    }

    if product.tax_rate_id:
        tax_rate = db.query(TaxRate).filter(TaxRate.id == product.tax_rate_id).first()
        if tax_rate:
            product_dict["tax_rate_name"] = tax_rate.name
            product_dict["tax_rate_percentage"] = float(tax_rate.percentage)

    if product.category_id:
        category = db.query(Category).filter(Category.id == product.category_id).first()
        if category:
            product_dict["category_name"] = category.name

    if product.product_category_id:
        product_category = db.query(ProductCategory).filter(ProductCategory.id == product.product_category_id).first()
        if product_category:
            product_dict["product_category_name"] = product_category.name
            product_dict["product_category_color"] = product_category.color

    return product_dict


@router.post("/", response_model=Product, status_code=status.HTTP_201_CREATED)
def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new product/service"""
    # Validate product type
    if product_data.product_type not in ["product", "service"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid product type. Must be 'product' or 'service'",
        )

    # Check if SKU is unique within tenant (if provided)
    if product_data.sku:
        existing = (
            db.query(ProductModel)
            .filter(
                ProductModel.tenant_id == current_user.tenant_id,
                ProductModel.sku == product_data.sku,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A product with this SKU already exists",
            )

    # Create product
    product = ProductModel(
        **product_data.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )

    db.add(product)
    db.commit()
    db.refresh(product)

    return product


@router.put("/{product_id}", response_model=Product)
def update_product(
    product_id: UUID,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing product/service"""
    product = (
        db.query(ProductModel)
        .filter(
            ProductModel.id == product_id,
            ProductModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Check SKU uniqueness if being updated
    if product_data.sku and product_data.sku != product.sku:
        existing = (
            db.query(ProductModel)
            .filter(
                ProductModel.tenant_id == current_user.tenant_id,
                ProductModel.sku == product_data.sku,
                ProductModel.id != product_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A product with this SKU already exists",
            )

    # Update fields
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a product/service"""
    product = (
        db.query(ProductModel)
        .filter(
            ProductModel.id == product_id,
            ProductModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Soft delete by marking as inactive instead of hard delete
    # This preserves historical data in invoices
    product.is_active = False
    db.commit()

    return None


@router.post("/{product_id}/activate", response_model=Product)
def activate_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reactivate a deactivated product"""
    product = (
        db.query(ProductModel)
        .filter(
            ProductModel.id == product_id,
            ProductModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    product.is_active = True
    db.commit()
    db.refresh(product)

    return product


@router.post("/{product_id}/update-stock", response_model=Product)
def update_stock(
    product_id: UUID,
    quantity: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update product stock quantity"""
    product = (
        db.query(ProductModel)
        .filter(
            ProductModel.id == product_id,
            ProductModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if not product.track_inventory:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This product does not track inventory",
        )

    product.stock_quantity = quantity
    db.commit()
    db.refresh(product)

    return product
