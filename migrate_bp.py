import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db import get_db_connection

def migrate_blood_pressure_columns():
    """
    Safely adds systolic_bp and diastolic_bp columns to health_records table
    if they do not already exist. Preserves all existing data.
    """
    conn = get_db_connection()
    if not conn:
        print("Could not connect to MySQL database to perform migration.")
        return False

    try:
        cursor = conn.cursor(dictionary=True)
        # Check existing columns in health_records table
        cursor.execute("DESCRIBE health_records;")
        columns = [row["Field"] for row in cursor.fetchall()]
        
        added_columns = []
        
        if "systolic_bp" not in columns:
            cursor.execute("ALTER TABLE health_records ADD COLUMN systolic_bp INT DEFAULT NULL AFTER bmi;")
            added_columns.append("systolic_bp")
            
        if "diastolic_bp" not in columns:
            cursor.execute("ALTER TABLE health_records ADD COLUMN diastolic_bp INT DEFAULT NULL AFTER systolic_bp;")
            added_columns.append("diastolic_bp")

        conn.commit()

        if added_columns:
            print(f"Migration Successful! Added columns: {', '.join(added_columns)}")
        else:
            print("Migration Check: Both systolic_bp and diastolic_bp columns already exist.")
            
        return True
    except Exception as e:
        print(f"Error during migration: {e}")
        return False
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate_blood_pressure_columns()
