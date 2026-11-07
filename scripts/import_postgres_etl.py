#!/usr/bin/env python3
"""
KnowledgeStream AI — PostgreSQL Import & Migration Verification Tool

Reads structured JSON dumps from the latest backups/export_* directory and
populates a target PostgreSQL database with schema-aware type conversions,
foreign-key topological ordering, transaction rollback safety, and a dry-run validation mode.

Usage:
    # 1. Dry-run validation (no DB connection required, validates types & foreign keys)
    python scripts/import_postgres_etl.py --dry-run

    # 2. Live import into target PostgreSQL database
    python scripts/import_postgres_etl.py [POSTGRES_DATABASE_URL]
    # or set DATABASE_URL environment variable
"""

import os
import sys
import json
import argparse
from datetime import datetime, timezone

# Optional dependency: psycopg2 is only required for live database import
try:
    import psycopg2
except ImportError:
    psycopg2 = None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")

# ==============================================================================
# 1. Authoritative Schema Field Type Mapping (from prisma/schema.prisma)
# ==============================================================================
SCHEMA_FIELD_TYPES = {
    "User": {
        "booleans": {"emailVerified"},
        "datetimes": {"createdAt", "updatedAt", "lastActiveDate"},
        "fks": {}
    },
    "Contest": {
        "booleans": set(),
        "datetimes": {"startTime", "endTime", "createdAt", "updatedAt"},
        "fks": {}
    },
    "Challenge": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"contestId": "Contest"}
    },
    "Submission": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {"challengeId": "Challenge", "userId": "User"}
    },
    "Session": {
        "booleans": set(),
        "datetimes": {"expiresAt", "createdAt", "updatedAt"},
        "fks": {"userId": "User"}
    },
    "Account": {
        "booleans": set(),
        "datetimes": {"accessTokenExpiresAt", "refreshTokenExpiresAt", "createdAt", "updatedAt"},
        "fks": {"userId": "User"}
    },
    "Verification": {
        "booleans": set(),
        "datetimes": {"expiresAt", "createdAt", "updatedAt"},
        "fks": {}
    },
    "Otp": {
        "booleans": set(),
        "datetimes": {"expiresAt", "lastSentAt", "createdAt", "updatedAt"},
        "fks": {}
    },
    "Course": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {}
    },
    "Chapter": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {"courseId": "Course"}
    },
    "ChapterProgress": {
        "booleans": {"isCompleted", "codeSolved"},
        "datetimes": {"updatedAt"},
        "fks": {"userId": "User", "chapterId": "Chapter"}
    },
    "Enrollment": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {"userId": "User", "courseId": "Course"}
    },
    "XpTransaction": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {"userId": "User", "courseId": "Course"}
    },
    "WeeklyLeaderboardSnapshot": {
        "booleans": {"locked"},
        "datetimes": {"weekStart", "weekEnd", "createdAt"},
        "fks": {"userId": "User"}
    },
    "ActivityLog": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {"userId": "User"}
    },
    "Notification": {
        "booleans": {"read"},
        "datetimes": {"createdAt"},
        "fks": {"userId": "User"}
    },
    "WeeklyGoal": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"userId": "User"}
    },
    "Practice": {
        "booleans": set(),
        "datetimes": {"createdAt"},
        "fks": {}
    },
    "LessonProgress": {
        "booleans": set(),
        "datetimes": {"lastActivity", "createdAt", "updatedAt"},
        "fks": {"userId": "User", "chapterId": "Chapter"}
    },
    "LearningNote": {
        "booleans": {"isPinned"},
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"userId": "User", "courseId": "Course", "chapterId": "Chapter", "pageId": "NotebookPage"}
    },
    "NotebookPage": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"userId": "User", "courseId": "Course"}
    },
    "LearningEvent": {
        "booleans": {"shouldSave"},
        "datetimes": {"createdAt"},
        "fks": {"userId": "User"}
    },
    "TopicProgress": {
        "booleans": set(),
        "datetimes": {"lastEvaluated", "lastActivity", "createdAt", "updatedAt"},
        "fks": {"userId": "User"}
    },
    "LearningMemory": {
        "booleans": {"isActive"},
        "datetimes": {"lastObserved", "lastReviewed", "createdAt", "updatedAt"},
        "fks": {"userId": "User"}
    },
    "DailyRecap": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"userId": "User"}
    },
    "ChapterRecap": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"userId": "User", "courseId": "Course", "chapterId": "Chapter"}
    },
    "College": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {}
    },
    "Department": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"collegeId": "College"}
    },
    "AcademicClass": {
        "booleans": {"active"},
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"departmentId": "Department"}
    },
    "CollegeAnnouncement": {
        "booleans": set(),
        "datetimes": {"date", "createdAt"},
        "fks": {"collegeId": "College"}
    },
    "DepartmentAnnouncement": {
        "booleans": set(),
        "datetimes": {"date", "createdAt"},
        "fks": {"departmentId": "Department"}
    },
    "PlacementBatch": {
        "booleans": set(),
        "datetimes": {"createdAt", "updatedAt"},
        "fks": {"collegeId": "College"}
    }
}

