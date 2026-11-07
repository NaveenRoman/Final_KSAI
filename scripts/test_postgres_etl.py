#!/usr/bin/env python3
"""
Comprehensive Test Suite for PostgreSQL ETL Conversion Logic & Relational Integrity
"""

import os
import sys
import json
import unittest
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKUPS_DIR = os.path.join(BASE_DIR, "backups")
sys.path.insert(0, os.path.join(BASE_DIR, "scripts"))

from import_postgres_etl import (
    convert_datetime,
    convert_boolean,
    transform_record,
    SCHEMA_FIELD_TYPES,
    TABLE_ORDER
)


class TestPostgresETL(unittest.TestCase):

    # ==========================================================================
    # 1. DateTime Conversion Tests
    # ==========================================================================
    def test_datetime_from_millisecond_int(self):
        ts_ms = 1787389062141
        dt = convert_datetime(ts_ms)
        self.assertIsInstance(dt, datetime)
        self.assertEqual(dt.tzinfo, timezone.utc)
        self.assertEqual(int(dt.timestamp() * 1000), ts_ms)

    def test_datetime_from_iso_string(self):
        iso_str = "2026-10-27T05:36:38Z"
        dt = convert_datetime(iso_str)
        self.assertIsInstance(dt, datetime)
        self.assertEqual(dt.year, 2026)
        self.assertEqual(dt.month, 10)
        self.assertEqual(dt.day, 27)

    def test_datetime_null_handling(self):
        self.assertIsNone(convert_datetime(None))
        self.assertIsNone(convert_datetime(""))
        self.assertIsNone(convert_datetime("None"))
        self.assertIsNone(convert_datetime("null"))
        self.assertIsNone(convert_datetime("NULL"))

    # ==========================================================================
    # 2. Boolean Conversion Tests (Exact Prisma Schema)
    # ==========================================================================
    def test_boolean_int_flags(self):
        self.assertIs(convert_boolean(1), True)
        self.assertIs(convert_boolean(0), False)

    def test_boolean_string_flags(self):
        self.assertIs(convert_boolean("true"), True)
        self.assertIs(convert_boolean("false"), False)
        self.assertIs(convert_boolean("1"), True)
        self.assertIs(convert_boolean("0"), False)

    def test_boolean_null_handling(self):
        self.assertIsNone(convert_boolean(None))
        self.assertIsNone(convert_boolean(""))
        self.assertIsNone(convert_boolean("null"))

    def test_chapter_progress_code_solved_schema_conversion(self):
        # ChapterProgress.codeSolved is a Prisma Boolean stored as 0 or 1 in SQLite
        raw_row = {
            "id": "test-progress-1",
            "userId": "user-123",
            "chapterId": "ch-456",
            "isCompleted": 1,
            "codeSolved": 0,
            "quizScore": 85,
            "updatedAt": 1787389062141
        }
        transformed = transform_record("ChapterProgress", raw_row)
        self.assertIs(transformed["codeSolved"], False)
        self.assertIs(transformed["isCompleted"], True)
        self.assertIsInstance(transformed["updatedAt"], datetime)
        self.assertEqual(transformed["quizScore"], 85)

    def test_daily_recap_date_preserves_string(self):
        # DailyRecap.date is String in Prisma, not DateTime
        raw_row = {
            "id": "recap-1",
            "userId": "user-123",
            "date": "2026-10-27",
            "createdAt": 1787389062141,
            "updatedAt": 1787389062141
        }
        transformed = transform_record("DailyRecap", raw_row)
        self.assertEqual(transformed["date"], "2026-10-27")
        self.assertIsInstance(transformed["date"], str)
        self.assertIsInstance(transformed["createdAt"], datetime)

    # ==========================================================================
    # 3. Integration Tests with Actual Exported Backup Data
    # ==========================================================================
    def test_real_exported_backup_records(self):
        export_dirs = [os.path.join(BACKUPS_DIR, d) for d in os.listdir(BACKUPS_DIR) if d.startswith("export_")]
        self.assertTrue(len(export_dirs) > 0, "No backups/export_* directory found.")
        export_dirs.sort()
        latest = export_dirs[-1]

        # 1. User records (test millisecond timestamps & null lastActiveDate)
        with open(os.path.join(latest, "User.json"), "r", encoding="utf-8") as f:
            users = json.load(f)
        self.assertEqual(len(users), 21)
        for u in users:
            row = transform_record("User", u)
            self.assertIsInstance(row["createdAt"], datetime)
            self.assertIsInstance(row["updatedAt"], datetime)
            self.assertIsInstance(row["emailVerified"], bool)
            if u["lastActiveDate"] is not None:
                self.assertIsInstance(row["lastActiveDate"], datetime)
            else:
                self.assertIsNone(row["lastActiveDate"])

        # 2. Account records (test null optional expires timestamps)
        with open(os.path.join(latest, "Account.json"), "r", encoding="utf-8") as f:
            accounts = json.load(f)
        self.assertEqual(len(accounts), 3)
        for acc in accounts:
            row = transform_record("Account", acc)
            if acc["accessTokenExpiresAt"] is not None:
                self.assertIsInstance(row["accessTokenExpiresAt"], datetime)
            else:
                self.assertIsNone(row["accessTokenExpiresAt"])
            if acc["refreshTokenExpiresAt"] is not None:
                self.assertIsInstance(row["refreshTokenExpiresAt"], datetime)
            else:
                self.assertIsNone(row["refreshTokenExpiresAt"])
            self.assertIsInstance(row["createdAt"], datetime)
            self.assertIsInstance(row["updatedAt"], datetime)

        # 3. ChapterProgress records (test codeSolved & isCompleted)
        with open(os.path.join(latest, "ChapterProgress.json"), "r", encoding="utf-8") as f:
            cps = json.load(f)
        self.assertEqual(len(cps), 6)
        for cp in cps:
            row = transform_record("ChapterProgress", cp)
            self.assertIsInstance(row["isCompleted"], bool)
            self.assertIsInstance(row["codeSolved"], bool)
            self.assertIsInstance(row["updatedAt"], datetime)

        # 4. LearningMemory records (test isActive boolean & optional dates)
        with open(os.path.join(latest, "LearningMemory.json"), "r", encoding="utf-8") as f:
            memories = json.load(f)
        self.assertEqual(len(memories), 36)
        for mem in memories:
            row = transform_record("LearningMemory", mem)
            self.assertIsInstance(row["isActive"], bool)
            self.assertIsInstance(row["createdAt"], datetime)
            self.assertIsInstance(row["lastObserved"], datetime)
            if mem["lastReviewed"] is not None:
                self.assertIsInstance(row["lastReviewed"], datetime)
            else:
                self.assertIsNone(row["lastReviewed"])

    # ==========================================================================
    # 4. Foreign Key Dependency Topological Order Verification
    # ==========================================================================
    def test_topological_table_order_validity(self):
        # Ensure that every parent table appears before any table that references it
        seen_tables = set()
        for table in TABLE_ORDER:
            fks = SCHEMA_FIELD_TYPES[table]["fks"]
            for fk_col, parent_table in fks.items():
                self.assertIn(
                    parent_table,
                    seen_tables,
                    f"Dependency error: '{table}' depends on '{parent_table}', but '{parent_table}' is ordered after it."
                )
            seen_tables.add(table)

    def test_relational_integrity_across_entire_export(self):
        export_dirs = [os.path.join(BACKUPS_DIR, d) for d in os.listdir(BACKUPS_DIR) if d.startswith("export_")]
        export_dirs.sort()
        latest = export_dirs[-1]

        primary_keys = {}
        for table in TABLE_ORDER:
            table_file = os.path.join(latest, f"{table}.json")
            if not os.path.exists(table_file):
                continue
            with open(table_file, "r", encoding="utf-8") as f:
                records = json.load(f)

            primary_keys[table] = {str(r["id"]) for r in records if "id" in r}
            fks = SCHEMA_FIELD_TYPES[table]["fks"]

            for r in records:
                for fk_col, parent_table in fks.items():
                    val = r.get(fk_col)
                    if val is not None and str(val).strip() != "":
                        self.assertIn(
                            str(val),
                            primary_keys[parent_table],
                            f"Orphaned key in {table}: {fk_col}='{val}' not in {parent_table}"
                        )


if __name__ == "__main__":
    unittest.main()
