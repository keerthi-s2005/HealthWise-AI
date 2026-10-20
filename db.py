import os
import mysql.connector
from mysql.connector import Error
from config import Config

def get_db_connection(database=None):
    """
    Creates and returns a MySQL database connection using credentials from Config.
    If database parameter is specified, connects directly to that database.
    """
    db_name = database if database is not None else Config.DB_NAME
    try:
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=db_name,
            autocommit=True
        )
        return connection
    except Error as err:
        # If database doesn't exist yet, attempt connecting without database selected
        if err.errno == 1049: # Unknown database
            try:
                conn_no_db = mysql.connector.connect(
                    host=Config.DB_HOST,
                    port=Config.DB_PORT,
                    user=Config.DB_USER,
                    password=Config.DB_PASSWORD,
                    autocommit=True
                )
                return conn_no_db
            except Error as inner_err:
                print(f"MySQL Connection Error: {inner_err}")
                return None
        print(f"MySQL Connection Error: {err}")
        return None

def init_db():
    """
    Initializes the MySQL database schema from schema.sql if MySQL is available.
    """
    sql_file_path = os.path.join(os.path.dirname(__file__), "database", "schema.sql")
    if not os.path.exists(sql_file_path):
        print(f"Schema file not found at {sql_file_path}")
        return False

    conn = get_db_connection(database="")
    if not conn:
        print("Could not connect to MySQL server to initialize database.")
        return False

    try:
        cursor = conn.cursor()
        with open(sql_file_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        # Execute statements in schema.sql
        for statement in sql_script.split(";"):
            stmt = statement.strip()
            if stmt:
                cursor.execute(stmt)
        print(f"Database '{Config.DB_NAME}' initialized successfully.")

        # Safely verify and alter table columns for backward compatibility
        cursor.execute(f"USE {Config.DB_NAME}")
        
        cursor.execute("SHOW COLUMNS FROM health_records LIKE 'systolic_bp'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE health_records ADD COLUMN systolic_bp INT DEFAULT NULL")
            print("Added 'systolic_bp' column to health_records table.")

        cursor.execute("SHOW COLUMNS FROM health_records LIKE 'diastolic_bp'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE health_records ADD COLUMN diastolic_bp INT DEFAULT NULL")
            print("Added 'diastolic_bp' column to health_records table.")

        cursor.execute("SHOW COLUMNS FROM health_records LIKE 'goal'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE health_records ADD COLUMN goal VARCHAR(100) DEFAULT NULL")
            print("Added 'goal' column to health_records table.")

        return True
    except Error as e:
        print(f"Error executing schema.sql: {e}")
        return False
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    init_db()
