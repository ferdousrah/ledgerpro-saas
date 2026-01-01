import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection string
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Run the tenant address migration"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("Running tenant address migration...")

        # Read and execute migration
        with open('migrations/018_add_tenant_address.sql', 'r') as f:
            migration_sql = f.read()
            cursor.execute(migration_sql)

        print("SUCCESS: Tenant address column has been added!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
