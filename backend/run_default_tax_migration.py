"""
Migration script to add default_tax_rate to tenants table
Run this script to add the default tax rate setting
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the default tax rate migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Adding default_tax_rate to tenants table...")

        # Read and execute migration file
        with open('migrations/014_add_default_tax_rate_to_tenants.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Added default_tax_rate column to tenants table")

        # Verify column was added
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tenants'
            AND column_name = 'default_tax_rate';
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
