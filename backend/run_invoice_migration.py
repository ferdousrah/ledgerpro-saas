"""
Run invoice migration - adds invoice and billing tables
"""
from app.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        print("\n" + "="*60)
        print("Running invoice and billing migration...")
        print("="*60 + "\n")

        # Read migration SQL
        with open('migrations/005_add_invoices.sql', 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        # Remove comments and split into statements
        # Skip the rollback script section
        migration_sql = migration_sql.split('-- ROLLBACK SCRIPT')[0]

        # Execute the entire migration (it's wrapped in BEGIN/COMMIT)
        print("Executing migration...")
        db.execute(text(migration_sql))
        db.commit()
        print("[OK] Migration executed successfully\n")

        print("="*60)
        print("Invoice and billing migration completed successfully!")
        print("="*60)
        print("\nCreated:")
        print("  - 3 ENUMs: invoice_status, payment_terms, payment_method")
        print("  - 5 Tables: invoices, invoice_line_items, invoice_payments,")
        print("              recurring_invoices, recurring_invoice_line_items")
        print("  - Indexes for performance")
        print("  - Triggers for auto-calculation")
        print("  - Updated activity_entity enum")
        print("\n")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
