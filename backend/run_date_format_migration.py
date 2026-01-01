"""
Run date_format migration - adds date_format column to tenants table
"""
from app.database import SessionLocal
from sqlalchemy import text

def run_migration():
    db = SessionLocal()
    try:
        print("\n" + "="*60)
        print("Running date_format migration...")
        print("="*60 + "\n")

        # Read migration SQL
        with open('migrations/004_add_date_format_to_tenants.sql', 'r') as f:
            migration_sql = f.read()

        # Split by semicolon and execute each statement
        statements = [s.strip() for s in migration_sql.split(';') if s.strip()]

        for i, statement in enumerate(statements, 1):
            print(f"Executing statement {i}...")
            db.execute(text(statement))
            db.commit()
            print(f"[OK] Statement {i} executed successfully\n")

        print("="*60)
        print("Migration completed successfully!")
        print("="*60)

    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
