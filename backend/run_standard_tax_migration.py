"""
Migration script to implement standard discount and tax calculation
Run this script to update to industry-standard calculation method
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DATABASE_URI")

def run_migration():
    """Run the standard tax calculation migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Implementing standard discount and tax calculation...")
        print("Formula: Tax = (Subtotal - Discount) × Effective_Tax_Rate")

        # Read and execute migration file
        with open('migrations/013_standard_discount_tax_calculation.sql', 'r') as f:
            migration_sql = f.read()
            cur.execute(migration_sql)

        # Commit changes
        conn.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] Updated to standard calculation method")

        # Trigger recalculation for all invoices
        print("\nRecalculating all invoices with new formula...")
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

        # Show examples
        print("\nExample invoices:")
        cur.execute("""
            SELECT invoice_number, subtotal, discount_amount, total_tax, total_amount
            FROM invoices
            ORDER BY created_at DESC
            LIMIT 3
        """)

        print("Invoice | Subtotal | Discount | Tax | Total")
        print("-" * 60)
        for row in cur.fetchall():
            inv_num, subtotal, discount, tax, total = row
            print(f"{inv_num} | {subtotal} | {discount} | {tax} | {total}")
            if discount and discount > 0:
                taxable = float(subtotal) - float(discount)
                print(f"  → Taxable: {taxable}, Tax Rate: {(float(tax)/taxable*100):.2f}%")

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
