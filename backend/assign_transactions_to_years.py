"""
Auto-assign transactions to fiscal years based on transaction_date
"""
import psycopg2
from app.config import settings

conn = psycopg2.connect(settings.DATABASE_URI)
conn.autocommit = False

try:
    cur = conn.cursor()

    print("Assigning transactions to fiscal years...")

    # Update transactions to assign them to fiscal years based on transaction_date
    cur.execute("""
        UPDATE transactions t
        SET fiscal_year_id = fy.id
        FROM financial_years fy
        WHERE t.tenant_id = fy.tenant_id
        AND t.transaction_date >= fy.start_date
        AND t.transaction_date <= fy.end_date
        AND t.fiscal_year_id IS NULL;
    """)

    rows_updated = cur.rowcount
    print(f"[OK] Assigned {rows_updated} transactions to fiscal years")

    # Show summary by tenant
    cur.execute("""
        SELECT
            t.company_name as tenant_name,
            fy.year_name,
            COUNT(tr.id) as transaction_count
        FROM tenants t
        JOIN financial_years fy ON t.id = fy.tenant_id
        LEFT JOIN transactions tr ON fy.id = tr.fiscal_year_id
        GROUP BY t.company_name, fy.year_name
        ORDER BY t.company_name, fy.year_name;
    """)

    print("\nSummary by tenant and fiscal year:")
    for row in cur.fetchall():
        print(f"  {row[0]} - {row[1]}: {row[2]} transactions")

    conn.commit()
    print("\n[OK] Migration completed successfully!")

except Exception as e:
    conn.rollback()
    print(f"[ERROR] Migration failed: {e}")
    raise
finally:
    cur.close()
    conn.close()
