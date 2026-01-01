"""
Script to run the fiscal year migration
"""
import psycopg2
from app.config import settings

# Read the migration SQL
with open('migrations/003_add_financial_years.sql', 'r') as f:
    migration_sql = f.read()

# Connect to database
conn = psycopg2.connect(settings.DATABASE_URI)
conn.autocommit = False

try:
    cur = conn.cursor()

    # Execute migration
    print("Running fiscal year migration...")
    cur.execute(migration_sql)

    conn.commit()
    print("✓ Migration completed successfully!")

except Exception as e:
    conn.rollback()
    print(f"✗ Migration failed: {e}")
    raise
finally:
    cur.close()
    conn.close()
