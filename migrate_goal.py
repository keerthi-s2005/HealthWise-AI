import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from db import get_db_connection

def migrate_goal():
    print("Connecting to database for goal migration...")
    conn = get_db_connection()
    if not conn:
        print("ERROR: Could not establish database connection.")
        return False

    cursor = conn.cursor()
    try:
        # Check existing columns
        cursor.execute("DESCRIBE health_records;")
        columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns in health_records: {columns}")

        if "goal" not in columns:
            print("Adding 'goal' column to health_records...")
            cursor.execute("ALTER TABLE health_records ADD COLUMN goal VARCHAR(100) DEFAULT NULL AFTER health_conditions;")
            conn.commit()
            print("Successfully added 'goal' column!")
        else:
            print("'goal' column already exists.")

        return True
    except Exception as e:
        print(f"Migration error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate_goal()
