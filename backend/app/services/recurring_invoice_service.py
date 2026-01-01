"""
Recurring Invoice Service - Template Management and Auto-Generation
Handles recurring invoice templates and automatic invoice generation
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal
import logging

from ..models.invoice import (
    RecurringInvoice,
    RecurringInvoiceLineItem,
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    PaymentTerms
)
from ..models.single_entry import RecurrenceFrequency
from .invoice_service import InvoiceService

logger = logging.getLogger(__name__)


class RecurringInvoiceService:
    """Service class for recurring invoice operations"""

    def __init__(self, db: Session, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id
        self.invoice_service = InvoiceService(db, tenant_id)

    def calculate_next_invoice_date(
        self,
        current_date: date,
        frequency: RecurrenceFrequency
    ) -> date:
        """
        Calculate next invoice date based on frequency

        Args:
            current_date: Current invoice date
            frequency: Recurrence frequency

        Returns:
            date: Next invoice date
        """
        if frequency == RecurrenceFrequency.DAILY:
            return current_date + timedelta(days=1)
        elif frequency == RecurrenceFrequency.WEEKLY:
            return current_date + timedelta(weeks=1)
        elif frequency == RecurrenceFrequency.MONTHLY:
            return current_date + relativedelta(months=1)
        elif frequency == RecurrenceFrequency.QUARTERLY:
            return current_date + relativedelta(months=3)
        elif frequency == RecurrenceFrequency.YEARLY:
            return current_date + relativedelta(years=1)
        else:
            # Default to monthly if invalid
            return current_date + relativedelta(months=1)

    def generate_invoice_from_template(
        self,
        recurring_invoice_id: UUID,
        user_id: Optional[UUID] = None
    ) -> Optional[Invoice]:
        """
        Generate a new invoice from a recurring invoice template

        Args:
            recurring_invoice_id: Recurring invoice template ID
            user_id: User creating the invoice

        Returns:
            Invoice: Newly created invoice or None if failed
        """
        # Get recurring invoice template with line items
        recurring_invoice = self.db.query(RecurringInvoice).filter(
            and_(
                RecurringInvoice.id == recurring_invoice_id,
                RecurringInvoice.tenant_id == self.tenant_id,
                RecurringInvoice.is_active == True
            )
        ).first()

        if not recurring_invoice:
            logger.warning(f"Recurring invoice {recurring_invoice_id} not found or inactive")
            return None

        # Check if we should generate (next_invoice_date <= today)
        if recurring_invoice.next_invoice_date > date.today():
            logger.info(f"Recurring invoice {recurring_invoice_id} not due yet")
            return None

        # Check if past end_date
        if recurring_invoice.end_date and date.today() > recurring_invoice.end_date:
            logger.info(f"Recurring invoice {recurring_invoice_id} past end date, deactivating")
            recurring_invoice.is_active = False
            self.db.commit()
            return None

        try:
            # Generate invoice number
            invoice_number = self.invoice_service.generate_invoice_number()

            # Calculate due date
            invoice_date = date.today()
            due_date = self.invoice_service.calculate_due_date(
                invoice_date,
                recurring_invoice.payment_terms
            )

            # Auto-assign fiscal year based on invoice date
            from ..models.fiscal_year import FinancialYear
            fiscal_year = self.db.query(FinancialYear).filter(
                and_(
                    FinancialYear.tenant_id == self.tenant_id,
                    FinancialYear.start_date <= invoice_date,
                    FinancialYear.end_date >= invoice_date
                )
            ).first()
            fiscal_year_id = fiscal_year.id if fiscal_year else None

            # Create invoice
            invoice = Invoice(
                tenant_id=self.tenant_id,
                invoice_number=invoice_number,
                customer_id=recurring_invoice.customer_id,
                invoice_date=invoice_date,
                due_date=due_date,
                payment_terms=recurring_invoice.payment_terms,
                status=InvoiceStatus.draft,  # Created as DRAFT
                notes=recurring_invoice.notes,
                terms_and_conditions=recurring_invoice.terms_and_conditions,
                recurring_invoice_id=recurring_invoice.id,
                fiscal_year_id=fiscal_year_id,
                created_by=user_id
            )

            self.db.add(invoice)
            self.db.flush()  # Get invoice.id

            # Copy line items from template
            template_line_items = self.db.query(RecurringInvoiceLineItem).filter(
                RecurringInvoiceLineItem.recurring_invoice_id == recurring_invoice_id
            ).order_by(RecurringInvoiceLineItem.line_number).all()

            for template_item in template_line_items:
                # Get current tax rate if applicable
                tax_rate_percentage = None
                if template_item.tax_rate_id:
                    from ..models.single_entry import TaxRate
                    tax_rate = self.db.query(TaxRate).filter(
                        TaxRate.id == template_item.tax_rate_id
                    ).first()
                    tax_rate_percentage = tax_rate.rate if tax_rate else None

                # Calculate totals
                quantity = Decimal(str(template_item.quantity))
                unit_price = Decimal(str(template_item.unit_price))
                subtotal = quantity * unit_price

                tax_amount = Decimal("0.00")
                if tax_rate_percentage:
                    tax_amount = (subtotal * Decimal(str(tax_rate_percentage))) / Decimal("100")

                line_total = subtotal + tax_amount

                # Create line item
                line_item = InvoiceLineItem(
                    tenant_id=self.tenant_id,
                    invoice_id=invoice.id,
                    line_number=template_item.line_number,
                    description=template_item.description,
                    quantity=template_item.quantity,
                    unit_price=template_item.unit_price,
                    subtotal=float(subtotal),
                    tax_rate_id=template_item.tax_rate_id,
                    tax_rate_percentage=float(tax_rate_percentage) if tax_rate_percentage else None,
                    tax_amount=float(tax_amount),
                    line_total=float(line_total),
                    category_id=template_item.category_id
                )

                self.db.add(line_item)

            # Update recurring invoice
            recurring_invoice.last_generated_date = date.today()
            recurring_invoice.next_invoice_date = self.calculate_next_invoice_date(
                date.today(),
                recurring_invoice.frequency
            )
            recurring_invoice.updated_at = datetime.utcnow()

            self.db.commit()

            logger.info(f"Generated invoice {invoice.invoice_number} from template {recurring_invoice_id}")

            return invoice

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to generate invoice from template {recurring_invoice_id}: {str(e)}")
            return None

    def process_recurring_invoices(self) -> Dict[str, Any]:
        """
        Process all active recurring invoices and generate due invoices
        This should be called by a daily background job

        Returns:
            Dict with processing statistics
        """
        start_time = datetime.utcnow()
        generated_count = 0
        failed_count = 0
        deactivated_count = 0

        # Get all active recurring invoices due for generation
        recurring_invoices = self.db.query(RecurringInvoice).filter(
            and_(
                RecurringInvoice.tenant_id == self.tenant_id,
                RecurringInvoice.is_active == True,
                RecurringInvoice.next_invoice_date <= date.today()
            )
        ).all()

        logger.info(f"Processing {len(recurring_invoices)} recurring invoices for tenant {self.tenant_id}")

        for recurring_invoice in recurring_invoices:
            # Check if past end date
            if recurring_invoice.end_date and date.today() > recurring_invoice.end_date:
                recurring_invoice.is_active = False
                deactivated_count += 1
                continue

            # Generate invoice
            invoice = self.generate_invoice_from_template(recurring_invoice.id)

            if invoice:
                generated_count += 1
            else:
                failed_count += 1

        # Commit deactivations
        if deactivated_count > 0:
            self.db.commit()

        execution_time = (datetime.utcnow() - start_time).total_seconds()

        result = {
            "success": True,
            "tenant_id": str(self.tenant_id),
            "processed_count": len(recurring_invoices),
            "generated_count": generated_count,
            "failed_count": failed_count,
            "deactivated_count": deactivated_count,
            "execution_time_seconds": execution_time
        }

        logger.info(f"Recurring invoice processing complete: {result}")

        return result

    def pause_recurring_invoice(self, recurring_invoice_id: UUID) -> bool:
        """
        Pause a recurring invoice template

        Args:
            recurring_invoice_id: Recurring invoice ID

        Returns:
            bool: Success status
        """
        recurring_invoice = self.db.query(RecurringInvoice).filter(
            and_(
                RecurringInvoice.id == recurring_invoice_id,
                RecurringInvoice.tenant_id == self.tenant_id
            )
        ).first()

        if not recurring_invoice:
            return False

        recurring_invoice.is_active = False
        recurring_invoice.updated_at = datetime.utcnow()

        self.db.commit()

        logger.info(f"Paused recurring invoice {recurring_invoice_id}")

        return True

    def resume_recurring_invoice(
        self,
        recurring_invoice_id: UUID,
        new_next_date: Optional[date] = None
    ) -> bool:
        """
        Resume a paused recurring invoice template

        Args:
            recurring_invoice_id: Recurring invoice ID
            new_next_date: Optional new next invoice date (defaults to today)

        Returns:
            bool: Success status
        """
        recurring_invoice = self.db.query(RecurringInvoice).filter(
            and_(
                RecurringInvoice.id == recurring_invoice_id,
                RecurringInvoice.tenant_id == self.tenant_id
            )
        ).first()

        if not recurring_invoice:
            return False

        recurring_invoice.is_active = True

        if new_next_date:
            recurring_invoice.next_invoice_date = new_next_date
        else:
            recurring_invoice.next_invoice_date = date.today()

        recurring_invoice.updated_at = datetime.utcnow()

        self.db.commit()

        logger.info(f"Resumed recurring invoice {recurring_invoice_id} with next date {recurring_invoice.next_invoice_date}")

        return True


# Helper function to be called by background job scheduler
def process_all_tenants_recurring_invoices(db: Session) -> List[Dict[str, Any]]:
    """
    Process recurring invoices for all tenants
    Called by background job scheduler (e.g., APScheduler, Celery)

    Args:
        db: Database session

    Returns:
        List of processing results for each tenant
    """
    from ..models.auth import Tenant

    results = []

    # Get all active tenants
    tenants = db.query(Tenant).filter(Tenant.is_active == True).all()

    logger.info(f"Processing recurring invoices for {len(tenants)} tenants")

    for tenant in tenants:
        service = RecurringInvoiceService(db, tenant.id)
        result = service.process_recurring_invoices()
        results.append(result)

    logger.info(f"Completed recurring invoice processing for all tenants")

    return results
