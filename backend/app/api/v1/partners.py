"""
Partner API endpoints for managing business relationships
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ...database import get_db
from ...models.auth import Tenant, User
from ...models.single_entry import Partner, PartnerCategory
from ...schemas.single_entry import PartnerCreate, PartnerUpdate, PartnerResponse
from ..deps import get_current_tenant, get_current_user
from .activity_logs import log_activity

router = APIRouter()


@router.get("/", response_model=List[PartnerResponse])
def list_partners(
    category: Optional[PartnerCategory] = None,
    is_active: Optional[bool] = None,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get all partners for the current tenant"""
    query = db.query(Partner).filter(Partner.tenant_id == current_tenant.id)

    if category:
        query = query.filter(Partner.category == category)

    if is_active is not None:
        query = query.filter(Partner.is_active == is_active)

    partners = query.order_by(Partner.name).all()
    return partners


@router.post("/", response_model=PartnerResponse, status_code=status.HTTP_201_CREATED)
def create_partner(
    partner_data: PartnerCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new partner"""
    # Check if partner with same name already exists for this tenant
    existing = db.query(Partner).filter(
        Partner.tenant_id == current_tenant.id,
        Partner.name == partner_data.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Partner with name '{partner_data.name}' already exists"
        )

    # Explicitly convert data and ensure category is lowercase string value
    data = partner_data.model_dump()
    # Force category to be the lowercase string value
    if 'category' in data:
        category_value = data['category']
        # If it's an enum, get its value
        if isinstance(category_value, PartnerCategory):
            category_value = category_value.value
        elif hasattr(category_value, 'value'):
            category_value = category_value.value
        # Convert to lowercase if it's a string
        if isinstance(category_value, str):
            data['category'] = category_value.lower()

    partner = Partner(
        tenant_id=current_tenant.id,
        **data
    )

    db.add(partner)
    db.commit()
    db.refresh(partner)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="create",
        entity_type="PARTNER",
        entity_id=str(partner.id),
        entity_name=partner.name,
        description=f"Created partner: {partner.name} ({partner.category.value})",
        request=request,
    )

    return partner


@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(
    partner_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get a specific partner by ID"""
    partner = db.query(Partner).filter(
        Partner.id == partner_id,
        Partner.tenant_id == current_tenant.id
    ).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )

    return partner


@router.put("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: UUID,
    partner_data: PartnerUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update a partner"""
    partner = db.query(Partner).filter(
        Partner.id == partner_id,
        Partner.tenant_id == current_tenant.id
    ).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )

    # Check if updating name to an existing one
    if partner_data.name and partner_data.name != partner.name:
        existing = db.query(Partner).filter(
            Partner.tenant_id == current_tenant.id,
            Partner.name == partner_data.name,
            Partner.id != partner_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Partner with name '{partner_data.name}' already exists"
            )

    # Update fields
    update_data = partner_data.model_dump(exclude_unset=True)
    # Force category to be the lowercase string value if present
    if 'category' in update_data:
        category_value = update_data['category']
        # If it's an enum, get its value
        if isinstance(category_value, PartnerCategory):
            category_value = category_value.value
        elif hasattr(category_value, 'value'):
            category_value = category_value.value
        # Convert to lowercase if it's a string
        if isinstance(category_value, str):
            update_data['category'] = category_value.lower()

    for field, value in update_data.items():
        setattr(partner, field, value)

    db.commit()
    db.refresh(partner)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="update",
        entity_type="PARTNER",
        entity_id=str(partner.id),
        entity_name=partner.name,
        description=f"Updated partner: {partner.name}",
        request=request,
    )

    return partner


@router.delete("/{partner_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_partner(
    partner_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete a partner"""
    partner = db.query(Partner).filter(
        Partner.id == partner_id,
        Partner.tenant_id == current_tenant.id
    ).first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found"
        )

    # Save partner info for logging
    partner_name = partner.name
    partner_id_str = str(partner.id)

    db.delete(partner)
    db.commit()

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type="delete",
        entity_type="PARTNER",
        entity_id=partner_id_str,
        entity_name=partner_name,
        description=f"Deleted partner: {partner_name}",
        request=request,
    )

    return None
 
