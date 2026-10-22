"""Script to execute Supabase database migrations automatically via connection pooler."""

import sys
import psycopg2
from pathlib import Path

DB_HOST = "aws-0-ap-south-1.pooler.supabase.com"
DB_NAME = "postgres"
DB_USER = "postgres.hrfcvtflmkafvkgyiexc"
DB_PASS = "Aaryavvh@911"
DB_PORT = 5432

MIGRATION_FILE = Path(__file__).resolve().parent.parent / "supabase" / "migrations" / "combined_migration.sql"


def run_migration():
    print(f"Connecting to {DB_HOST}:{DB_PORT} as {DB_USER}...")
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT,
            sslmode="require",
            connect_timeout=10,
        )
        conn.autocommit = True
        print("Connected successfully to Supabase PostgreSQL!")

        with open(MIGRATION_FILE, "r", encoding="utf-8") as f:
            sql = f.read()

        print("Executing combined migration SQL...")
        with conn.cursor() as cur:
            cur.execute(sql)

        print("Migration executed successfully!")

        # Verify all public tables created
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cur.fetchall()]
            print(f"\nCreated {len(tables)} public tables in database:")
            for t in tables:
                print(f"  ✓ {t}")

        conn.close()
        return True
    except Exception as e:
        print(f"Migration error: {e}")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
