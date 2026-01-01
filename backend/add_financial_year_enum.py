import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/ledgerpro_saas")

def add_enum_value():
    """Add 'financial_year' to activityentity enum"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()

        # Check current enum values
        print("Checking current enum values...")
        cur.execute("SELECT unnest(enum_range(NULL::activityentity))")
        current_values = [row[0] for row in cur.fetchall()]
        print(f"Current values: {current_values}")

        # Add new value if it doesn't exist
        if 'financial_year' not in current_values:
            print("\nAdding 'financial_year' to activityentity enum...")
            cur.execute("ALTER TYPE activityentity ADD VALUE 'financial_year'")
            print("✓ Successfully added 'financial_year' to enum")
        else:
            print("\n'financial_year' already exists in enum")

        # Verify
        cur.execute("SELECT unnest(enum_range(NULL::activityentity))")
        updated_values = [row[0] for row in cur.fetchall()]
        print(f"\nUpdated enum values: {updated_values}")

        cur.close()
        conn.close()
        print("\n✓ Database update complete!")

    except Exception as e:
        print(f"Error: {e}")
        raise

if __name__ == "__main__":
    add_enum_value()
