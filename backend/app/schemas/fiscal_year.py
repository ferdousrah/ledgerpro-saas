"""
Pydantic Schemas for Financial Year Management
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID
from decimal import Decimal

from ..models.fiscal_year import FinancialYearStatus, YearClosingAction


# ============ Financial Year Schemas ============
class FinancialYearBase(BaseModel):
    year_name: str = Field(..., min_length=1, max_length=50)
    start_date: date
    end_date: date

    @validator('end_date')
    def end_date_after_start_date(cls, v, values):
        if 'start_date' in values and v <= values['start_date']:
            raise ValueError('end_date must be after start_date')
        return v


class FinancialYearCreate(FinancialYearBase):
    is_current: bool = False


class FinancialYearUpdate(BaseModel):
    year_name: Optional[str] = Field(None, min_length=1, max_length=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_current: Optional[bool] = None


class FinancialYearResponse(FinancialYearBase):
    id: UUID
    tenant_id: UUID
    status: FinancialYearStatus
    is_current: bool
    closed_at: Optional[datetime] = None
    closed_by: Optional[UUID] = None
    has_uncategorized_transactions: bool
    total_transactions_count: int
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None

    class Config:
        from_attributes = True


class FinancialYearWithStats(FinancialYearResponse):
    """Financial year with additional statistics"""
    total_income: Decimal
    total_expense: Decimal
    net_balance: Decimal
    active_accounts_count: int


# ============ Year Closing Schemas ============
class YearClosingRequest(BaseModel):
    """Request to close a financial year"""
    validate_categories: bool = True  # Validate all transactions have categories
    create_next_year: bool = True  # Automatically create next year


class YearClosingValidation(BaseModel):
    """Validation results before closing year"""
    can_close: bool
    uncategorized_transactions: int
    total_transactions: int
    accounts_summary: List[Dict[str, Any]]
    warnings: List[str]
    errors: List[str]


class YearClosingResponse(BaseModel):
    """Response after closing year"""
    success: bool
    message: str
    financial_year_id: UUID
    closed_at: datetime
    next_year_id: Optional[UUID] = None
    balance_snapshots_created: int


# ============ Account Year Balance Schemas ============
class AccountYearBalanceResponse(BaseModel):
    id: UUID
    financial_year_id: UUID
    account_id: UUID
    account_name: str  # Joined from account
    opening_balance: Decimal
    closing_balance: Decimal
    total_income: Decimal
    total_expense: Decimal
    transaction_count: int
    is_final: bool
    last_recalculated_at: Optional[datetime]
    recalculation_count: int

    class Config:
        from_attributes = True


# ============ Report Schemas ============
class CashFlowStatementItem(BaseModel):
    """Cash flow statement line item"""
    category: str
    amount: Decimal
    percentage: float


class CashFlowStatement(BaseModel):
    """Cash Flow Statement Report"""
    financial_year_id: UUID
    year_name: str
    period_start: date
    period_end: date

    # Operating activities
    opening_cash_balance: Decimal
    cash_inflows: List[CashFlowStatementItem]
    cash_outflows: List[CashFlowStatementItem]

    total_inflows: Decimal
    total_outflows: Decimal
    net_cash_flow: Decimal
    closing_cash_balance: Decimal

    # Account breakdown
    account_balances: List[AccountYearBalanceResponse]


class TrialBalanceItem(BaseModel):
    """Trial balance line item"""
    account_name: str
    account_type: str
    debit: Decimal
    credit: Decimal


class TrialBalance(BaseModel):
    """Trial Balance Report (adapted for single-entry)"""
    financial_year_id: UUID
    year_name: str
    as_of_date: date

    accounts: List[TrialBalanceItem]
    total_debit: Decimal
    total_credit: Decimal
    is_balanced: bool


class IncomeStatementItem(BaseModel):
    """Income statement category item"""
    category_name: str
    amount: Decimal
    percentage: float


class IncomeStatement(BaseModel):
    """Income Statement (Profit & Loss)"""
    financial_year_id: UUID
    year_name: str
    period_start: date
    period_end: date

    income_items: List[IncomeStatementItem]
    expense_items: List[IncomeStatementItem]

    total_income: Decimal
    total_expense: Decimal
    net_profit_loss: Decimal
    profit_margin_percentage: float


class BalanceSheetSection(BaseModel):
    """Balance sheet section (assets or liabilities)"""
    account_name: str
    amount: Decimal


class BalanceSheet(BaseModel):
    """Balance Sheet Report"""
    financial_year_id: UUID
    year_name: str
    as_of_date: date

    # Assets (in single-entry, these are account balances)
    assets: List[BalanceSheetSection]
    total_assets: Decimal

    # Liabilities & Equity (calculated)
    retained_earnings: Decimal
    current_period_profit_loss: Decimal
    total_equity: Decimal


# ============ Cascade Recalculation Schema ============
class RecalculationResult(BaseModel):
    """Result of cascade recalculation"""
    success: bool
    affected_years: List[UUID]
    affected_accounts: List[UUID]
    recalculated_balances: int
    execution_time_ms: int
    warnings: List[str]
