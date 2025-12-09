"""
Data Export API endpoints for Backup & Export functionality
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import csv
import json
import io
from datetime import datetime

from ...database import get_db
from ...models.auth import Tenant
from ...models.single_entry import MoneyAccount, Category, Transaction, TaxRate
from ..deps import get_current_tenant

router = APIRouter()


@router.get("/csv/accounts")
def export_accounts_csv(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Export accounts to CSV"""
    accounts = (
        db.query(MoneyAccount)
        .filter(MoneyAccount.tenant_id == current_tenant.id)
        .all()
    )

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'Name', 'Type', 'Account Number', 'Bank Name',
        'Opening Balance', 'Current Balance', 'Is Active', 'Description'
    ])

    # Write data
    for account in accounts:
        writer.writerow([
            account.name,
            account.account_type.value,
            account.account_number or '',
            account.bank_name or '',
            float(account.opening_balance),
            float(account.current_balance),
            account.is_active,
            account.description or ''
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=accounts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/csv/categories")
def export_categories_csv(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Export categories to CSV"""
    categories = (
        db.query(Category)
        .filter(Category.tenant_id == current_tenant.id)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(['Name', 'Type', 'Description', 'Color', 'Icon', 'Is Active'])

    for category in categories:
        writer.writerow([
            category.name,
            category.transaction_type.value,
            category.description or '',
            category.color or '',
            category.icon or '',
            category.is_active
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=categories_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/csv/transactions")
def export_transactions_csv(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Export transactions to CSV"""
    transactions = (
        db.query(Transaction)
        .filter(Transaction.tenant_id == current_tenant.id)
        .join(MoneyAccount)
        .outerjoin(Category)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        'Date', 'Type', 'Account', 'Category', 'Amount',
        'Description', 'Reference Number'
    ])

    for txn in transactions:
        writer.writerow([
            txn.transaction_date.isoformat(),
            txn.transaction_type.value,
            txn.account.name if txn.account else '',
            txn.category.name if txn.category else '',
            float(txn.amount),
            txn.description or '',
            txn.reference_number or ''
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/json/full-backup")
def export_full_backup_json(
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """Export complete data backup as JSON"""
    # Get all data
    accounts = db.query(MoneyAccount).filter(MoneyAccount.tenant_id == current_tenant.id).all()
    categories = db.query(Category).filter(Category.tenant_id == current_tenant.id).all()
    transactions = db.query(Transaction).filter(Transaction.tenant_id == current_tenant.id).all()
    tax_rates = db.query(TaxRate).filter(TaxRate.tenant_id == current_tenant.id).all()

    # Prepare backup data
    backup_data = {
        "export_date": datetime.now().isoformat(),
        "tenant": {
            "company_name": current_tenant.company_name,
            "currency": current_tenant.currency,
            "accounting_type": current_tenant.accounting_type.value,
            "fiscal_year_start": current_tenant.fiscal_year_start.isoformat() if current_tenant.fiscal_year_start else None
        },
        "accounts": [
            {
                "id": str(account.id),
                "name": account.name,
                "type": account.account_type.value,
                "account_number": account.account_number,
                "bank_name": account.bank_name,
                "opening_balance": float(account.opening_balance),
                "current_balance": float(account.current_balance),
                "is_active": account.is_active,
                "description": account.description
            }
            for account in accounts
        ],
        "categories": [
            {
                "id": str(category.id),
                "name": category.name,
                "type": category.transaction_type.value,
                "description": category.description,
                "color": category.color,
                "icon": category.icon,
                "is_active": category.is_active
            }
            for category in categories
        ],
        "transactions": [
            {
                "id": str(txn.id),
                "account_id": str(txn.account_id),
                "category_id": str(txn.category_id) if txn.category_id else None,
                "type": txn.transaction_type.value,
                "amount": float(txn.amount),
                "date": txn.transaction_date.isoformat(),
                "description": txn.description,
                "reference_number": txn.reference_number
            }
            for txn in transactions
        ],
        "tax_rates": [
            {
                "id": str(rate.id),
                "name": rate.name,
                "rate": float(rate.rate),
                "description": rate.description,
                "applies_to_income": rate.applies_to_income,
                "applies_to_expense": rate.applies_to_expense,
                "is_active": rate.is_active
            }
            for rate in tax_rates
        ]
    }

    json_str = json.dumps(backup_data, indent=2)

    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=full_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    )