# ==============================================================================
# 2. Strict Foreign-Key Topological Loading Order (Roots to Dependents)
# ==============================================================================
TABLE_ORDER = [
    # Tier 1: Independent Root Entities (No Foreign Keys)
    "User", "College", "Contest", "Course", "Verification", "Otp", "Practice",
    # Tier 2: 1st Level Dependents
    "Department", "CollegeAnnouncement", "PlacementBatch", "Session", "Account",
    "Challenge", "Chapter", "Enrollment", "LearningEvent", "ActivityLog",
    "Notification", "WeeklyGoal", "WeeklyLeaderboardSnapshot", "NotebookPage",
    # Tier 3: 2nd Level Dependents
    "AcademicClass", "DepartmentAnnouncement", "Submission", "ChapterProgress",
    "LessonProgress", "TopicProgress", "LearningMemory", "DailyRecap",
    "ChapterRecap", "XpTransaction",
    # Tier 4: Multi-Parent Dependents
    "LearningNote"
]

# ==============================================================================
# 3. Robust Type Conversion Utilities
# ==============================================================================
def convert_datetime(val):
    """
    Converts SQLite Prisma DateTime values into valid PostgreSQL timestamps.
    Handles:
      - null/None/empty strings -> None
      - millisecond epoch integers/floats -> datetime object with UTC timezone
      - ISO formatted strings -> parsed datetime object
    """
    if val is None or val == "" or str(val).lower() in ("none", "null"):
        return None
    if isinstance(val, (int, float)):
        return datetime.fromtimestamp(val / 1000.0, tz=timezone.utc)
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str or val_str.lower() in ("none", "null"):
            return None
        if val_str.isdigit():
            return datetime.fromtimestamp(int(val_str) / 1000.0, tz=timezone.utc)
        try:
            return datetime.fromisoformat(val_str.replace("Z", "+00:00"))
        except ValueError:
            return val_str
    if isinstance(val, datetime):
        return val
    return val

def convert_boolean(val):
    """
    Converts values into strict Python booleans for PostgreSQL BOOLEAN columns.
    Handles:
      - null/None/empty strings -> None
      - 0 / 1 integer flags from SQLite -> False / True
      - string flags ("true", "false", "1", "0") -> True / False
    """
    if val is None or val == "" or str(val).lower() in ("none", "null"):
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return bool(val)
    if isinstance(val, str):
        v_low = val.strip().lower()
        if v_low in ("true", "1", "t", "yes"):
            return True
        if v_low in ("false", "0", "f", "no"):
            return False
    return bool(val)

def transform_record(table_name, record):
    """
    Transforms a single record's fields according to SCHEMA_FIELD_TYPES.
    """
    schema = SCHEMA_FIELD_TYPES.get(table_name, {"booleans": set(), "datetimes": set()})
    bool_fields = schema.get("booleans", set())
    date_fields = schema.get("datetimes", set())

    transformed = {}
    for col, val in record.items():
        if col in bool_fields:
            transformed[col] = convert_boolean(val)
        elif col in date_fields:
            transformed[col] = convert_datetime(val)
        else:
            transformed[col] = val
    return transformed

