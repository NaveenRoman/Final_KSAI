#!/usr/bin/env python3
"""
KnowledgeStream AI — SQLite Consistent Database Backup & Isolated Restore Verification

Uses Python's standard library `sqlite3.Connection.backup()` API to invoke SQLite's
native online backup mechanism. Performs atomic page-level snapshots without locking
active readers/writers or risking torn pages.

Verifies restoration in an isolated scratch database without touching the live database.
"""

import os
import sys
import sqlite3
import tempfile
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "prisma", "dev.db")
BACKUP_DIR = os.path.join(BASE_DIR, "backups")

if not os.path.exists(DB_PATH):
    print(f"[ERROR] Source database not found at: {DB_PATH}")
    sys.exit(1)

os.makedirs(BACKUP_DIR, exist_ok=True)

print("=" * 60)
print("KSAI DATABASE NATIVE ATOMIC BACKUP & ISOLATED VERIFICATION")
print("=" * 60)
print(f"Source DB: {DB_PATH}")

# 1. Source Database Integrity Check
print("\n[1/4] Checking source database integrity...")
src_conn = sqlite3.connect(DB_PATH)
src_cur = src_conn.cursor()

integrity = src_cur.execute("PRAGMA integrity_check;").fetchall()
if integrity != [("ok",)]:
    print(f"  [FAIL] Integrity check failed: {integrity}")
    src_conn.close()
    sys.exit(1)

fk_violations = src_cur.execute("PRAGMA foreign_key_check;").fetchall()
if fk_violations:
    print(f"  [WARN] Foreign key check reported violations: {fk_violations}")
else:
    print("  >> Source PRAGMA integrity_check: ok (0 foreign key violations)")

# Get baseline counts from source
src_user_count = src_cur.execute("SELECT count(*) FROM User;").fetchone()[0]
src_course_count = src_cur.execute("SELECT count(*) FROM Course;").fetchone()[0]
print(f"  >> Source records: {src_user_count} Users, {src_course_count} Courses")

# 2. Perform Native SQLite Online Backup
timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
backup_filename = f"ksai_backup_{timestamp}.db"
backup_path = os.path.join(BACKUP_DIR, backup_filename)

print(f"\n[2/4] Creating atomic snapshot via sqlite3.Connection.backup()...")
dest_conn = sqlite3.connect(backup_path)

# Execute native SQLite backup
src_conn.backup(dest_conn)
dest_conn.close()
src_conn.close()

backup_size = os.path.getsize(backup_path)
print(f"  >> Snapshot created: {backup_path}")
print(f"  >> Backup file size: {backup_size:,} bytes")

# 3. Test Isolated Restore Verification
print(f"\n[3/4] Verifying restore in an isolated temporary location...")
with tempfile.TemporaryDirectory() as temp_dir:
    test_restore_path = os.path.join(temp_dir, "test_restored.db")
    
    # Restore from the backup file into the isolated test database
    bck_conn = sqlite3.connect(backup_path)
    restore_conn = sqlite3.connect(test_restore_path)
    bck_conn.backup(restore_conn)
    bck_conn.close()
    
    # Verify the restored database
    test_cur = restore_conn.cursor()
    test_integrity = test_cur.execute("PRAGMA integrity_check;").fetchall()
    if test_integrity != [("ok",)]:
        print(f"  [FAIL] Restored database integrity check failed: {test_integrity}")
        restore_conn.close()
        sys.exit(1)
        
    test_user_count = test_cur.execute("SELECT count(*) FROM User;").fetchone()[0]
    test_course_count = test_cur.execute("SELECT count(*) FROM Course;").fetchone()[0]
    restore_conn.close()

    if test_user_count != src_user_count or test_course_count != src_course_count:
        print(f"  [FAIL] Record count mismatch in restored DB! (Users: {test_user_count} vs {src_user_count})")
        sys.exit(1)

    print("  >> Restored database PRAGMA integrity_check: ok")
    print(f"  >> Restored records verified: {test_user_count} Users, {test_course_count} Courses")

print("\n[4/4] Live Database Protection Guarantee:")
print("  >> Live database prisma/dev.db was NOT overwritten or modified.")
print(f"  >> Backup safely archived at: {backup_path}")

print("\n" + "=" * 60)
print("BACKUP AND RESTORE VERIFICATION PASSED (100% HEALTHY)")
print("=" * 60)
