"""
Migration Script: Fix Invoice Status on Payment Delete
Fixes the database trigger to properly update invoice status when all payments are deleted
"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def run_migration():
    """Run the invoice status fix migration"""
    # Get database connection string
    database_url = os.getenv('DATABASE_URI')

    if not database_url:
        raise Exception("DATABASE_URI not found in environment variables")

    # Connect to database
    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        print("Running migration: 012_fix_invoice_status_on_payment_delete.sql")

        # Read and execute migration file
        with open('migrations/012_fix_invoice_status_on_payment_delete.sql', 'r') as f:
            migration_sql = f.read()

        cursor.execute(migration_sql)
        conn.commit()

        print("SUCCESS: Migration completed successfully")
        print("SUCCESS: Invoice status trigger has been fixed")
        print("  - When all payments are deleted, status will now correctly change to SENT or OVERDUE")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
