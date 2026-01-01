"""
Delete All Invoices Script
WARNING: This will delete ALL invoices and related data from the database
"""
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

def delete_all_invoices():
    """Delete all invoices and related data"""
    database_url = os.getenv('DATABASE_URI')

    if not database_url:
        raise Exception("DATABASE_URI not found in environment variables")

    # Connect to database
    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        print("WARNING: This will delete ALL invoices and related data!")
        print("Counting invoices...")

        # Count invoices
        cursor.execute("SELECT COUNT(*) FROM invoices")
        invoice_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM invoice_payments")
        payment_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM invoice_line_items")
        line_item_count = cursor.fetchone()[0]

        print(f"Found:")
        print(f"  - {invoice_count} invoices")
        print(f"  - {payment_count} payments")
        print(f"  - {line_item_count} line items")
        print()

        if invoice_count == 0:
            print("No invoices to delete.")
            return

        # Use TRUNCATE which is faster and handles dependencies
        print("Truncating invoice tables...")
        cursor.execute("TRUNCATE TABLE invoices, invoice_line_items, invoice_payments RESTART IDENTITY CASCADE")
        print(f"  Truncated all invoice tables")

        # Also delete orphaned income transactions created by invoice payments
        print("Deleting orphaned income transactions...")
        cursor.execute("""
            DELETE FROM transactions
            WHERE transaction_type = 'INCOME'
            AND reference_number LIKE 'INV-%'
        """)
        print(f"  Deleted {cursor.rowcount} orphaned transactions")

        conn.commit()
        print()
        print("SUCCESS: All invoices and related data deleted successfully!")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Failed to delete invoices: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    delete_all_invoices()
