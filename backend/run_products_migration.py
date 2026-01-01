"""
Run Products Migration
Creates the products table in the database
"""
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URI = os.getenv("DATABASE_URI")

if not DATABASE_URI:
    raise ValueError("DATABASE_URI environment variable is not set")

# Read migration SQL
with open("migrations/006_add_products.sql", "r", encoding="utf-8") as f:
    migration_sql = f.read()

# Connect and execute
conn = psycopg2.connect(DATABASE_URI)
conn.autocommit = True
cursor = conn.cursor()

try:
    print("Running products migration...")
    cursor.execute(migration_sql)
    print("Products migration completed successfully!")
except Exception as e:
    print(f"Migration failed: {e}")
    raise
finally:
    cursor.close()
    conn.close()
