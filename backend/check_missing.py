"""
Check which transactions are missing fiscal year assignment
"""
from app.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()

try:
    # Get all transactions and their fiscal year assignments
    query = text("""
        SELECT
            t.id,
            t.transaction_date,
            t.transaction_type,
            t.amount,
            t.description,
            t.fiscal_year_id,
            fy.year_name
        FROM transactions t
        LEFT JOIN financial_years fy ON t.fiscal_year_id = fy.id
        ORDER BY t.transaction_date DESC, t.created_at DESC
    """)

    transactions = db.execute(query).fetchall()

    print("\n[All Transactions with Fiscal Year Assignment]")
    print("-" * 100)

    missing_count = 0
    for t in transactions:
        status = "OK" if t.fiscal_year_id else "MISSING"
        fy_name = t.year_name if t.year_name else "NOT ASSIGNED"
        print(f"{status:7s} | {t.transaction_date} | {t.transaction_type:7s} | {t.amount:10,.2f} | {fy_name:15s} | {t.description or '-'}")
        if not t.fiscal_year_id:
            missing_count += 1

    print("-" * 100)
    print(f"\nTotal Transactions: {len(transactions)}")
    print(f"Missing Fiscal Year: {missing_count}")

finally:
    db.close()
