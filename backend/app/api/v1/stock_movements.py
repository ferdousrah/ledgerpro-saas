"""
Stock Movements API Endpoints
Endpoints for stock adjustments, transfers, and movement history
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime

from ...database import get_db
from ...models.stock_movement import StockMovement as StockMovementModel, MovementType
from ...models.product_warehouse_stock import ProductWarehouseStock
from ...models.product import Product
from ...models.warehouse import Warehouse
from ...models.auth import User
from ...schemas.stock_movement import (
    StockMovement,
    StockMovementWithDetails,
    StockAdjustmentRequest,
    StockTransferRequest,
)
from ...api.deps import get_current_user

router = APIRouter()


def get_or_create_stock_record(
    db: Session,
    tenant_id: UUID,
    product_id: UUID,
    warehouse_id: UUID
) -> ProductWarehouseStock:
    """Get or create a stock record for a product in a warehouse"""
    stock = db.query(ProductWarehouseStock).filter(
        ProductWarehouseStock.tenant_id == tenant_id,
        ProductWarehouseStock.product_id == product_id,
        ProductWarehouseStock.warehouse_id == warehouse_id,
    ).first()

    if not stock:
        stock = ProductWarehouseStock(
            tenant_id=tenant_id,
            product_id=product_id,
            warehouse_id=warehouse_id,
            quantity=0,
            reserved_quantity=0,
        )
        db.add(stock)
        db.flush()

    return stock


@router.get("/", response_model=List[StockMovementWithDetails])
def list_stock_movements(
    product_id: Optional[UUID] = None,
    warehouse_id: Optional[UUID] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List stock movements with filters"""
    query = db.query(StockMovementModel).filter(
        StockMovementModel.tenant_id == current_user.tenant_id
    )

    if product_id:
        query = query.filter(StockMovementModel.product_id == product_id)

    if warehouse_id:
        query = query.filter(StockMovementModel.warehouse_id == warehouse_id)

    if movement_type:
        query = query.filter(StockMovementModel.movement_type == movement_type)

    if start_date:
        query = query.filter(StockMovementModel.movement_date >= start_date)

    if end_date:
        query = query.filter(StockMovementModel.movement_date <= end_date)

    movements = query.order_by(StockMovementModel.movement_date.desc(), StockMovementModel.created_at.desc()).offset(skip).limit(limit).all()

    # Enrich with product and warehouse details
    result = []
    for movement in movements:
        movement_dict = {
            **movement.__dict__,
            "product_name": None,
            "product_sku": None,
            "warehouse_name": None,
            "to_warehouse_name": None,
        }

        # Get product details
        product = db.query(Product).filter(Product.id == movement.product_id).first()
        if product:
            movement_dict["product_name"] = product.name
            movement_dict["product_sku"] = product.sku

        # Get warehouse details
        warehouse = db.query(Warehouse).filter(Warehouse.id == movement.warehouse_id).first()
        if warehouse:
            movement_dict["warehouse_name"] = warehouse.name

        # Get to_warehouse details for transfers
        if movement.to_warehouse_id:
            to_warehouse = db.query(Warehouse).filter(Warehouse.id == movement.to_warehouse_id).first()
            if to_warehouse:
                movement_dict["to_warehouse_name"] = to_warehouse.name

        result.append(movement_dict)

    return result


