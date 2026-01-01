"""
Verify if fiscal_year_id column exists in transactions table
"""
import psycopg2
from app.config import settings

conn = psycopg2.connect(settings.DATABASE_URI)
cur = conn.cursor()

# Check if column exists
cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    AND column_name = 'fiscal_year_id';
""")

result = cur.fetchall()
if result:
    print("[OK] Column fiscal_year_id EXISTS in transactions table:")
    for row in result:
        print(f"  - Column: {row[0]}, Type: {row[1]}, Nullable: {row[2]}")
else:
    print("[ERROR] Column fiscal_year_id DOES NOT EXIST in transactions table")

# Also check all columns in transactions table
print("\nAll columns in transactions table:")
cur.execute("""
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'transactions'
    ORDER BY ordinal_position;
""")

for row in cur.fetchall():
    print(f"  - {row[0]}: {row[1]}")

cur.close()
conn.close()
