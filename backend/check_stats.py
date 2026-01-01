"""
Check fiscal year statistics directly from database
"""
from app.database import SessionLocal
from sqlalchemy import text

# Get database session
db = SessionLocal()

try:
    # Get fiscal year
    year_query = text("""
        SELECT id, year_name, start_date, end_date
        FROM financial_years
        ORDER BY start_date DESC
        LIMIT 1
    """)
    year = db.execute(year_query).fetchone()

    if year:
        print(f"\n[Fiscal Year: {year.year_name}]")
        print(f"ID: {year.id}")
        print(f"Period: {year.start_date} to {year.end_date}")

        # Get transaction statistics
        stats_query = text("""
            SELECT
                COUNT(*) as total_transactions,
                SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense
            FROM transactions
            WHERE fiscal_year_id = :year_id
        """)
        stats = db.execute(stats_query, {"year_id": str(year.id)}).fetchone()

        print(f"\n[Transaction Statistics]")
        print(f"Total Transactions: {stats.total_transactions}")
        print(f"Total Income: {stats.total_income:,.2f}")
        print(f"Total Expense: {stats.total_expense:,.2f}")
        print(f"Net Balance: {(stats.total_income - stats.total_expense):,.2f}")

        # Show all transactions
        trans_query = text("""
            SELECT
                transaction_date,
                transaction_type,
                amount,
                description
            FROM transactions
            WHERE fiscal_year_id = :year_id
            ORDER BY transaction_date DESC, created_at DESC
        """)
        transactions = db.execute(trans_query, {"year_id": str(year.id)}).fetchall()

        print(f"\n[All Transactions in {year.year_name}]")
        for t in transactions:
            print(f"  {t.transaction_date} | {t.transaction_type:7s} | {t.amount:10,.2f} | {t.description or '-'}")
    else:
        print("[ERROR] No fiscal year found")

finally:
    db.close()