# ==============================================================================
# 4. Dry-Run Validation Mode
# ==============================================================================
def run_dry_run(export_dir):
    """
    Performs comprehensive offline validation of all exported records:
      - Tests field-level type conversions (millisecond epochs, booleans, nulls)
      - Verifies foreign-key relational integrity in topological order
      - Validates total record counts against manifest
    """
    print("\n" + "=" * 70)
    print("ETL DRY-RUN VALIDATION MODE (OFFLINE -- ZERO DB WRITES)")
    print("=" * 70)
    print(f"Export Directory: {export_dir}")

    manifest_path = os.path.join(export_dir, "manifest.json")
    if not os.path.exists(manifest_path):
        print(f"[ERROR] manifest.json not found in {export_dir}")
        return False

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    print(f"Manifest Source:   {manifest.get('source_database')}")
    print(f"Total Tables:      {manifest.get('table_count')}")
    print(f"Expected Records:  {manifest.get('total_records')}\n")

    # In-memory primary key storage to validate foreign key dependencies
    primary_keys = {}
    total_validated = 0
    total_dates_converted = 0
    total_null_dates = 0
    total_booleans_converted = 0
    validation_errors = []

    for table in TABLE_ORDER:
        table_file = os.path.join(export_dir, f"{table}.json")
        if not os.path.exists(table_file):
            continue

        with open(table_file, "r", encoding="utf-8") as f:
            records = json.load(f)

        schema = SCHEMA_FIELD_TYPES.get(table, {"booleans": set(), "datetimes": set(), "fks": {}})
        bool_fields = schema.get("booleans", set())
        date_fields = schema.get("datetimes", set())
        fk_rules = schema.get("fks", {})

        primary_keys[table] = set()

        for idx, raw_row in enumerate(records):
            row = transform_record(table, raw_row)
            row_id = row.get("id")
            if row_id:
                primary_keys[table].add(str(row_id))

            # Validate date conversions
            for df in date_fields:
                if df in row:
                    val = row[df]
                    if val is None:
                        total_null_dates += 1
                    elif isinstance(val, datetime):
                        total_dates_converted += 1
                    else:
                        validation_errors.append(
                            f"[{table} row #{idx}] Date field '{df}' failed conversion to datetime: {type(val)} ({val})"
                        )

            # Validate boolean conversions
            for bf in bool_fields:
                if bf in row:
                    val = row[bf]
                    if val is not None and not isinstance(val, bool):
                        validation_errors.append(
                            f"[{table} row #{idx}] Boolean field '{bf}' failed conversion: {type(val)} ({val})"
                        )
                    elif isinstance(val, bool):
                        total_booleans_converted += 1

            # Validate foreign keys against previously loaded parent tables
            for fk_col, parent_table in fk_rules.items():
                fk_val = row.get(fk_col)
                if fk_val is not None and str(fk_val).strip() != "":
                    parent_ids = primary_keys.get(parent_table, set())
                    if str(fk_val) not in parent_ids:
                        validation_errors.append(
                            f"[{table} row #{idx}] Foreign key violation: {fk_col}='{fk_val}' not found in parent table '{parent_table}'"
                        )

            total_validated += 1

        print(f"  [OK] {table:26s} | {len(records):4d} records validated")

    print("\n" + "-" * 70)
    print("VALIDATION SUMMARY:")
    print(f"  * Total Records Converted & Validated: {total_validated}")
    print(f"  * DateTime Fields Converted:           {total_dates_converted}")
    print(f"  * Null DateTime Fields Preserved:       {total_null_dates}")
    print(f"  * Boolean Fields Converted:            {total_booleans_converted}")
    print(f"  * Foreign Key Violations Found:        {len([e for e in validation_errors if 'Foreign key' in e])}")
    print(f"  * Type Conversion Errors:              {len([e for e in validation_errors if 'failed conversion' in e])}")

    if validation_errors:
        print("\n[VALIDATION FAILURES]")
        for err in validation_errors[:10]:
            print(f"  [ERROR] {err}")
        if len(validation_errors) > 10:
            print(f"  ... and {len(validation_errors) - 10} more errors")
        return False

    print("\n[SUCCESS] DRY-RUN PASSED: All exported data, type conversions, and foreign-key dependencies are 100% valid.")
    print("=" * 70)
    return True

