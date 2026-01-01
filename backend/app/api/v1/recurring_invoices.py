"""
Recurring Invoices API endpoints for invoice templates
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import date

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.invoice import (
    RecurringInvoice,
    RecurringInvoiceLineItem
)
from ...models.single_entry import Partner, TaxRate
from ...schemas.invoice import (
    RecurringInvoiceCreate,
    RecurringInvoiceUpdate,
    RecurringInvoiceResponse,
    RecurringInvoiceWithDetails,
    RecurringInvoiceLineItemResponse
)
from ..deps import get_current_user, get_current_tenant
from .activity_logs import log_activity
from ...services.recurring_invoice_service import RecurringInvoiceService
from ...models.activity_log import ActivityType, ActivityEntity

router = APIRouter()


@router.get("/", response_model=List[RecurringInvoiceWithDetails])
def list_recurring_invoices(
    is_active: Optional[bool] = None,
    customer_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """List recurring invoice templates with optional filters"""
    query = db.query(RecurringInvoice).filter(
        RecurringInvoice.tenant_id == current_tenant.id
    )

    if is_active is not None:
        query = query.filter(RecurringInvoice.is_active == is_active)

    if customer_id:
        query = query.filter(RecurringInvoice.customer_id == customer_id)

    query = query.options(
        joinedload(RecurringInvoice.customer),
        joinedload(RecurringInvoice.line_items)
    )

    templates = query.order_by(desc(RecurringInvoice.created_at)).offset(skip).limit(limit).all()

    # Build response with details
    result = []
    for template in templates:
        template_dict = RecurringInvoiceResponse.from_orm(template).dict()
        template_dict["customer_name"] = template.customer.name if template.customer else None

        # Get line items
        line_items = [
            RecurringInvoiceLineItemResponse.from_orm(item)
            for item in template.line_items
        ]
        template_dict["line_items"] = line_items

        # Count generated invoices
        from ...models.invoice import Invoice
        generated_count = db.query(func.count(Invoice.id)).filter(
            Invoice.recurring_invoice_id == template.id
        ).scalar()
        template_dict["generated_invoices_count"] = generated_count

        result.append(RecurringInvoiceWithDetails(**template_dict))

    return result


@router.post("/", response_model=RecurringInvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_invoice(
    template_data: RecurringInvoiceCreate,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new recurring invoice template"""
    # Validate customer exists
    customer = db.query(Partner).filter(
        and_(
            Partner.id == template_data.customer_id,
            Partner.tenant_id == current_tenant.id,
            Partner.category == "customer"
        )
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    # Create recurring invoice
    recurring_invoice = RecurringInvoice(
        tenant_id=current_tenant.id,
        template_name=template_data.template_name,
        customer_id=template_data.customer_id,
        frequency=template_data.frequency,
        start_date=template_data.start_date,
        end_date=template_data.end_date,
        next_invoice_date=template_data.start_date,  # First invoice on start date
        payment_terms=template_data.payment_terms,
        notes=template_data.notes,
        terms_and_conditions=template_data.terms_and_conditions,
        is_active=template_data.is_active,
        created_by=current_user.id
    )

    db.add(recurring_invoice)
    db.flush()  # Get ID

    # Create line items
    for line_item_data in template_data.line_items:
        line_item = RecurringInvoiceLineItem(
            tenant_id=current_tenant.id,
            recurring_invoice_id=recurring_invoice.id,
            line_number=line_item_data.line_number,
            description=line_item_data.description,
            quantity=float(line_item_data.quantity),
            unit_price=float(line_item_data.unit_price),
            tax_rate_id=line_item_data.tax_rate_id,
            category_id=line_item_data.category_id
        )

        db.add(line_item)

    db.commit()
    db.refresh(recurring_invoice)

    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        tenant_id=current_tenant.id,
        activity_type=ActivityType.CREATE,
        entity_type=ActivityEntity.RECURRING_INVOICE,
        entity_id=str(recurring_invoice.id),
        entity_name=recurring_invoice.template_name,
        description=f"Created recurring invoice template '{recurring_invoice.template_name}'"
    )

    return RecurringInvoiceResponse.from_orm(recurring_invoice)


