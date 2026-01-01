"""
Run product categories migration
Creates the product_categories table and adds product_category_id to products table
"""
import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the product categories migration"""
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
        migration_file = Path(__file__).parent / "migrations" / "007_add_product_categories.sql"
        print(f"Reading migration file: {migration_file}")

        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        print("Executing migration...")
        cursor.execute(migration_sql)

        print("SUCCESS: Product categories migration completed successfully")
        print("- Created product_categories table")
        print("- Added product_category_id column to products table")
        print("- Created indexes and triggers")

    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
