"""
Migration script to remove tax_rate_id from invoice line items
Run this script to switch to single default tax rate system
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the remove tax_rate_id migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Removing tax_rate_id from invoice line items...")
        print("Switching to single default tax rate system...")

        # Read and execute migration file
        with open('migrations/015_remove_tax_rate_from_line_items.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Removed tax_rate_id from invoice_line_items")
        print("[OK] Removed tax_rate_id from recurring_invoice_line_items")
        print("[OK] System now uses tenant default tax rate")

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