@router.post("/adjustment", response_model=StockMovement, status_code=status.HTTP_201_CREATED)
def create_stock_adjustment(
    adjustment_data: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a stock adjustment (increase or decrease)"""
    # Verify product exists and belongs to tenant
    product = db.query(Product).filter(
        Product.id == adjustment_data.product_id,
        Product.tenant_id == current_user.tenant_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Verify warehouse exists and belongs to tenant
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == adjustment_data.warehouse_id,
        Warehouse.tenant_id == current_user.tenant_id,
    ).first()

    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    # Get or create stock record
    stock = get_or_create_stock_record(
        db,
        current_user.tenant_id,
        adjustment_data.product_id,
        adjustment_data.warehouse_id
    )

    # Check if decreasing would result in negative stock
    new_quantity = float(stock.quantity) + float(adjustment_data.quantity)
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Current: {stock.quantity}, Adjustment: {adjustment_data.quantity}",
        )

    # Create stock movement record
    movement = StockMovementModel(
        tenant_id=current_user.tenant_id,
        movement_type=MovementType.ADJUSTMENT,
        movement_date=adjustment_data.movement_date or date.today(),
        product_id=adjustment_data.product_id,
        warehouse_id=adjustment_data.warehouse_id,
        quantity=adjustment_data.quantity,
        reason=adjustment_data.reason,
        notes=adjustment_data.notes,
        created_by=current_user.id,
    )

    db.add(movement)

    # Update stock quantity
    stock.quantity = new_quantity

    db.commit()
    db.refresh(movement)

    return movement


@router.post("/transfer", response_model=StockMovement, status_code=status.HTTP_201_CREATED)
def create_stock_transfer(
    transfer_data: StockTransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transfer stock between warehouses"""
    # Verify product exists
    product = db.query(Product).filter(
        Product.id == transfer_data.product_id,
        Product.tenant_id == current_user.tenant_id,
    ).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Verify both warehouses exist
    from_warehouse = db.query(Warehouse).filter(
        Warehouse.id == transfer_data.from_warehouse_id,
        Warehouse.tenant_id == current_user.tenant_id,
    ).first()

    to_warehouse = db.query(Warehouse).filter(
        Warehouse.id == transfer_data.to_warehouse_id,
        Warehouse.tenant_id == current_user.tenant_id,
    ).first()

    if not from_warehouse or not to_warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Warehouse not found",
        )

    if transfer_data.from_warehouse_id == transfer_data.to_warehouse_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same warehouse",
        )

    # Get or create stock records
    from_stock = get_or_create_stock_record(
        db,
        current_user.tenant_id,
        transfer_data.product_id,
        transfer_data.from_warehouse_id
    )

    to_stock = get_or_create_stock_record(
        db,
        current_user.tenant_id,
        transfer_data.product_id,
        transfer_data.to_warehouse_id
    )

    # Check if source warehouse has sufficient stock
    if float(from_stock.quantity) < float(transfer_data.quantity):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock in {from_warehouse.name}. Available: {from_stock.quantity}",
        )

    # Create transfer movement record
    movement = StockMovementModel(
        tenant_id=current_user.tenant_id,
        movement_type=MovementType.TRANSFER,
        movement_date=transfer_data.movement_date or date.today(),
        product_id=transfer_data.product_id,
        warehouse_id=transfer_data.from_warehouse_id,
        to_warehouse_id=transfer_data.to_warehouse_id,
        quantity=transfer_data.quantity,
        notes=transfer_data.notes,
        created_by=current_user.id,
    )

    db.add(movement)

    # Update stock quantities
    from_stock.quantity = float(from_stock.quantity) - float(transfer_data.quantity)
    to_stock.quantity = float(to_stock.quantity) + float(transfer_data.quantity)

    db.commit()
    db.refresh(movement)

    return movement


@router.get("/stock-levels", response_model=List[dict])
def get_stock_levels(
    product_id: Optional[UUID] = None,
    warehouse_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current stock levels across warehouses"""
    query = db.query(ProductWarehouseStock).filter(
        ProductWarehouseStock.tenant_id == current_user.tenant_id
    )

    if product_id:
        query = query.filter(ProductWarehouseStock.product_id == product_id)

    if warehouse_id:
        query = query.filter(ProductWarehouseStock.warehouse_id == warehouse_id)

    stock_levels = query.all()

    # Enrich with product and warehouse details
    result = []
    for stock in stock_levels:
        product = db.query(Product).filter(Product.id == stock.product_id).first()
        warehouse = db.query(Warehouse).filter(Warehouse.id == stock.warehouse_id).first()

        result.append({
            "id": str(stock.id),
            "product_id": str(stock.product_id),
            "product_name": product.name if product else None,
            "product_sku": product.sku if product else None,
            "warehouse_id": str(stock.warehouse_id),
            "warehouse_name": warehouse.name if warehouse else None,
            "quantity": float(stock.quantity),
            "reserved_quantity": float(stock.reserved_quantity),
            "available_quantity": stock.available_quantity,
            "updated_at": stock.updated_at.isoformat(),
        })

    return result
