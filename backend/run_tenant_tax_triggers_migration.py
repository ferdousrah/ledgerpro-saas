"""
Migration script to update triggers to use tenant's default tax rate
Run this script to complete the single default tax system
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the tenant default tax triggers migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Updating database triggers to use tenant default tax rate...")

        # Read and execute migration file
        with open('migrations/016_use_tenant_default_tax_in_triggers.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Triggers now use tenant's default_tax_rate setting")
        print("[OK] Tax calculation formula: Tax = (Subtotal - Discount) x (Default Tax Rate / 100)")

        # Recalculate all existing invoices with new formula
        print("\nRecalculating all invoices with tenant default tax rate...")
        cur.execute("""
            SELECT id, invoice_number FROM invoices ORDER BY created_at DESC
        """)

        invoices = cur.fetchall()
        for invoice_id, invoice_num in invoices:
            cur.execute("""
                UPDATE invoice_line_items
                SET updated_at = NOW()
                WHERE id = (
                    SELECT id FROM invoice_line_items
                    WHERE invoice_id = %s
                    LIMIT 1
                )
            """, (invoice_id,))

        conn.commit()
        print(f"[OK] Recalculated {len(invoices)} invoices")

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
