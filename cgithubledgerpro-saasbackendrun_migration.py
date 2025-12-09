import psycopg2
from app.config import settings

def run_migration():
    print("Connecting to database...")
    conn = psycopg2.connect(settings.DATABASE_URI)
    cur = conn.cursor()

    print("Reading migration file...")
    with open('migrations/002_update_partners_fields.sql', 'r') as f:
        migration_sql = f.read()

    print("Executing migration...")
    try:
        cur.execute(migration_sql)
        conn.commit()
        print("[SUCCESS] Migration completed successfully!")
        print("[SUCCESS] Partner fields updated")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
