"""
Financial Reports API endpoints
Generates accounting reports for fiscal periods
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, case
from typing import List
from uuid import UUID
from decimal import Decimal

from ...database import get_db
from ...models.auth import User, Tenant
from ...models.fiscal_year import FinancialYear, AccountYearBalance
from ...models.single_entry import Transaction, MoneyAccount, Category, TransactionType
from ...schemas.fiscal_year import (
    CashFlowStatement,
    CashFlowStatementItem,
    TrialBalance,
    TrialBalanceItem,
    IncomeStatement,
    IncomeStatementItem,
    BalanceSheet,
    BalanceSheetSection,
    AccountYearBalanceResponse,
)
from ..deps import get_current_user, get_current_tenant

router = APIRouter()


@router.get("/cash-flow/{year_id}", response_model=CashFlowStatement)
def get_cash_flow_statement(
    year_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Generate Cash Flow Statement for a financial year

    Shows:
    - Opening cash balance
    - Cash inflows by category
    - Cash outflows by category
    - Net cash flow
    - Closing cash balance
    - Account-wise breakdown
    """
    # Verify year belongs to tenant
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Get all account balances for this year
    account_balances = db.query(
        AccountYearBalance,
        MoneyAccount.name.label('account_name')
    ).join(
        MoneyAccount,
        AccountYearBalance.account_id == MoneyAccount.id
    ).filter(
        AccountYearBalance.financial_year_id == year_id
    ).all()

    # Calculate opening cash balance (sum of all account opening balances)
    opening_cash = sum(balance.opening_balance for balance, _ in account_balances)

    # Get income by category
    income_by_category = db.query(
        Category.name,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction,
        Category.id == Transaction.category_id
    ).filter(
        and_(
            Transaction.fiscal_year_id == year_id,
            Transaction.transaction_type == TransactionType.INCOME
        )
    ).group_by(Category.id, Category.name).all()

    # Get expense by category
    expense_by_category = db.query(
        Category.name,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction,
        Category.id == Transaction.category_id
    ).filter(
        and_(
            Transaction.fiscal_year_id == year_id,
            Transaction.transaction_type == TransactionType.EXPENSE
        )
    ).group_by(Category.id, Category.name).all()

    # Calculate totals
    total_inflows = sum(Decimal(str(item.total)) for item in income_by_category)
    total_outflows = sum(Decimal(str(item.total)) for item in expense_by_category)

    # Create cash flow items
    cash_inflows = [
        CashFlowStatementItem(
            category=item.name,
            amount=Decimal(str(item.total)),
            percentage=float((Decimal(str(item.total)) / total_inflows * 100) if total_inflows > 0 else 0)
        )
        for item in income_by_category
    ]

    cash_outflows = [
        CashFlowStatementItem(
            category=item.name,
            amount=Decimal(str(item.total)),
            percentage=float((Decimal(str(item.total)) / total_outflows * 100) if total_outflows > 0 else 0)
        )
        for item in expense_by_category
    ]

    net_cash_flow = total_inflows - total_outflows
    closing_cash = opening_cash + net_cash_flow

    # Convert account balances to response format
    account_balance_list = []
    for balance, account_name in account_balances:
        balance_dict = {c.name: getattr(balance, c.name) for c in balance.__table__.columns}
        balance_dict['account_name'] = account_name
        account_balance_list.append(AccountYearBalanceResponse(**balance_dict))

    return CashFlowStatement(
        financial_year_id=year_id,
        year_name=year.year_name,
        period_start=year.start_date,
        period_end=year.end_date,
        opening_cash_balance=opening_cash,
        cash_inflows=cash_inflows,
        cash_outflows=cash_outflows,
        total_inflows=total_inflows,
        total_outflows=total_outflows,
        net_cash_flow=net_cash_flow,
        closing_cash_balance=closing_cash,
        account_balances=account_balance_list
    )


