"""
Migration script to add discount_amount to invoices table
Run this script to add discount field and update totals calculation trigger
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the discount migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Running discount migration...")

        # Read and execute migration file
        with open('migrations/011_add_discount_to_invoices.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Added discount_amount column to invoices table")
        print("[OK] Updated invoice totals calculation trigger")

        # Verify columns were added
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'invoices'
            AND column_name = 'discount_amount'
            ORDER BY column_name;
        """)

        columns = cur.fetchall()
        print("\nVerification:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} (default: {col[2]})")

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
