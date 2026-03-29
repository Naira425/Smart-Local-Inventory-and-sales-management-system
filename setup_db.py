import sqlite3
import os

# Database file path
DB_FILE = os.path.join(os.path.dirname(__file__), 'saald_inventory.db')

def execute_sql_file(filename):
    # Connect to SQLite
    connection = sqlite3.connect(DB_FILE)
    connection.execute('PRAGMA foreign_keys = ON')

    try:
        with open(filename, 'r', encoding='utf-8') as file:
            sql_content = file.read()

        # Split SQL commands by semicolon
        sql_commands = [cmd.strip() for cmd in sql_content.split(';') if cmd.strip()]

        cursor = connection.cursor()

        for command in sql_commands:
            if command:
                print(f"Executing: {command[:50]}...")
                cursor.execute(command)

        connection.commit()
        print("Database schema created successfully!")

    except Exception as e:
        print(f"Error: {e}")
        connection.rollback()
    finally:
        connection.close()

if __name__ == "__main__":
    sql_file = r"c:\Users\Serakoe Rapholo\Documents\SAaLD Project\Smart Local Inventory and Sales Management System\db_schema.sql"
    execute_sql_file(sql_file)