@router.get("/trial-balance/{year_id}", response_model=TrialBalance)
def get_trial_balance(
    year_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Generate Trial Balance for a financial year

    In single-entry accounting, this shows:
    - Accounts with positive balances (debit)
    - Accounts with negative balances (credit)
    - Total debit = Total credit for validation
    """
    # Verify year belongs to tenant
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Get all account balances
    account_balances = db.query(
        AccountYearBalance,
        MoneyAccount.name.label('account_name'),
        MoneyAccount.account_type.label('account_type')
    ).join(
        MoneyAccount,
        AccountYearBalance.account_id == MoneyAccount.id
    ).filter(
        AccountYearBalance.financial_year_id == year_id
    ).order_by(MoneyAccount.name).all()

    accounts = []
    total_debit = Decimal('0')
    total_credit = Decimal('0')

    for balance, account_name, account_type in account_balances:
        closing_balance = balance.closing_balance

        # In single-entry: positive balance = debit, negative balance = credit
        debit = closing_balance if closing_balance >= 0 else Decimal('0')
        credit = abs(closing_balance) if closing_balance < 0 else Decimal('0')

        total_debit += debit
        total_credit += credit

        accounts.append(TrialBalanceItem(
            account_name=account_name,
            account_type=account_type or 'Asset',  # Default to Asset if not set
            debit=debit,
            credit=credit
        ))

    is_balanced = abs(total_debit - total_credit) < Decimal('0.01')  # Allow small rounding differences

    return TrialBalance(
        financial_year_id=year_id,
        year_name=year.year_name,
        as_of_date=year.end_date,
        accounts=accounts,
        total_debit=total_debit,
        total_credit=total_credit,
        is_balanced=is_balanced
    )


@router.get("/income-statement/{year_id}", response_model=IncomeStatement)
def get_income_statement(
    year_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Generate Income Statement (Profit & Loss) for a financial year

    Shows:
    - Income by category
    - Expenses by category
    - Total income, total expenses
    - Net profit/loss
    - Profit margin percentage
    """
    # Verify year belongs to tenant
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Get income by category
    income_by_category = db.query(
        Category.name,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction,
        Category.id == Transaction.category_id
    ).filter(
        and_(
            Transaction.fiscal_year_id == year_id,
            Transaction.transaction_type == TransactionType.INCOME
        )
    ).group_by(Category.id, Category.name).all()

    # Get expense by category
    expense_by_category = db.query(
        Category.name,
        func.sum(Transaction.amount).label('total')
    ).join(
        Transaction,
        Category.id == Transaction.category_id
    ).filter(
        and_(
            Transaction.fiscal_year_id == year_id,
            Transaction.transaction_type == TransactionType.EXPENSE
        )
    ).group_by(Category.id, Category.name).all()

    # Calculate totals
    total_income = sum(Decimal(str(item.total)) for item in income_by_category)
    total_expense = sum(Decimal(str(item.total)) for item in expense_by_category)

    # Create income items
    income_items = [
        IncomeStatementItem(
            category_name=item.name,
            amount=Decimal(str(item.total)),
            percentage=float((Decimal(str(item.total)) / total_income * 100) if total_income > 0 else 0)
        )
        for item in income_by_category
    ]

    # Create expense items
    expense_items = [
        IncomeStatementItem(
            category_name=item.name,
            amount=Decimal(str(item.total)),
            percentage=float((Decimal(str(item.total)) / total_expense * 100) if total_expense > 0 else 0)
        )
        for item in expense_by_category
    ]

    net_profit_loss = total_income - total_expense
    profit_margin = float((net_profit_loss / total_income * 100) if total_income > 0 else 0)

    return IncomeStatement(
        financial_year_id=year_id,
        year_name=year.year_name,
        period_start=year.start_date,
        period_end=year.end_date,
        income_items=income_items,
        expense_items=expense_items,
        total_income=total_income,
        total_expense=total_expense,
        net_profit_loss=net_profit_loss,
        profit_margin_percentage=profit_margin
    )


@router.get("/balance-sheet/{year_id}", response_model=BalanceSheet)
def get_balance_sheet(
    year_id: UUID,
    current_tenant: Tenant = Depends(get_current_tenant),
    db: Session = Depends(get_db)
):
    """
    Generate Balance Sheet for a financial year

    In single-entry accounting:
    - Assets: Sum of all account closing balances
    - Equity: Opening balance + net profit/loss
    - Retained Earnings: Cumulative from previous years
    """
    # Verify year belongs to tenant
    year = db.query(FinancialYear).filter(
        and_(
            FinancialYear.id == year_id,
            FinancialYear.tenant_id == current_tenant.id
        )
    ).first()

    if not year:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Financial year not found"
        )

    # Get all account balances
    account_balances = db.query(
        AccountYearBalance,
        MoneyAccount.name.label('account_name')
    ).join(
        MoneyAccount,
        AccountYearBalance.account_id == MoneyAccount.id
    ).filter(
        AccountYearBalance.financial_year_id == year_id
    ).order_by(MoneyAccount.name).all()

    # Calculate assets (all account closing balances)
    assets = [
        BalanceSheetSection(
            account_name=account_name,
            amount=balance.closing_balance
        )
        for balance, account_name in account_balances
    ]

    total_assets = sum(asset.amount for asset in assets)

    # Calculate current period profit/loss
    current_period_income = sum(balance.total_income for balance, _ in account_balances)
    current_period_expense = sum(balance.total_expense for balance, _ in account_balances)
    current_period_profit_loss = current_period_income - current_period_expense

    # Calculate retained earnings (opening balance)
    retained_earnings = sum(balance.opening_balance for balance, _ in account_balances)

    # Total equity
    total_equity = retained_earnings + current_period_profit_loss

    return BalanceSheet(
        financial_year_id=year_id,
        year_name=year.year_name,
        as_of_date=year.end_date,
        assets=assets,
        total_assets=total_assets,
        retained_earnings=retained_earnings,
        current_period_profit_loss=current_period_profit_loss,
        total_equity=total_equity
    )
