import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/ledgerpro_saas")

def run_migration():
    """Run migration 004 - Add financial_year to activityentity enum"""
    try:
        print("=" * 60)
        print("Running Migration 004: Add financial_year entity type")
        print("=" * 60)

        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()

        # Check current enum values
        print("\n1. Checking current activityentity enum values...")
        cur.execute("SELECT unnest(enum_range(NULL::activityentity))")
        current_values = [row[0] for row in cur.fetchall()]
        print(f"   Current values: {', '.join(current_values)}")

        # Add new value if it doesn't exist
        if 'financial_year' not in current_values:
            print("\n2. Adding 'financial_year' to activityentity enum...")

            # Read and execute migration file
            migration_file = os.path.join(os.path.dirname(__file__), 'migrations', '004_add_financial_year_entity_type.sql')
            with open(migration_file, 'r') as f:
                sql = f.read()

            # Execute the migration
            cur.execute("ALTER TYPE activityentity ADD VALUE 'financial_year'")
            print("   ✓ Successfully added 'financial_year' to enum")
        else:
            print("\n2. Migration already applied - 'financial_year' exists in enum")

        # Verify the change
        print("\n3. Verifying migration...")
        cur.execute("SELECT unnest(enum_range(NULL::activityentity))")
        updated_values = [row[0] for row in cur.fetchall()]
        print(f"   Updated enum values: {', '.join(updated_values)}")

        if 'financial_year' in updated_values:
            print("   ✓ Migration verified successfully!")
        else:
            print("   ✗ Migration verification failed!")
            raise Exception("financial_year not found in enum after migration")

        cur.close()
        conn.close()

        print("\n" + "=" * 60)
        print("Migration 004 completed successfully!")
        print("=" * 60)
        print("\nYou can now:")
        print("  1. Restart the backend server")
        print("  2. Create financial years without errors")
        print("=" * 60)

    except psycopg2.OperationalError as e:
        print("\n" + "=" * 60)
        print("ERROR: Could not connect to PostgreSQL")
        print("=" * 60)
        print("\nPlease ensure:")
        print("  1. PostgreSQL is running")
        print("  2. Database 'ledgerpro_saas' exists")
        print("  3. Connection settings are correct in .env")
        print(f"\nError details: {e}")
        print("=" * 60)
    except Exception as e:
        print(f"\n✗ Error during migration: {e}")
        raise

if __name__ == "__main__":
    run_migration()
