"""
Warehouses API Endpoints
CRUD operations for managing warehouses/storage locations
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models.warehouse import Warehouse as WarehouseModel
from ...models.auth import User
from ...schemas.warehouse import Warehouse, WarehouseCreate, WarehouseUpdate
from ...api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[Warehouse])
def list_warehouses(
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all warehouses for the tenant"""
    query = db.query(WarehouseModel).filter(
        WarehouseModel.tenant_id == current_user.tenant_id
    )

    if is_active is not None:
        query = query.filter(WarehouseModel.is_active == is_active)

    warehouses = query.order_by(WarehouseModel.name).offset(skip).limit(limit).all()
    return warehouses


@router.get("/{warehouse_id}", response_model=Warehouse)
def get_warehouse(
    warehouse_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single warehouse by ID"""
    warehouse = (
        db.query(WarehouseModel)
        .filter(
            WarehouseModel.id == warehouse_id,
            WarehouseModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    return warehouse


@router.post("/", response_model=Warehouse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse_data: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new warehouse"""
    # Check if warehouse with same name already exists
    existing = (
        db.query(WarehouseModel)
        .filter(
            WarehouseModel.tenant_id == current_user.tenant_id,
            WarehouseModel.name == warehouse_data.name,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A warehouse with this name already exists",
        )

    # If this is set as default, remove default from others
    if warehouse_data.is_default:
        db.query(WarehouseModel).filter(
            WarehouseModel.tenant_id == current_user.tenant_id,
            WarehouseModel.is_default == True
        ).update({"is_default": False})

    # Create warehouse
    warehouse = WarehouseModel(
        **warehouse_data.model_dump(),
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )

    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)

    return warehouse


@router.put("/{warehouse_id}", response_model=Warehouse)
def update_warehouse(
    warehouse_id: UUID,
    warehouse_data: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing warehouse"""
    warehouse = (
        db.query(WarehouseModel)
        .filter(
            WarehouseModel.id == warehouse_id,
            WarehouseModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    # Check name uniqueness if being updated
    if warehouse_data.name and warehouse_data.name != warehouse.name:
        existing = (
            db.query(WarehouseModel)
            .filter(
                WarehouseModel.tenant_id == current_user.tenant_id,
                WarehouseModel.name == warehouse_data.name,
                WarehouseModel.id != warehouse_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A warehouse with this name already exists",
            )

    # If setting as default, remove default from others
    if warehouse_data.is_default and not warehouse.is_default:
        db.query(WarehouseModel).filter(
            WarehouseModel.tenant_id == current_user.tenant_id,
            WarehouseModel.is_default == True,
            WarehouseModel.id != warehouse_id
        ).update({"is_default": False})

    # Update fields
    update_data = warehouse_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(warehouse, field, value)

    db.commit()
    db.refresh(warehouse)

    return warehouse


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_warehouse(
    warehouse_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete a warehouse"""
    warehouse = (
        db.query(WarehouseModel)
        .filter(
            WarehouseModel.id == warehouse_id,
            WarehouseModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    # Soft delete by marking as inactive
    warehouse.is_active = False
    db.commit()

    return None


@router.post("/{warehouse_id}/activate", response_model=Warehouse)
def activate_warehouse(
    warehouse_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reactivate a deactivated warehouse"""
    warehouse = (
        db.query(WarehouseModel)
        .filter(
            WarehouseModel.id == warehouse_id,
            WarehouseModel.tenant_id == current_user.tenant_id,
        )
        .first()
    )

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    warehouse.is_active = True
    db.commit()
    db.refresh(warehouse)

    return warehouse
