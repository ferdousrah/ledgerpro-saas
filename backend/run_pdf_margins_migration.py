"""
Migration script to add PDF margin columns to tenants table
Run this script to add pdf_top_margin and pdf_bottom_margin columns
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the PDF margins migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Running PDF margins migration...")

        # Read and execute migration file
        with open('migrations/010_add_pdf_margins_to_tenants.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Added pdf_top_margin and pdf_bottom_margin columns to tenants table")

        # Verify columns were added
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tenants'
            AND column_name IN ('pdf_top_margin', 'pdf_bottom_margin')
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
