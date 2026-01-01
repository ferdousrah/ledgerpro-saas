"""
Migration script to fix discount and tax calculation order
Run this script to update tax calculation logic
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the tax fix migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Running tax calculation fix migration...")

        # Read and execute migration file
        with open('migrations/012_fix_discount_tax_calculation.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Updated tax calculation to apply after discount")

        # Trigger recalculation for all existing invoices with discounts
        print("\nRecalculating existing invoices with discounts...")
        cur.execute("""
            UPDATE invoices
            SET updated_at = NOW()
            WHERE discount_amount > 0;
        """)
        conn.commit()

        rows_updated = cur.rowcount
        print(f"[OK] Recalculated {rows_updated} invoices with discounts")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    run_migration()
