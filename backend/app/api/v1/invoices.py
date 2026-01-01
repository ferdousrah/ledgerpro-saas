"""
Invoices API endpoints for billing and payments
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func, desc
from typing import List, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.invoice import (
    Invoice,
    InvoiceLineItem,
    InvoicePayment,
    InvoiceStatus,
    PaymentTerms,
    PaymentMethod
)
from ...models.single_entry import Partner, TaxRate, MoneyAccount, Transaction, TransactionType
from ...models.fiscal_year import FinancialYear
from ...schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceWithDetails,
    InvoiceLineItemCreate,
    InvoiceLineItemWithDetails,
    InvoicePaymentCreate,
    InvoicePaymentResponse,
    InvoicePaymentWithDetails,
    InvoiceStats
)
from ..deps import get_current_user, get_current_tenant
from .activity_logs import log_activity
from ...services.invoice_service import InvoiceService
from ...models.activity_log import ActivityType, ActivityEntity

router = APIRouter()


@router.get("/stats", response_model=InvoiceStats)
def get_invoice_stats(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get invoice dashboard statistics"""
    service = InvoiceService(db, current_tenant.id)
    stats = service.get_invoice_stats()

    return InvoiceStats(**stats)


@router.get("/", response_model=List[InvoiceWithDetails])
def list_invoices(
    status_filter: Optional[InvoiceStatus] = None,
    customer_id: Optional[UUID] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    List invoices with optional filters:
    - status: Filter by invoice status
    - customer_id: Filter by customer
    - start_date/end_date: Filter by invoice date range
    """
    query = db.query(Invoice).filter(Invoice.tenant_id == current_tenant.id)

    if status_filter:
        query = query.filter(Invoice.status == status_filter)

    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)

    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)

    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    query = query.options(
        joinedload(Invoice.customer),
        joinedload(Invoice.line_items)
    )

    invoices = query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()

    # Build response with details
    result = []
    for invoice in invoices:
        invoice_dict = InvoiceResponse.from_orm(invoice).dict()
        invoice_dict["customer_name"] = invoice.customer.name if invoice.customer else None
        invoice_dict["customer_email"] = invoice.customer.email if invoice.customer else None
        invoice_dict["customer_address"] = invoice.customer.address if invoice.customer else None

        # Get line items with details
        line_items = []
        for item in invoice.line_items:
            item_dict = InvoiceLineItemWithDetails.from_orm(item).dict()
            item_dict["category_name"] = item.category.name if item.category else None
            line_items.append(InvoiceLineItemWithDetails(**item_dict))

        invoice_dict["line_items"] = line_items

        # Get payments count
        payments_count = db.query(func.count(InvoicePayment.id)).filter(
            InvoicePayment.invoice_id == invoice.id
        ).scalar()
        invoice_dict["payments_count"] = payments_count

        result.append(InvoiceWithDetails(**invoice_dict))

    return result


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_data: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Create a new invoice"""
    service = InvoiceService(db, current_tenant.id)

    # Validate customer exists and belongs to tenant
    customer = db.query(Partner).filter(
        and_(
            Partner.id == invoice_data.customer_id,
            Partner.tenant_id == current_tenant.id,
            Partner.category == "customer"
        )
    ).first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )

    if not customer.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create invoice for inactive customer"
        )

    # Generate invoice number
    invoice_number = service.generate_invoice_number(invoice_data.invoice_date)

    # Calculate due date
    due_date = service.calculate_due_date(
        invoice_data.invoice_date,
        invoice_data.payment_terms,
        invoice_data.custom_payment_terms_days
    )

    # Auto-assign fiscal year based on invoice date
    fiscal_year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.tenant_id == current_tenant.id,
            FinancialYear.start_date <= invoice_data.invoice_date,
            FinancialYear.end_date >= invoice_data.invoice_date
        )
    ).first()
    fiscal_year_id = fiscal_year.id if fiscal_year else None

    # Create invoice
    invoice = Invoice(
        tenant_id=current_tenant.id,
        invoice_number=invoice_number,
        customer_id=invoice_data.customer_id,
        invoice_date=invoice_data.invoice_date,
        due_date=due_date,
        payment_terms=invoice_data.payment_terms,
        custom_payment_terms_days=invoice_data.custom_payment_terms_days,
        discount_amount=float(invoice_data.discount_amount) if invoice_data.discount_amount else 0.00,
        notes=invoice_data.notes,
        terms_and_conditions=invoice_data.terms_and_conditions,
        footer_text=invoice_data.footer_text,
        reference_number=invoice_data.reference_number,
        fiscal_year_id=fiscal_year_id,
        created_by=current_user.id
    )

    db.add(invoice)
    db.flush()  # Get invoice.id

    # Create line items using tenant's default tax rate
    tenant_tax_rate = Decimal(str(current_tenant.default_tax_rate)) if current_tenant.default_tax_rate else Decimal("0.00")

    for line_item_data in invoice_data.line_items:
        # Calculate line item totals using tenant's default tax rate
        totals = service.calculate_line_item_totals(line_item_data, tenant_tax_rate)

        line_item = InvoiceLineItem(
            tenant_id=current_tenant.id,
            invoice_id=invoice.id,
            line_number=line_item_data.line_number,
            description=line_item_data.description,
            quantity=float(line_item_data.quantity),
            unit_price=float(line_item_data.unit_price),
            subtotal=float(totals["subtotal"]),
            tax_rate_percentage=float(totals["tax_rate_percentage"]) if totals["tax_rate_percentage"] else None,
            tax_amount=float(totals["tax_amount"]),
            line_total=float(totals["line_total"]),
            category_id=line_item_data.category_id
        )

        db.add(line_item)

    db.commit()
    db.refresh(invoice)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.CREATE,
        entity_type=ActivityEntity.INVOICE,
        entity_id=str(invoice.id),
        entity_name=invoice.invoice_number,
        description=f"Created invoice {invoice.invoice_number} for {customer.name}"
    )

    return InvoiceResponse.from_orm(invoice)