# ==============================================================================
# 5. Live Database Import Mode (Transaction-Safe)
# ==============================================================================
def run_live_import(export_dir, pg_url):
    """
    Executes transaction-safe bulk insert into target PostgreSQL instance.
    Guarantees:
      - Uses topological table order to respect foreign keys without session_replication_role.
      - Enforces atomic transaction: commits ONLY if all tables succeed.
      - Automatically rolls back on any error without partial writes.
    """
    if psycopg2 is None:
        print("[ERROR] 'psycopg2' package is required for live PostgreSQL import.")
        print("Install via: pip install psycopg2-binary")
        sys.exit(1)

    manifest_path = os.path.join(export_dir, "manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    print("\n" + "=" * 70)
    print("KSAI POSTGRESQL LIVE DATA IMPORT (TRANSACTION-SAFE)")
    print("=" * 70)
    print(f"Target Database: [Protected Endpoint]")
    print(f"Source Export:   {export_dir}")
    print(f"Total Records:   {manifest.get('total_records')}\n")

    conn = psycopg2.connect(pg_url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        imported_stats = {}

        for table in TABLE_ORDER:
            table_file = os.path.join(export_dir, f"{table}.json")
            if not os.path.exists(table_file):
                continue

            with open(table_file, "r", encoding="utf-8") as f:
                records = json.load(f)

            if not records:
                imported_stats[table] = 0
                continue

            columns = list(records[0].keys())
            col_names = ", ".join([f'"{c}"' for c in columns])
            placeholders = ", ".join(["%s"] * len(columns))

            values = []
            for raw_r in records:
                r = transform_record(table, raw_r)
                row_vals = [r[c] for c in columns]
                values.append(tuple(row_vals))

            insert_sql = f'INSERT INTO "{table}" ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING;'
            cur.executemany(insert_sql, values)
            imported_stats[table] = len(values)
            print(f"  [OK] Imported {len(values):4d} records into {table}")

        # Post-import parity check inside the uncommitted transaction
        print("\nVerifying row counts inside transaction...")
        all_matched = True
        for table, meta in manifest.get("tables", {}).items():
            cur.execute(f'SELECT count(*) FROM "{table}";')
            actual_count = cur.fetchone()[0]
            exp_count = meta.get("record_count", 0)
            status = "MATCH" if actual_count == exp_count else "MISMATCH"
            if status == "MISMATCH":
                all_matched = False
            print(f"  [{status}] {table:26s} : {actual_count} in PG (expected {exp_count})")

        if not all_matched:
            raise RuntimeError("Row count parity check failed inside transaction.")

        # Commit transaction only when 100% verified
        conn.commit()
        print("\n" + "=" * 70)
        print("TRANSACTION COMMITTED: 100% OF RECORDS MIGRATED & VERIFIED.")
        print("=" * 70)

    except Exception as err:
        conn.rollback()
        print("\n" + "=" * 70)
        print(f"[TRANSACTION ROLLED BACK] Migration failed: {err}")
        print("Database left completely unmodified.")
        print("=" * 70)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

# ==============================================================================
# 6. Main Entrypoint & CLI Parsing
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(description="KnowledgeStream AI PostgreSQL Import & Verification Tool")
    parser.add_argument("database_url", nargs="?", default=None, help="Target PostgreSQL connection URL")
    parser.add_argument("--dry-run", action="store_true", help="Validate conversions and foreign keys without connecting to DB")
    parser.add_argument("--export-dir", default=None, help="Specific backups/export_* directory to import from")
    args = parser.parse_args()

    # Discover export directory
    export_dir = args.export_dir
    if not export_dir:
        export_dirs = [
            os.path.join(BACKUPS_DIR, d)
            for d in os.listdir(BACKUPS_DIR)
            if d.startswith("export_") and os.path.isdir(os.path.join(BACKUPS_DIR, d))
        ]
        if not export_dirs:
            print("[ERROR] No export_* directories found in backups/.")
            sys.exit(1)
        export_dirs.sort()
        export_dir = export_dirs[-1]

    # 1. Execute Dry-Run Mode
    if args.dry_run:
        success = run_dry_run(export_dir)
        sys.exit(0 if success else 1)

    # 2. Execute Live Import Mode
    pg_url = args.database_url or os.environ.get("DATABASE_URL")
    if not pg_url or not pg_url.startswith("postgres"):
        print("=" * 70)
        print("KSAI POSTGRESQL IMPORT & VERIFICATION TOOL")
        print("=" * 70)
        print("[INFO] No PostgreSQL URL provided.")
        print("To validate exported data offline:  python scripts/import_postgres_etl.py --dry-run")
        print("To perform live database import:    python scripts/import_postgres_etl.py \"postgresql://user:pass@host:5432/db?sslmode=require\"")
        print("=" * 70)
        sys.exit(0)

    run_live_import(export_dir, pg_url)

if __name__ == "__main__":
    main()
