"""
Run inventory system migration
Creates warehouses, stock_movements, and product_warehouse_stock tables
"""
import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the inventory system migration"""
    # Get database URL
    database_uri = os.getenv("DATABASE_URI")
    if not database_uri:
        raise ValueError("DATABASE_URI environment variable not set")

    print("Connecting to database...")
    conn = psycopg2.connect(database_uri)
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # Read migration file
        migration_file = Path(__file__).parent / "migrations" / "008_add_inventory_system.sql"
        print(f"Reading migration file: {migration_file}")

        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        print("Executing migration...")
        cursor.execute(migration_sql)

        print("SUCCESS: Inventory system migration completed successfully")
        print("- Created warehouses table")
        print("- Created stock_movements table with movement_type enum")
        print("- Created product_warehouse_stock table")
        print("- Created indexes and triggers")

    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