@router.get("/{invoice_id}", response_model=InvoiceWithDetails)
def get_invoice(
    invoice_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Get invoice by ID with full details"""
    invoice = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.line_items),
        joinedload(Invoice.payments)
    ).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Build response with details
    invoice_dict = InvoiceResponse.from_orm(invoice).dict()
    invoice_dict["customer_name"] = invoice.customer.name if invoice.customer else None
    invoice_dict["customer_email"] = invoice.customer.email if invoice.customer else None
    invoice_dict["customer_address"] = invoice.customer.address if invoice.customer else None

    # Get line items with details
    line_items = []
    for item in invoice.line_items:
        item_dict = InvoiceLineItemWithDetails.from_orm(item).dict()
        item_dict["category_name"] = item.category.name if item.category else None
        line_items.append(InvoiceLineItemWithDetails(**item_dict))

    invoice_dict["line_items"] = line_items
    invoice_dict["payments_count"] = len(invoice.payments)

    return InvoiceWithDetails(**invoice_dict)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: UUID,
    invoice_data: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Update invoice (only DRAFT or SENT invoices without payments)"""
    service = InvoiceService(db, current_tenant.id)

    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Validate editable
    is_valid, error_msg = service.validate_invoice_editable(invoice)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Update fields
    update_data = invoice_data.dict(exclude_unset=True)

    # Handle line items separately
    line_items_data = update_data.pop("line_items", None)

    # Update invoice fields
    for field, value in update_data.items():
        setattr(invoice, field, value)

    # Recalculate due date if invoice_date or payment_terms changed
    if invoice_data.invoice_date or invoice_data.payment_terms:
        invoice.due_date = service.calculate_due_date(
            invoice.invoice_date,
            invoice.payment_terms,
            invoice.custom_payment_terms_days
        )

    # Update line items if provided
    if line_items_data is not None:
        # Delete existing line items
        db.query(InvoiceLineItem).filter(
            InvoiceLineItem.invoice_id == invoice.id
        ).delete()

        # Create new line items using tenant's default tax rate
        tenant_tax_rate = Decimal(str(current_tenant.default_tax_rate)) if current_tenant.default_tax_rate else Decimal("0.00")

        for line_item_data in line_items_data:
            item_create = InvoiceLineItemCreate(**line_item_data)

            # Calculate line item totals using tenant's default tax rate
            totals = service.calculate_line_item_totals(item_create, tenant_tax_rate)

            line_item = InvoiceLineItem(
                tenant_id=current_tenant.id,
                invoice_id=invoice.id,
                line_number=item_create.line_number,
                description=item_create.description,
                quantity=float(item_create.quantity),
                unit_price=float(item_create.unit_price),
                subtotal=float(totals["subtotal"]),
                tax_rate_percentage=float(totals["tax_rate_percentage"]) if totals["tax_rate_percentage"] else None,
                tax_amount=float(totals["tax_amount"]),
                line_total=float(totals["line_total"]),
                category_id=item_create.category_id
            )

            db.add(line_item)

    db.commit()
    db.refresh(invoice)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.UPDATE,
        entity_type=ActivityEntity.INVOICE,
        entity_id=str(invoice.id),
        entity_name=invoice.invoice_number,
        description=f"Updated invoice {invoice.invoice_number}"
    )

    return InvoiceResponse.from_orm(invoice)


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete invoice (only DRAFT invoices without payments)"""
    service = InvoiceService(db, current_tenant.id)

    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Validate deletable
    is_valid, error_msg = service.validate_invoice_deletable(invoice)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    invoice_number = invoice.invoice_number

    # Delete invoice (cascade will delete line items)
    db.delete(invoice)
    db.commit()

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.DELETE,
        entity_type=ActivityEntity.INVOICE,
        entity_id=str(invoice_id),
        entity_name=invoice_number,
        description=f"Deleted invoice {invoice_number}"
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
def send_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Mark invoice as SENT"""
    from datetime import datetime

    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot send invoice with status: {invoice.status.value}"
        )

    invoice.status = InvoiceStatus.sent
    invoice.sent_at = datetime.utcnow()
    invoice.sent_by = current_user.id

    db.commit()
    db.refresh(invoice)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.UPDATE,
        entity_type=ActivityEntity.INVOICE,
        entity_id=str(invoice.id),
        entity_name=invoice.invoice_number,
        description=f"Sent invoice {invoice.invoice_number}"
    )

    return InvoiceResponse.from_orm(invoice)


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Cancel invoice (no payments allowed)"""
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Check for payments
    payments_count = db.query(func.count(InvoicePayment.id)).filter(
        InvoicePayment.invoice_id == invoice.id
    ).scalar()

    if payments_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel invoice with existing payments"
        )

    invoice.status = InvoiceStatus.cancelled

    db.commit()
    db.refresh(invoice)

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.UPDATE,
        entity_type=ActivityEntity.INVOICE,
        entity_id=str(invoice.id),
        entity_name=invoice.invoice_number,
        description=f"Cancelled invoice {invoice.invoice_number}"
    )

    return InvoiceResponse.from_orm(invoice)


# ============ Invoice Payment Endpoints ============

@router.get("/{invoice_id}/payments", response_model=List[InvoicePaymentWithDetails])
def list_invoice_payments(
    invoice_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """List all payments for an invoice"""
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    payments = db.query(InvoicePayment).options(
        joinedload(InvoicePayment.account)
    ).filter(
        InvoicePayment.invoice_id == invoice_id
    ).order_by(InvoicePayment.payment_date.desc()).all()

    # Build response with details
    result = []
    for payment in payments:
        payment_dict = InvoicePaymentResponse.from_orm(payment).dict()
        payment_dict["account_name"] = payment.account.name if payment.account else None
        payment_dict["invoice_number"] = invoice.invoice_number
        result.append(InvoicePaymentWithDetails(**payment_dict))

    return result


@router.post("/{invoice_id}/payments", response_model=InvoicePaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    invoice_id: UUID,
    payment_data: InvoicePaymentCreate,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Record payment for invoice"""
    service = InvoiceService(db, current_tenant.id)

    # Get invoice
    invoice = db.query(Invoice).filter(
        and_(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_tenant.id
        )
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found"
        )

    # Cannot record payment on cancelled invoice
    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record payment on cancelled invoice"
        )

    # Validate payment amount
    is_valid, error_msg = service.validate_payment_amount(
        invoice,
        Decimal(str(payment_data.amount))
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Validate account exists
    account = db.query(MoneyAccount).filter(
        and_(
            MoneyAccount.id == payment_data.account_id,
            MoneyAccount.tenant_id == current_tenant.id
        )
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Money account not found"
        )

    # Create payment record
    payment = InvoicePayment(
        tenant_id=current_tenant.id,
        invoice_id=invoice.id,
        payment_date=payment_data.payment_date,
        amount=float(payment_data.amount),
        payment_method=payment_data.payment_method,
        account_id=payment_data.account_id,
        reference_number=payment_data.reference_number,
        notes=payment_data.notes,
        created_by=current_user.id
    )

    db.add(payment)
    db.flush()  # Get payment.id

    # Create INCOME transaction
    transaction = service.create_payment_transaction(invoice, payment, current_user.id)
    payment.transaction_id = transaction.id

    db.commit()
    db.refresh(payment)
    db.refresh(invoice)  # Refresh to get updated balances from trigger

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.CREATE,
        entity_type=ActivityEntity.INVOICE_PAYMENT,
        entity_id=str(payment.id),
        entity_name=f"{invoice.invoice_number} - ${payment.amount}",
        description=f"Recorded payment of ${payment.amount} for invoice {invoice.invoice_number}"
    )

    return InvoicePaymentResponse.from_orm(payment)


