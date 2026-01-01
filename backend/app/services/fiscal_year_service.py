"""
Financial Year Service - Core Business Logic
Handles cascade recalculation, year closing, and balance management
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Optional, Dict, Any, Tuple
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
import time

from ..models.fiscal_year import (
    FinancialYear,
    FinancialYearStatus,
    AccountYearBalance,
    YearClosingAudit,
    YearClosingAction
)
from ..models.single_entry import Transaction, MoneyAccount, TransactionType
from ..schemas.fiscal_year import (
    YearClosingValidation,
    YearClosingResponse,
    RecalculationResult,
)


class FiscalYearService:
    """Service class for financial year operations"""

    def __init__(self, db: Session, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    def recalculate_cascade(
        self,
        starting_year_id: UUID,
        modified_account_ids: Optional[List[UUID]] = None,
    ) -> RecalculationResult:
        """
        Cascade recalculation algorithm

        When a transaction is edited in a closed year, this recalculates:
        1. That year's closing balances
        2. Next year's opening balances (from previous closing)
        3. Next year's closing balances
        4. Continues for all subsequent years

        Args:
            starting_year_id: The year to start recalculation from
            modified_account_ids: Optional list of specific accounts to recalculate
                                If None, recalculates all accounts

        Returns:
            RecalculationResult with metrics and warnings
        """
        start_time = time.time()
        warnings = []
        affected_years = []
        affected_accounts_set = set()
        balances_updated = 0

        try:
            # Get starting year to find its start date
            starting_year = self.db.query(FinancialYear).filter(
                and_(
                    FinancialYear.id == starting_year_id,
                    FinancialYear.tenant_id == self.tenant_id
                )
            ).first()

            if not starting_year:
                return RecalculationResult(
                    success=False,
                    affected_years=[],
                    affected_accounts=[],
                    recalculated_balances=0,
                    execution_time_ms=int((time.time() - start_time) * 1000),
                    warnings=["Starting financial year not found"]
                )

            # Get all years from starting year onwards (chronological order)
            years = self.db.query(FinancialYear).filter(
                and_(
                    FinancialYear.tenant_id == self.tenant_id,
                    FinancialYear.start_date >= starting_year.start_date
                )
            ).order_by(FinancialYear.start_date).all()

            if not years:
                return RecalculationResult(
                    success=True,
                    affected_years=[],
                    affected_accounts=[],
                    recalculated_balances=0,
                    execution_time_ms=int((time.time() - start_time) * 1000),
                    warnings=["No years found to recalculate"]
                )

            # Get accounts to process
            if modified_account_ids:
                accounts = self.db.query(MoneyAccount).filter(
                    and_(
                        MoneyAccount.tenant_id == self.tenant_id,
                        MoneyAccount.id.in_(modified_account_ids)
                    )
                ).all()
            else:
                accounts = self.db.query(MoneyAccount).filter(
                    MoneyAccount.tenant_id == self.tenant_id
                ).all()

            if not accounts:
                warnings.append("No accounts found to recalculate")

            # Process each year in chronological order
            for year in years:
                affected_years.append(year.id)

                # For each account, calculate balances
                for account in accounts:
                    affected_accounts_set.add(account.id)

                    # Get opening balance
                    opening_balance = self._get_opening_balance(
                        year, account, years
                    )

                    # Calculate income and expense sums from transactions
                    income_sum, expense_sum, txn_count = self._calculate_transaction_sums(
                        year.id, account.id
                    )

                    # Calculate closing balance
                    closing_balance = opening_balance + income_sum - expense_sum

                    # Update or create AccountYearBalance
                    year_balance = self.db.query(AccountYearBalance).filter(
                        and_(
                            AccountYearBalance.financial_year_id == year.id,
                            AccountYearBalance.account_id == account.id
                        )
                    ).first()

                    if year_balance:
                        # Update existing
                        year_balance.opening_balance = opening_balance
                        year_balance.closing_balance = closing_balance
                        year_balance.total_income = income_sum
                        year_balance.total_expense = expense_sum
                        year_balance.transaction_count = txn_count
                        year_balance.last_recalculated_at = datetime.utcnow()
                        year_balance.recalculation_count += 1
                    else:
                        # Create new
                        year_balance = AccountYearBalance(
                            tenant_id=self.tenant_id,
                            financial_year_id=year.id,
                            account_id=account.id,
                            opening_balance=opening_balance,
                            closing_balance=closing_balance,
                            total_income=income_sum,
                            total_expense=expense_sum,
                            transaction_count=txn_count,
                            is_final=(year.status == FinancialYearStatus.CLOSED),
                            last_recalculated_at=datetime.utcnow(),
                            recalculation_count=1,
                        )
                        self.db.add(year_balance)

                    balances_updated += 1

            # Update current balances for accounts (use most recent year's closing)
            if years:
                most_recent_year = years[-1]
                for account in accounts:
                    year_balance = self.db.query(AccountYearBalance).filter(
                        and_(
                            AccountYearBalance.financial_year_id == most_recent_year.id,
                            AccountYearBalance.account_id == account.id
                        )
                    ).first()

                    if year_balance:
                        account.current_balance = year_balance.closing_balance

            # Commit all changes
            self.db.commit()

            execution_time = int((time.time() - start_time) * 1000)

            return RecalculationResult(
                success=True,
                affected_years=affected_years,
                affected_accounts=list(affected_accounts_set),
                recalculated_balances=balances_updated,
                execution_time_ms=execution_time,
                warnings=warnings
            )

        except Exception as e:
            self.db.rollback()
            return RecalculationResult(
                success=False,
                affected_years=affected_years,
                affected_accounts=list(affected_accounts_set),
                recalculated_balances=balances_updated,
                execution_time_ms=int((time.time() - start_time) * 1000),
                warnings=[f"Error during recalculation: {str(e)}"]
            )

    def _get_opening_balance(
        self,
        current_year: FinancialYear,
        account: MoneyAccount,
        all_years: List[FinancialYear]
    ) -> Decimal:
        """
        Get opening balance for an account in a given year
        Opening balance = previous year's closing balance
        If no previous year, use account's opening_balance
        """
        # Find previous year
        previous_year = None
        for idx, year in enumerate(all_years):
            if year.id == current_year.id and idx > 0:
                previous_year = all_years[idx - 1]
                break

        if previous_year:
            # Get previous year's closing balance
            prev_balance = self.db.query(AccountYearBalance).filter(
                and_(
                    AccountYearBalance.financial_year_id == previous_year.id,
                    AccountYearBalance.account_id == account.id
                )
            ).first()

            if prev_balance:
                return prev_balance.closing_balance

        # No previous year or no balance found, use account's opening balance
        return account.opening_balance

    def _calculate_transaction_sums(
        self,
        year_id: UUID,
        account_id: UUID
    ) -> Tuple[Decimal, Decimal, int]:
        """
        Calculate income sum, expense sum, and transaction count
        for a specific account in a specific year

        Returns: (income_sum, expense_sum, transaction_count)
        """
        result = self.db.query(
            func.coalesce(
                func.sum(
                    func.case(
                        (Transaction.transaction_type == TransactionType.INCOME, Transaction.amount),
                        else_=0
                    )
                ),
                0
            ).label('income_sum'),
            func.coalesce(
                func.sum(
                    func.case(
                        (Transaction.transaction_type == TransactionType.EXPENSE, Transaction.amount),
                        else_=0
                    )
                ),
                0
            ).label('expense_sum'),
            func.count(Transaction.id).label('txn_count')
        ).filter(
            and_(
                Transaction.fiscal_year_id == year_id,
                Transaction.account_id == account_id
            )
        ).first()

        if result:
            return (
                Decimal(str(result.income_sum)),
                Decimal(str(result.expense_sum)),
                result.txn_count
            )

        return (Decimal('0'), Decimal('0'), 0)

    def validate_year_closing(self, year_id: UUID) -> YearClosingValidation:
        """
        Validate if a financial year can be closed

        Checks:
        - No uncategorized transactions (if validate_categories=True)
        - Year is not already closed
        - Year has transactions

        Returns validation result with warnings and errors
        """
        year = self.db.query(FinancialYear).filter(
            and_(
                FinancialYear.id == year_id,
                FinancialYear.tenant_id == self.tenant_id
            )
        ).first()

        errors = []
        warnings = []
        can_close = True

        if not year:
            errors.append("Financial year not found")
            return YearClosingValidation(
                can_close=False,
                uncategorized_transactions=0,
                total_transactions=0,
                accounts_summary=[],
                warnings=warnings,
                errors=errors
            )

        # Check if already closed
        if year.status == FinancialYearStatus.CLOSED:
            errors.append("Financial year is already closed")
            can_close = False

        # Count total transactions
        total_transactions = self.db.query(func.count(Transaction.id)).filter(
            Transaction.fiscal_year_id == year_id
        ).scalar()

        # Count uncategorized transactions
        uncategorized_count = self.db.query(func.count(Transaction.id)).filter(
            and_(
                Transaction.fiscal_year_id == year_id,
                Transaction.category_id.is_(None)
            )
        ).scalar()

        if uncategorized_count > 0:
            errors.append(
                f"{uncategorized_count} transactions are not categorized. "
                "All transactions must have categories before closing the year."
            )
            can_close = False

        if total_transactions == 0:
            warnings.append("This financial year has no transactions")

        # Get account summary
        accounts_summary = []
        account_balances = self.db.query(AccountYearBalance).filter(
            AccountYearBalance.financial_year_id == year_id
        ).all()

        for balance in account_balances:
            account = self.db.query(MoneyAccount).filter(
                MoneyAccount.id == balance.account_id
            ).first()

            if account:
                accounts_summary.append({
                    "account_id": str(balance.account_id),
                    "account_name": account.name,
                    "opening_balance": float(balance.opening_balance),
                    "closing_balance": float(balance.closing_balance),
                    "total_income": float(balance.total_income),
                    "total_expense": float(balance.total_expense),
                    "transaction_count": balance.transaction_count
                })

        return YearClosingValidation(
            can_close=can_close and len(errors) == 0,
            uncategorized_transactions=uncategorized_count,
            total_transactions=total_transactions,
            accounts_summary=accounts_summary,
            warnings=warnings,
            errors=errors
        )

    def close_financial_year(
        self,
        year_id: UUID,
        user_id: UUID,
        validate_categories: bool = True,
        create_next_year: bool = True
    ) -> YearClosingResponse:
        """
        Close a financial year

        Steps:
        1. Validate year can be closed
        2. Run cascade recalculation to ensure all balances are correct
        3. Mark all AccountYearBalance as is_final
        4. Update year status to CLOSED
        5. Create audit record with balance snapshot
        6. Optionally create next year with opening balances
        7. Set next year as is_current

        Args:
            year_id: The year to close
            user_id: User performing the closing
            validate_categories: Require all transactions to have categories
            create_next_year: Automatically create the next financial year

        Returns:
            YearClosingResponse with results
        """
        try:
            # Validate
            validation = self.validate_year_closing(year_id)

            if not validation.can_close:
                return YearClosingResponse(
                    success=False,
                    message=f"Cannot close year: {'; '.join(validation.errors)}",
                    financial_year_id=year_id,
                    closed_at=datetime.utcnow(),
                    next_year_id=None,
                    balance_snapshots_created=0
                )

            # Get the year
            year = self.db.query(FinancialYear).filter(
                and_(
                    FinancialYear.id == year_id,
                    FinancialYear.tenant_id == self.tenant_id
                )
            ).first()

            if not year:
                return YearClosingResponse(
                    success=False,
                    message="Financial year not found",
                    financial_year_id=year_id,
                    closed_at=datetime.utcnow(),
                    next_year_id=None,
                    balance_snapshots_created=0
                )

            # Run cascade recalculation to ensure balances are correct
            recalc_result = self.recalculate_cascade(year_id)

            if not recalc_result.success:
                return YearClosingResponse(
                    success=False,
                    message=f"Recalculation failed: {'; '.join(recalc_result.warnings)}",
                    financial_year_id=year_id,
                    closed_at=datetime.utcnow(),
                    next_year_id=None,
                    balance_snapshots_created=0
                )

            # Mark all balances as final
            self.db.query(AccountYearBalance).filter(
                AccountYearBalance.financial_year_id == year_id
            ).update({"is_final": True})

            # Update year status
            year.status = FinancialYearStatus.CLOSED
            year.closed_at = datetime.utcnow()
            year.closed_by = user_id
            year.is_current = False

            # Create audit record with balance snapshot
            balance_snapshot = self._create_balance_snapshot(year_id)
            audit = YearClosingAudit(
                tenant_id=self.tenant_id,
                financial_year_id=year_id,
                action=YearClosingAction.CLOSE,
                balance_snapshot=balance_snapshot,
                performed_by=user_id,
                performed_at=datetime.utcnow(),
                reason="Year closing",
                total_accounts=len(balance_snapshot.get("accounts", [])),
                total_transactions=validation.total_transactions
            )
            self.db.add(audit)

            next_year_id = None

            # Create next year if requested
            if create_next_year:
                next_year_id = self._create_next_year(year, balance_snapshot)

            self.db.commit()

            return YearClosingResponse(
                success=True,
                message=f"Financial year '{year.year_name}' closed successfully",
                financial_year_id=year_id,
                closed_at=year.closed_at,
                next_year_id=next_year_id,
                balance_snapshots_created=len(balance_snapshot.get("accounts", []))
            )

        except Exception as e:
            self.db.rollback()
            return YearClosingResponse(
                success=False,
                message=f"Error closing year: {str(e)}",
                financial_year_id=year_id,
                closed_at=datetime.utcnow(),
                next_year_id=None,
                balance_snapshots_created=0
            )

    def _create_balance_snapshot(self, year_id: UUID) -> Dict[str, Any]:
        """Create a JSONB snapshot of all account balances for audit trail"""
        balances = self.db.query(AccountYearBalance).filter(
            AccountYearBalance.financial_year_id == year_id
        ).all()

        accounts = []
        for balance in balances:
            account = self.db.query(MoneyAccount).filter(
                MoneyAccount.id == balance.account_id
            ).first()

            if account:
                accounts.append({
                    "account_id": str(balance.account_id),
                    "account_name": account.name,
                    "opening_balance": float(balance.opening_balance),
                    "closing_balance": float(balance.closing_balance),
                    "total_income": float(balance.total_income),
                    "total_expense": float(balance.total_expense),
                    "transaction_count": balance.transaction_count
                })

        return {
            "accounts": accounts,
            "snapshot_date": datetime.utcnow().isoformat(),
            "total_accounts": len(accounts)
        }

    def _create_next_year(
        self,
        current_year: FinancialYear,
        balance_snapshot: Dict[str, Any]
    ) -> UUID:
        """
        Create the next financial year with opening balances
        from current year's closing balances
        """
        # Calculate next year dates
        from dateutil.relativedelta import relativedelta
        next_start = current_year.end_date + relativedelta(days=1)
        next_end = next_start + relativedelta(years=1) - relativedelta(days=1)

        # Generate year name
        if next_start.year != next_end.year:
            year_name = f"FY {next_start.year}-{next_end.year}"
        else:
            year_name = f"FY {next_start.year}"

        # Create next year
        next_year = FinancialYear(
            tenant_id=self.tenant_id,
            year_name=year_name,
            start_date=next_start,
            end_date=next_end,
            status=FinancialYearStatus.OPEN,
            is_current=True,  # New year becomes current
            has_uncategorized_transactions=False,
            total_transactions_count=0
        )
        self.db.add(next_year)
        self.db.flush()  # Get the ID

        # Create opening balances for next year from current year's closing
        for account_data in balance_snapshot.get("accounts", []):
            opening_balance = Decimal(str(account_data["closing_balance"]))

            year_balance = AccountYearBalance(
                tenant_id=self.tenant_id,
                financial_year_id=next_year.id,
                account_id=UUID(account_data["account_id"]),
                opening_balance=opening_balance,
                closing_balance=opening_balance,  # Initially same as opening
                total_income=Decimal('0'),
                total_expense=Decimal('0'),
                transaction_count=0,
                is_final=False
            )
            self.db.add(year_balance)

        return next_year.id
