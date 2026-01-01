"""
Invoice Service - Core Business Logic
Handles invoice numbering, calculations, payments, and PDF generation
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract, Integer, case
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal

from ..models.invoice import (
    Invoice,
    InvoiceLineItem,
    InvoicePayment,
    InvoiceStatus,
    PaymentTerms,
    PaymentMethod
)
from ..models.single_entry import Transaction, TransactionType, MoneyAccount, TaxRate
from ..models.fiscal_year import FinancialYear
from ..schemas.invoice import (
    InvoiceCreate,
    InvoiceLineItemCreate,
    InvoicePaymentCreate
)


class InvoiceService:
    """Service class for invoice operations"""

    def __init__(self, db: Session, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    def generate_invoice_number(self, invoice_date: date = None) -> str:
        """
        Generate unique invoice number in format: INV-YYYY-####

        Args:
            invoice_date: Date for the invoice (defaults to today)

        Returns:
            str: Generated invoice number (e.g., "INV-2024-0001")
        """
        if invoice_date is None:
            invoice_date = date.today()

        year = invoice_date.year

        # Get the highest sequence number for this year
        max_invoice = self.db.query(
            func.max(
                func.cast(
                    func.substring(Invoice.invoice_number, 10),  # Extract sequence part
                    Integer
                )
            ).label('max_seq')
        ).filter(
            and_(
                Invoice.tenant_id == self.tenant_id,
                extract('year', Invoice.invoice_date) == year
            )
        ).scalar()

        next_sequence = (max_invoice or 0) + 1

        return f"INV-{year}-{next_sequence:04d}"

    def calculate_line_item_totals(
        self,
        line_item: InvoiceLineItemCreate,
        tenant_default_tax_rate: Decimal = Decimal("0.00")
    ) -> Dict[str, Decimal]:
        """
        Calculate totals for a single line item using tenant's default tax rate

        Args:
            line_item: Line item data
            tenant_default_tax_rate: Tenant's default tax rate percentage

        Returns:
            Dict with subtotal, tax_rate_percentage, tax_amount, line_total
        """
        quantity = Decimal(str(line_item.quantity))
        unit_price = Decimal(str(line_item.unit_price))

        subtotal = quantity * unit_price

        # Use tenant's default tax rate
        tax_rate_percentage = tenant_default_tax_rate

        # Calculate tax amount
        tax_amount = (subtotal * tax_rate_percentage) / Decimal("100")

        # Calculate line total
        line_total = subtotal + tax_amount

        return {
            "subtotal": subtotal,
            "tax_rate_percentage": tax_rate_percentage,
            "tax_amount": tax_amount,
            "line_total": line_total
        }

    def calculate_invoice_totals(self, invoice_id: UUID) -> Dict[str, Decimal]:
        """
        Calculate totals for an invoice from its line items
        (Note: This is also done by database trigger, but useful for validation)

        Args:
            invoice_id: Invoice ID

        Returns:
            Dict with subtotal, total_tax, total_amount
        """
        line_items = self.db.query(InvoiceLineItem).filter(
            InvoiceLineItem.invoice_id == invoice_id
        ).all()

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")

        for item in line_items:
            subtotal += Decimal(str(item.subtotal))
            total_tax += Decimal(str(item.tax_amount))

        total_amount = subtotal + total_tax

        return {
            "subtotal": subtotal,
            "total_tax": total_tax,
            "total_amount": total_amount
        }

    def calculate_due_date(
        self,
        invoice_date: date,
        payment_terms: PaymentTerms,
        custom_days: Optional[int] = None
    ) -> date:
        """
        Calculate invoice due date based on payment terms

        Args:
            invoice_date: Invoice date
            payment_terms: Payment terms enum
            custom_days: Custom number of days (required if payment_terms is CUSTOM)

        Returns:
            date: Calculated due date
        """
        if payment_terms == PaymentTerms.due_on_receipt:
            return invoice_date
        elif payment_terms == PaymentTerms.net_15:
            return invoice_date + timedelta(days=15)
        elif payment_terms == PaymentTerms.net_30:
            return invoice_date + timedelta(days=30)
        elif payment_terms == PaymentTerms.net_60:
            return invoice_date + timedelta(days=60)
        elif payment_terms == PaymentTerms.net_90:
            return invoice_date + timedelta(days=90)
        elif payment_terms == PaymentTerms.custom and custom_days:
            return invoice_date + timedelta(days=custom_days)
        else:
            # Default to NET_30 if invalid
            return invoice_date + timedelta(days=30)

    def update_invoice_status(self, invoice: Invoice) -> InvoiceStatus:
        """
        Update invoice status based on payments and due date
        (Note: Also handled by database trigger, but useful for manual updates)

        Args:
            invoice: Invoice object

        Returns:
            InvoiceStatus: New status
        """
        # Don't change status if draft or cancelled
        if invoice.status in [InvoiceStatus.draft, InvoiceStatus.cancelled]:
            return invoice.status

        # Check if fully paid
        if invoice.balance_due <= 0:
            return InvoiceStatus.paid

        # Check if partially paid
        if invoice.total_paid > 0:
            # Check if overdue
            if invoice.due_date < date.today():
                return InvoiceStatus.overdue
            return InvoiceStatus.partially_paid

        # No payments - check if overdue or sent
        if invoice.due_date < date.today():
            return InvoiceStatus.overdue

        # Default to SENT if no payments and not overdue
        return InvoiceStatus.sent

    def create_payment_transaction(
        self,
        invoice: Invoice,
        payment: InvoicePayment,
        user_id: Optional[UUID] = None
    ) -> Transaction:
        """
        Create INCOME transaction when invoice payment is recorded

        Args:
            invoice: Invoice object
            payment: Payment object
            user_id: User creating the transaction

        Returns:
            Transaction: Created transaction
        """
        # Auto-assign fiscal year based on payment date
        fiscal_year = self.db.query(FinancialYear).filter(
            and_(
                FinancialYear.tenant_id == self.tenant_id,
                FinancialYear.start_date <= payment.payment_date,
                FinancialYear.end_date >= payment.payment_date
            )
        ).first()

        # Create transaction
        transaction = Transaction(
            tenant_id=self.tenant_id,
            account_id=payment.account_id,
            partner_id=invoice.customer_id,
            transaction_type=TransactionType.INCOME,
            amount=payment.amount,
            transaction_date=payment.payment_date,
            description=f"Payment for {invoice.invoice_number}",
            reference_number=invoice.invoice_number,
            fiscal_year_id=fiscal_year.id if fiscal_year else None,
            created_by=user_id
        )

        self.db.add(transaction)
        self.db.flush()  # Flush to assign transaction.id

        # Update account balance
        account = self.db.query(MoneyAccount).filter(
            MoneyAccount.id == payment.account_id
        ).first()

        if account:
            account.current_balance = float(Decimal(str(account.current_balance)) + Decimal(str(payment.amount)))

        return transaction

    def auto_assign_fiscal_year(self, invoice: Invoice) -> Optional[UUID]:
        """
        Auto-assign fiscal year to invoice based on invoice_date

        Args:
            invoice: Invoice object

        Returns:
            Optional[UUID]: Fiscal year ID if found
        """
        fiscal_year = self.db.query(FinancialYear).filter(
            and_(
                FinancialYear.tenant_id == self.tenant_id,
                FinancialYear.start_date <= invoice.invoice_date,
                FinancialYear.end_date >= invoice.invoice_date
            )
        ).first()

        return fiscal_year.id if fiscal_year else None

    def validate_invoice_editable(self, invoice: Invoice) -> Tuple[bool, Optional[str]]:
        """
        Validate if invoice can be edited

        Args:
            invoice: Invoice object

        Returns:
            Tuple[bool, Optional[str]]: (is_valid, error_message)
        """
        # Can only edit DRAFT or SENT invoices
        if invoice.status not in [InvoiceStatus.draft, InvoiceStatus.sent]:
            return False, f"Cannot edit invoice with status: {invoice.status.value}"

        # Cannot edit if payments exist
        payments_count = self.db.query(func.count(InvoicePayment.id)).filter(
            InvoicePayment.invoice_id == invoice.id
        ).scalar()

        if payments_count > 0:
            return False, "Cannot edit invoice with existing payments"

        return True, None

    def validate_invoice_deletable(self, invoice: Invoice) -> Tuple[bool, Optional[str]]:
        """
        Validate if invoice can be deleted

        Args:
            invoice: Invoice object

        Returns:
            Tuple[bool, Optional[str]]: (is_valid, error_message)
        """
        # Can only delete DRAFT invoices
        if invoice.status != InvoiceStatus.draft:
            return False, f"Cannot delete invoice with status: {invoice.status.value}. Only DRAFT invoices can be deleted."

        # Cannot delete if payments exist
        payments_count = self.db.query(func.count(InvoicePayment.id)).filter(
            InvoicePayment.invoice_id == invoice.id
        ).scalar()

        if payments_count > 0:
            return False, "Cannot delete invoice with existing payments"

        return True, None

    def validate_payment_amount(
        self,
        invoice: Invoice,
        payment_amount: Decimal
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate payment amount against invoice balance

        Args:
            invoice: Invoice object
            payment_amount: Payment amount to validate

        Returns:
            Tuple[bool, Optional[str]]: (is_valid, error_message)
        """
        if payment_amount <= 0:
            return False, "Payment amount must be greater than zero"

        balance_due = Decimal(str(invoice.balance_due))

        if payment_amount > balance_due:
            return False, f"Payment amount ({payment_amount}) cannot exceed balance due ({balance_due})"

        return True, None

    def generate_pdf(
        self,
        invoice_id: UUID,
        tenant: Any  # Tenant object
    ) -> str:
        """
        Generate PDF for invoice (placeholder for now)

        TODO: Implement PDF generation using ReportLab

        Args:
            invoice_id: Invoice ID
            tenant: Tenant object with branding info

        Returns:
            str: Path to generated PDF
        """
        # This will be implemented in Phase 5 with ReportLab
        # For now, return a placeholder
        pdf_path = f"/invoices/{self.tenant_id}/{invoice_id}.pdf"

        # TODO: Implement actual PDF generation:
        # 1. Fetch invoice with line items
        # 2. Create PDF with ReportLab
        # 3. Add tenant branding (logo, colors)
        # 4. Save to storage
        # 5. Update invoice.pdf_url and last_pdf_generated_at

        return pdf_path

    def get_invoice_stats(self) -> Dict[str, Any]:
        """
        Get dashboard statistics for invoices

        Returns:
            Dict with invoice statistics
        """
        stats = self.db.query(
            func.count(Invoice.id).label('total_invoices'),
            func.sum(
                case((Invoice.status == InvoiceStatus.draft, 1), else_=0)
            ).label('draft_count'),
            func.sum(
                case((Invoice.status == InvoiceStatus.sent, 1), else_=0)
            ).label('sent_count'),
            func.sum(
                case((Invoice.status == InvoiceStatus.paid, 1), else_=0)
            ).label('paid_count'),
            func.sum(
                case((Invoice.status == InvoiceStatus.overdue, 1), else_=0)
            ).label('overdue_count'),
            func.coalesce(func.sum(Invoice.balance_due), 0).label('total_outstanding'),
            func.coalesce(
                func.sum(
                    case(
                        (
                            and_(
                                Invoice.status == InvoiceStatus.paid,
                                extract('month', Invoice.updated_at) == date.today().month,
                                extract('year', Invoice.updated_at) == date.today().year
                            ),
                            Invoice.total_amount
                        ),
                        else_=0
                    )
                ),
                0
            ).label('total_paid_this_month')
        ).filter(
            Invoice.tenant_id == self.tenant_id
        ).first()

        return {
            "total_invoices": stats.total_invoices or 0,
            "draft_count": stats.draft_count or 0,
            "sent_count": stats.sent_count or 0,
            "paid_count": stats.paid_count or 0,
            "overdue_count": stats.overdue_count or 0,
            "total_outstanding": float(stats.total_outstanding or 0),
            "total_paid_this_month": float(stats.total_paid_this_month or 0)
        }