@router.delete("/{invoice_id}/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(
    invoice_id: UUID,
    payment_id: UUID,
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Delete payment record"""
    service = InvoiceService(db, current_tenant.id)

    # Get payment
    payment = db.query(InvoicePayment).filter(
        and_(
            InvoicePayment.id == payment_id,
            InvoicePayment.invoice_id == invoice_id,
            InvoicePayment.tenant_id == current_tenant.id
        )
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )

    payment_amount = payment.amount
    invoice_number = payment.invoice.invoice_number if payment.invoice else None
    transaction_id = payment.transaction_id

    # Get the invoice before deleting payment
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    # Delete associated transaction FIRST (before deleting payment)
    if transaction_id:
        print(f"[DEBUG] Found transaction_id: {transaction_id}, attempting to delete transaction")
        transaction = db.query(Transaction).filter(
            and_(
                Transaction.id == transaction_id,
                Transaction.tenant_id == current_tenant.id
            )
        ).first()

        if transaction:
            print(f"[DEBUG] Transaction found: {transaction.id}, amount: {transaction.amount}, deleting...")
            # Reverse account balance
            account = db.query(MoneyAccount).filter(
                MoneyAccount.id == transaction.account_id
            ).first()

            if account:
                account.current_balance = float(Decimal(str(account.current_balance)) - Decimal(str(transaction.amount)))

            # Delete transaction
            db.delete(transaction)
            db.flush()  # Flush transaction deletion first
            print(f"[DEBUG] Transaction {transaction.id} deleted successfully")
        else:
            print(f"[DEBUG] Transaction not found with ID: {transaction_id}")
    else:
        print(f"[DEBUG] No transaction_id found on payment {payment_id}")

    # Delete payment (trigger will update invoice totals)
    db.delete(payment)
    db.flush()  # Flush to execute the delete and trigger

    # Refresh invoice to get updated totals from trigger
    db.refresh(invoice)

    # Update status based on new totals
    new_status = service.update_invoice_status(invoice)
    invoice.status = new_status

    db.commit()

    # Log activity
    log_activity(
        db=db,
        user=current_user,
        activity_type=ActivityType.DELETE,
        entity_type=ActivityEntity.INVOICE_PAYMENT,
        entity_id=str(payment_id),
        entity_name=f"{invoice_number} - ${payment_amount}",
        description=f"Deleted payment of ${payment_amount} for invoice {invoice_number}"
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