@router.get("/{template_id}", response_model=RecurringInvoiceWithDetails)
def get_recurring_invoice(
    template_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get recurring invoice template by ID"""
    template = db.query(RecurringInvoice).options(
        joinedload(RecurringInvoice.customer),
        joinedload(RecurringInvoice.line_items)
    ).filter(
        and_(
            RecurringInvoice.id == template_id,
            RecurringInvoice.tenant_id == current_tenant.id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring invoice template not found"
        )

    # Build response
    template_dict = RecurringInvoiceResponse.from_orm(template).dict()
    template_dict["customer_name"] = template.customer.name if template.customer else None

    line_items = [
        RecurringInvoiceLineItemResponse.from_orm(item)
        for item in template.line_items
    ]
    template_dict["line_items"] = line_items

    # Count generated invoices
    from ...models.invoice import Invoice
    generated_count = db.query(func.count(Invoice.id)).filter(
        Invoice.recurring_invoice_id == template.id
    ).scalar()
    template_dict["generated_invoices_count"] = generated_count

    return RecurringInvoiceWithDetails(**template_dict)


@router.put("/{template_id}", response_model=RecurringInvoiceResponse)
def update_recurring_invoice(
    template_id: UUID,
    template_data: RecurringInvoiceUpdate,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update recurring invoice template"""
    service = RecurringInvoiceService(db, current_tenant.id)

    template = db.query(RecurringInvoice).filter(
        and_(
            RecurringInvoice.id == template_id,
            RecurringInvoice.tenant_id == current_tenant.id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring invoice template not found"
        )

    # Update fields
    update_data = template_data.dict(exclude_unset=True)

    # Handle line items separately
    line_items_data = update_data.pop("line_items", None)

    # Update template fields
    for field, value in update_data.items():
        setattr(template, field, value)

    # Update line items if provided
    if line_items_data is not None:
        # Delete existing line items
        db.query(RecurringInvoiceLineItem).filter(
            RecurringInvoiceLineItem.recurring_invoice_id == template.id
        ).delete()

        # Create new line items
        for line_item_data in line_items_data:
            from ...schemas.invoice import RecurringInvoiceLineItemCreate
            item_create = RecurringInvoiceLineItemCreate(**line_item_data)

            line_item = RecurringInvoiceLineItem(
                tenant_id=current_tenant.id,
                recurring_invoice_id=template.id,
                line_number=item_create.line_number,
                description=item_create.description,
                quantity=float(item_create.quantity),
                unit_price=float(item_create.unit_price),
                tax_rate_id=item_create.tax_rate_id,
                category_id=item_create.category_id
            )

            db.add(line_item)

    db.commit()
    db.refresh(template)

    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        tenant_id=current_tenant.id,
        activity_type=ActivityType.UPDATE,
        entity_type=ActivityEntity.RECURRING_INVOICE,
        entity_id=str(template.id),
        entity_name=template.template_name,
        description=f"Updated recurring invoice template '{template.template_name}'"
    )

    return RecurringInvoiceResponse.from_orm(template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recurring_invoice(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete recurring invoice template"""
    template = db.query(RecurringInvoice).filter(
        and_(
            RecurringInvoice.id == template_id,
            RecurringInvoice.tenant_id == current_tenant.id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring invoice template not found"
        )

    template_name = template.template_name

    # Delete template (cascade will handle line items)
    db.delete(template)
    db.commit()

    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        tenant_id=current_tenant.id,
        activity_type=ActivityType.DELETE,
        entity_type=ActivityEntity.RECURRING_INVOICE,
        entity_id=str(template_id),
        entity_name=template_name,
        description=f"Deleted recurring invoice template '{template_name}'"
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{template_id}/pause", response_model=RecurringInvoiceResponse)
def pause_recurring_invoice(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Pause recurring invoice template"""
    service = RecurringInvoiceService(db, current_tenant.id)

    template = db.query(RecurringInvoice).filter(
        and_(
            RecurringInvoice.id == template_id,
            RecurringInvoice.tenant_id == current_tenant.id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring invoice template not found"
        )

    success = service.pause_recurring_invoice(template_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause recurring invoice"
        )

    db.refresh(template)

    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        tenant_id=current_tenant.id,
        activity_type=ActivityType.UPDATE,
        entity_type=ActivityEntity.RECURRING_INVOICE,
        entity_id=str(template.id),
        entity_name=template.template_name,
        description=f"Paused recurring invoice template '{template.template_name}'"
    )

    return RecurringInvoiceResponse.from_orm(template)


@router.post("/{template_id}/resume", response_model=RecurringInvoiceResponse)
def resume_recurring_invoice(
    template_id: UUID,
    new_next_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Resume paused recurring invoice template"""
    service = RecurringInvoiceService(db, current_tenant.id)

    template = db.query(RecurringInvoice).filter(
        and_(
            RecurringInvoice.id == template_id,
            RecurringInvoice.tenant_id == current_tenant.id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring invoice template not found"
        )

    success = service.resume_recurring_invoice(template_id, new_next_date)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume recurring invoice"
        )

    db.refresh(template)

    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        tenant_id=current_tenant.id,
        activity_type=ActivityType.UPDATE,
        entity_type=ActivityEntity.RECURRING_INVOICE,
        entity_id=str(template.id),
        entity_name=template.template_name,
        description=f"Resumed recurring invoice template '{template.template_name}'"
    )

    return RecurringInvoiceResponse.from_orm(template)


@router.post("/{template_id}/generate")
def generate_invoice_now(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Manually generate invoice from template"""
    from ...schemas.invoice import InvoiceResponse
    service = RecurringInvoiceService(db, current_tenant.id)

    template = db.query(RecurringInvoice).filter(
        and_(
            RecurringInvoice.id == template_id,
            RecurringInvoice.tenant_id == current_tenant.id
        )
    ).first()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring invoice template not found"
        )

    # Generate invoice
    invoice = service.generate_invoice_from_template(template_id, current_user.id)

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate invoice from template"
        )

    # Log activity
    log_activity(
        db=db,
        user_id=current_user.id,
        tenant_id=current_tenant.id,
        activity_type=ActivityType.CREATE,
        entity_type=ActivityEntity.INVOICE,
        entity_id=str(invoice.id),
        entity_name=invoice.invoice_number,
        description=f"Generated invoice {invoice.invoice_number} from template '{template.template_name}'"
    )

    return InvoiceResponse.from_orm(invoice)
