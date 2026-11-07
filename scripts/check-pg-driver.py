import os
import sys

for mod in ["psycopg2", "psycopg", "asyncpg"]:
    try:
        __import__(mod)
        print(f"{mod}: available")
    except ImportError:
        print(f"{mod}: not available")
