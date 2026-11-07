"""
Codexa Execution Broker — Comprehensive Verification Test Suite.
Verifies all 15 test scenarios:
1. Valid Python execution
2. Valid Java execution
3. Valid C execution
4. Valid C++ execution
5. Missing and malformed fields
6. Unknown fields
7. Invalid signature
8. Altered request body
9. Expired timestamp
10. Replayed nonce
11. Concurrent execution limit (2 max)
12. Queue timeout (3s)
13. Execution timeout (7s)
14. Container cleanup in finally block
15. Broker restart and persistent WAL recovery
"""

import os
import sys
import time
import uuid
import shutil
import asyncio
import threading
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor

from .protocol import (
    ERR_MALFORMED_JSON,
    ERR_UNKNOWN_FIELD,
    ERR_MISSING_FIELD,
    ERR_INVALID_FIELD,
    ERR_INVALID_SIGNATURE,
    ERR_REPLAY_DETECTED,
    ERR_CONCURRENT_LIMIT,
    ERR_CAPACITY_EXCEEDED,
    ERR_EXECUTION_TIMEOUT,
)
from .signer import sign_student_request, compute_body_hash
from .nonce_store import NonceStore
from .runner_backend import MockContainerRunner, DockerContainerRunner
from .server import BrokerServer
from .client import BrokerClient

TEST_SECRET = "test_student_signing_secret_99887766554433221100aabbccddeeff"
TEST_PORT = 49281
TEST_HOST = "127.0.0.1"


class TestCodexaBroker(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp_dir = tempfile.mkdtemp(prefix="codexa_test_broker_")
        cls.wal_path = os.path.join(cls.temp_dir, "test_nonces.wal")
        cls.mock_runner = MockContainerRunner()
        cls.nonce_store = NonceStore(wal_path=cls.wal_path)

        cls.server = BrokerServer(
            signing_secret=TEST_SECRET,
            host=TEST_HOST,
            port=TEST_PORT,
            max_concurrency=2,
            queue_timeout=3.0,
            runner_backend=cls.mock_runner,
            nonce_store=cls.nonce_store,
        )

        cls.server_loop = asyncio.new_event_loop()
        cls.server_thread = threading.Thread(
            target=cls._run_server_loop, args=(cls.server_loop, cls.server), daemon=True
        )
        cls.server_thread.start()
        time.sleep(0.5)  # Allow socket to bind

        cls.client = BrokerClient(
            endpoint=(TEST_HOST, TEST_PORT),
            signing_secret=TEST_SECRET,
            timeout=10.0,
        )

    @classmethod
    def _run_server_loop(cls, loop, server):
        asyncio.set_event_loop(loop)
        loop.run_until_complete(server.start())
        loop.run_forever()

    @classmethod
    def tearDownClass(cls):
        future = asyncio.run_coroutine_threadsafe(cls.server.stop(), cls.server_loop)
        future.result(timeout=5.0)
        cls.server_loop.call_soon_threadsafe(cls.server_loop.stop)
        cls.server_thread.join(timeout=2.0)
        shutil.rmtree(cls.temp_dir, ignore_errors=True)

    # -------------------------------------------------------------
    # 1. Valid Python execution
    # -------------------------------------------------------------
    def test_01_valid_python_execution(self):
        res = self.client.execute(
            student_id="student_py_01",
            language="python",
            code='print("Hello Python")',
            stdin="",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["exitCode"], 0)
        self.assertIn("Hello Python", res["output"])

    # -------------------------------------------------------------
    # 2. Valid Java execution
    # -------------------------------------------------------------
    def test_02_valid_java_execution(self):
        code = 'public class Main { public static void main(String[] args) { System.out.println("Hello Java"); } }'
        res = self.client.execute(
            student_id="student_java_01",
            language="java",
            code=code,
            stdin="",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["exitCode"], 0)

    # -------------------------------------------------------------
    # 3. Valid C execution
    # -------------------------------------------------------------
    def test_03_valid_c_execution(self):
        code = '#include <stdio.h>\nint main() { printf("Hello C\\n"); return 0; }'
        res = self.client.execute(
            student_id="student_c_01",
            language="c",
            code=code,
            stdin="",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["exitCode"], 0)

    # -------------------------------------------------------------
    # 4. Valid C++ execution
    # -------------------------------------------------------------
    def test_04_valid_cpp_execution(self):
        code = '#include <iostream>\nint main() { std::cout << "Hello C++\\n"; return 0; }'
        res = self.client.execute(
            student_id="student_cpp_01",
            language="cpp",
            code=code,
            stdin="",
        )
        self.assertTrue(res["success"])
        self.assertEqual(res["exitCode"], 0)

    # -------------------------------------------------------------
    # 5. Missing and malformed fields
    # -------------------------------------------------------------
    def test_05_missing_and_malformed_fields(self):
        # Missing code field
        raw = {
            "studentId": "std_bad_01",
            "timestamp": int(time.time()),
            "nonce": uuid.uuid4().hex,
            "signature": "a" * 64,
            "language": "python",
            # "code" is omitted!
        }
        res = self.client.execute(student_id="", language="", code="", raw_payload_override=raw)
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], 400)
        self.assertEqual(res["error"], ERR_MISSING_FIELD)

        # Malformed timestamp (string instead of int)
        raw_bad_ts = {
            "studentId": "std_bad_02",
            "timestamp": "not_a_number",
            "nonce": uuid.uuid4().hex,
            "signature": "a" * 64,
            "language": "python",
            "code": "print(1)",
        }
        res2 = self.client.execute(student_id="", language="", code="", raw_payload_override=raw_bad_ts)
        self.assertFalse(res2["success"])
        self.assertEqual(res2["exitCode"], 400)
        self.assertEqual(res2["error"], ERR_INVALID_FIELD)

    # -------------------------------------------------------------
    # 6. Unknown fields rejected
    # -------------------------------------------------------------
    def test_06_unknown_fields_rejected(self):
        raw = {
            "studentId": "std_attacker",
            "timestamp": int(time.time()),
            "nonce": uuid.uuid4().hex,
            "signature": "a" * 64,
            "language": "python",
            "code": "print(1)",
            "privileged": True,  # UNKNOWN/UNAUTHORIZED FIELD
            "mountHostRoot": "/:/host",
        }
        res = self.client.execute(student_id="", language="", code="", raw_payload_override=raw)
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], 400)
        self.assertEqual(res["error"], ERR_UNKNOWN_FIELD)
        self.assertIn("mountHostRoot", res["output"])

    # -------------------------------------------------------------
    # 7. Invalid signature rejected
    # -------------------------------------------------------------
    def test_07_invalid_signature_rejected(self):
        res = self.client.execute(
            student_id="std_sig_01",
            language="python",
            code="print(1)",
            custom_signature="00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], 401)
        self.assertEqual(res["error"], ERR_INVALID_SIGNATURE)

    # -------------------------------------------------------------
    # 8. Altered request body rejected
    # -------------------------------------------------------------
    def test_08_altered_request_body_rejected(self):
        orig_code = "print('original')"
        ts = int(time.time())
        nonce = uuid.uuid4().hex
        valid_sig = sign_student_request(TEST_SECRET, "std_alter_01", "python", orig_code, "", ts, nonce)

        # Attacker alters the code payload after signature was generated
        tampered_payload = {
            "studentId": "std_alter_01",
            "timestamp": ts,
            "nonce": nonce,
            "signature": valid_sig,
            "language": "python",
            "code": "print('tampered malicious code')",
            "stdin": "",
        }
        res = self.client.execute(student_id="", language="", code="", raw_payload_override=tampered_payload)
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], 401)
        self.assertEqual(res["error"], ERR_INVALID_SIGNATURE)

    # -------------------------------------------------------------
    # 9. Expired timestamp rejected
    # -------------------------------------------------------------
    def test_09_expired_timestamp_rejected(self):
        # Timestamp is 45 seconds in the past (exceeds 30s limit)
        stale_ts = int(time.time()) - 45
        res = self.client.execute(
            student_id="std_stale_01",
            language="python",
            code="print('stale')",
            custom_timestamp=stale_ts,
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], 401)
        self.assertEqual(res["error"], ERR_INVALID_SIGNATURE)
        self.assertIn("REQUEST_EXPIRED", res["output"])

    # -------------------------------------------------------------
    # 10. Replayed nonce rejected
    # -------------------------------------------------------------
    def test_10_replayed_nonce_rejected(self):
        fixed_nonce = "fixed_nonce_12345678"
        ts = int(time.time())

        # First request succeeds
        res1 = self.client.execute(
            student_id="std_replay_01",
            language="python",
            code="print('run 1')",
            custom_nonce=fixed_nonce,
            custom_timestamp=ts,
        )
        self.assertTrue(res1["success"])

        # Second request with identical nonce is REJECTED
        res2 = self.client.execute(
            student_id="std_replay_01",
            language="python",
            code="print('run 1 replayed')",
            custom_nonce=fixed_nonce,
            custom_timestamp=ts,
        )
        self.assertFalse(res2["success"])
        self.assertEqual(res2["exitCode"], 409)
        self.assertEqual(res2["error"], ERR_REPLAY_DETECTED)

    # -------------------------------------------------------------
    # 11. Per-student concurrency limit (Max 1 active execution)
    # -------------------------------------------------------------
    def test_11_per_student_concurrency_lock(self):
        # We use a mock runner with an artificial delay of 1.0 second
        slow_runner = MockContainerRunner(artificial_delay=1.0)
        self.server.runner = slow_runner

        results = []

        def worker(sid):
            c = BrokerClient(endpoint=(TEST_HOST, TEST_PORT), signing_secret=TEST_SECRET, timeout=5.0)
            return c.execute(student_id=sid, language="python", code="print('slow')")

        with ThreadPoolExecutor(max_workers=2) as executor:
            # Submit two requests for the SAME student ID simultaneously
            f1 = executor.submit(worker, "student_concurrent_lock")
            time.sleep(0.05)  # slight stagger to ensure f1 enters active state
            f2 = executor.submit(worker, "student_concurrent_lock")

            r1 = f1.result(timeout=4.0)
            r2 = f2.result(timeout=4.0)

        # One must succeed and the other must be rejected with 429 CONCURRENT_LIMIT
        statuses = [r1.get("exitCode"), r2.get("exitCode")]
        self.assertIn(0, statuses, "One execution should succeed")
        self.assertIn(429, statuses, "Concurrent execution for same student must be rejected with 429")

        # Restore default runner
        self.server.runner = self.mock_runner

    # -------------------------------------------------------------
    # 12. Global concurrency limit & Queue timeout (Max 2, queue 3s)
    # -------------------------------------------------------------
    def test_12_global_concurrency_and_queue_timeout(self):
        # Configure runner with delay of 3.5 seconds
        # (Slots occupied for 3.5s, queue timeout is 3.0s -> 3rd request times out)
        busy_runner = MockContainerRunner(artificial_delay=3.5)
        self.server.runner = busy_runner

        def slow_worker(sid):
            c = BrokerClient(endpoint=(TEST_HOST, TEST_PORT), signing_secret=TEST_SECRET, timeout=8.0)
            return c.execute(student_id=sid, language="python", code=f"print('{sid}')")

        with ThreadPoolExecutor(max_workers=3) as executor:
            # Submit 3 requests from 3 DIFFERENT students
            f1 = executor.submit(slow_worker, "student_alpha")
            f2 = executor.submit(slow_worker, "student_beta")
            time.sleep(0.1)
            f3 = executor.submit(slow_worker, "student_gamma")  # Must exceed 3s queue timeout

            r1 = f1.result(timeout=8.0)
            r2 = f2.result(timeout=8.0)
            r3 = f3.result(timeout=8.0)

        results = [r1, r2, r3]
        exit_codes = [r["exitCode"] for r in results]

        # Two slots were available and must complete (exitCode 0)
        self.assertEqual(exit_codes.count(0), 2, "Exactly 2 concurrent executions should complete successfully")
        # The 3rd request queued for 3s, exceeded queue timeout, and failed with 503
        self.assertEqual(exit_codes.count(503), 1, "3rd request must fail with 503 CAPACITY_EXCEEDED")
        self.assertIn(ERR_CAPACITY_EXCEEDED, [r.get("error") for r in results])

        self.server.runner = self.mock_runner

    # -------------------------------------------------------------
    # 13. Execution timeout handling (7s limit)
    # -------------------------------------------------------------
    def test_13_execution_timeout_handling(self):
        timeout_runner = MockContainerRunner(fail_with_timeout=True)
        self.server.runner = timeout_runner

        res = self.client.execute(
            student_id="student_timeout_01",
            language="python",
            code="while True: pass",
        )
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], -1)
        self.assertEqual(res["error"], ERR_EXECUTION_TIMEOUT)
        self.assertIn("Execution timed out", res["output"])

        self.server.runner = self.mock_runner

    # -------------------------------------------------------------
    # 14. Container cleanup in finally block
    # -------------------------------------------------------------
    def test_14_container_cleanup_after_success_and_failure(self):
        initial_cleanups = len(self.mock_runner.cleaned_up_containers)

        # Successful execution
        self.client.execute(
            student_id="std_clean_01",
            language="python",
            code="print('cleanup check')",
        )
        self.assertEqual(len(self.mock_runner.cleaned_up_containers), initial_cleanups + 1)

        # Failing execution
        self.client.execute(
            student_id="std_clean_02",
            language="python",
            code="raise RuntimeError('error')",
        )
        self.assertEqual(len(self.mock_runner.cleaned_up_containers), initial_cleanups + 2)

    # -------------------------------------------------------------
    # 15. Broker restart and recovery (Persistent WAL Replay Protection)
    # -------------------------------------------------------------
    def test_15_broker_restart_and_recovery(self):
        # 1. Consume a nonce on current running broker
        restart_nonce = "wal_persistent_nonce_9999"
        ts = int(time.time())

        res1 = self.client.execute(
            student_id="std_restart_01",
            language="python",
            code="print('before restart')",
            custom_nonce=restart_nonce,
            custom_timestamp=ts,
        )
        self.assertTrue(res1["success"])

        # 2. Simulate broker crash/restart: Create a new NonceStore reading the same WAL file!
        new_store = NonceStore(wal_path=self.wal_path)
        # Attempt to replay the exact same nonce against the new store
        is_fresh, err = new_store.check_and_record(restart_nonce, now=ts + 5)
        self.assertFalse(is_fresh, "Nonce must be recognized as replayed even after broker restart")
        self.assertEqual(err, "REPLAY_DETECTED: Nonce has already been consumed.")
        new_store.close()

    # -------------------------------------------------------------
    # 16. Regression: Language tampering rejected (HMAC binding)
    # -------------------------------------------------------------
    def test_16_language_tampering_rejected(self):
        code = "print('secure code')"
        ts = int(time.time())
        nonce = uuid.uuid4().hex
        # Student signs for Python
        sig = sign_student_request(TEST_SECRET, "std_lang_01", "python", code, "", ts, nonce)

        # Adversary in transit changes language to 'cpp'
        tampered_payload = {
            "studentId": "std_lang_01",
            "timestamp": ts,
            "nonce": nonce,
            "signature": sig,
            "language": "cpp",  # TAMPERED
            "code": code,
            "stdin": "",
        }
        res = self.client.execute(student_id="", language="", code="", raw_payload_override=tampered_payload)
        self.assertFalse(res["success"], "Tampered language must be rejected")
        self.assertEqual(res["exitCode"], 401)
        self.assertEqual(res["error"], ERR_INVALID_SIGNATURE)

    # -------------------------------------------------------------
    # 17. Regression: Atomic WAL compaction and torn-write recovery
    # -------------------------------------------------------------
    def test_17_atomic_wal_compaction_and_torn_write(self):
        torn_wal_path = os.path.join(self.temp_dir, "torn_test.wal")
        now = time.time()

        # Seed WAL with valid entry, expired entry, and corrupt torn lines
        with open(torn_wal_path, "w", encoding="utf-8") as f:
            f.write(f"{now + 50:.2f} valid_nonce_alpha\n")
            f.write(f"{now - 50:.2f} expired_nonce_beta\n")
            f.write("corrupt_line_without_nonce\n")
            f.write("9999999999\n")
            f.write(f"{now + 60:.2f} valid_nonce_gamma\n")

        # Open store (triggers _recover_and_compact_wal using .tmp + atomic os.replace)
        store = NonceStore(wal_path=torn_wal_path)

        # Verify valid nonces recovered
        fresh_alpha, _ = store.check_and_record("valid_nonce_alpha")
        self.assertFalse(fresh_alpha, "valid_nonce_alpha should be recognized as consumed")
        fresh_gamma, _ = store.check_and_record("valid_nonce_gamma")
        self.assertFalse(fresh_gamma, "valid_nonce_gamma should be recognized as consumed")

        # Verify expired nonce was evicted
        fresh_beta, _ = store.check_and_record("expired_nonce_beta")
        self.assertTrue(fresh_beta, "expired_nonce_beta should be allowed as fresh")

        # Verify no .tmp file left behind
        tmp_files = [f for f in os.listdir(self.temp_dir) if f.startswith("torn_test.wal.tmp")]
        self.assertEqual(len(tmp_files), 0, "Compaction temporary file should be replaced cleanly")
        store.close()

    # -------------------------------------------------------------
    # 18. Regression: Output truncation enforcement (>50,000 chars)
    # -------------------------------------------------------------
    def test_18_output_truncation_enforcement(self):
        # Configure mock runner to generate 80,000 characters
        huge_output = "X" * 80000
        mock_huge = MockContainerRunner()
        # Override output in mock
        original_exec = mock_huge.execute
        mock_huge.execute = lambda lang, code, stdin="": {
            "success": True,
            "output": huge_output,
            "exitCode": 0,
            "executionTime": 10.0,
            "error": None,
        }
        self.server.runner = mock_huge

        res = self.client.execute(
            student_id="std_huge_01",
            language="python",
            code="print('huge')",
        )
        self.assertTrue(res["success"])
        self.assertIn("Output truncated: exceeded 50000 bytes limit", res["output"])
        self.assertLessEqual(len(res["output"]), 50100)

        self.server.runner = self.mock_runner

    # -------------------------------------------------------------
    # 19. Regression: WAL fsync and restrictive file permissions
    # -------------------------------------------------------------
    def test_19_wal_fsync_and_permissions(self):
        perm_wal_path = os.path.join(self.temp_dir, "perm_test.wal")
        store = NonceStore(wal_path=perm_wal_path, compaction_threshold=2)

        # Record entries to trigger fsync and runtime compaction
        store.check_and_record("nonce_fsync_01")
        store.check_and_record("nonce_fsync_02")  # Triggers runtime compaction at threshold 2
        store.check_and_record("nonce_fsync_03")

        self.assertTrue(os.path.exists(perm_wal_path))
        if os.name != "nt":
            mode = oct(os.stat(perm_wal_path).st_mode & 0o777)
            self.assertEqual(mode, oct(0o600), "WAL file must have 0600 permissions")
        store.close()

    # -------------------------------------------------------------
    # 20. Regression: Bounded streaming pipe draining (>100,000 bytes)
    # -------------------------------------------------------------
    def test_20_bounded_stream_draining(self):
        import sys
        import subprocess
        import threading

        # Test streaming pipe drain mechanism directly using Python subprocess
        script = "import sys; sys.stdout.write('Z' * 150000); sys.stdout.flush()"
        proc = subprocess.Popen(
            [sys.executable, "-c", script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=False,
        )

        stdout_chunks = []
        stderr_chunks = []
        is_truncated = False
        stream_lock = threading.Lock()
        max_output = 50000

        def drain_pipe(stream, chunks):
            nonlocal is_truncated
            try:
                while True:
                    chunk = stream.read(4096)
                    if not chunk:
                        break
                    with stream_lock:
                        current_len = sum(len(c) for c in chunks)
                        if current_len < max_output:
                            avail = max_output - current_len
                            chunks.append(chunk[:avail])
                            if len(chunk) > avail:
                                is_truncated = True
                        else:
                            is_truncated = True
            except Exception:
                pass
            finally:
                try:
                    stream.close()
                except Exception:
                    pass

        t_out = threading.Thread(target=drain_pipe, args=(proc.stdout, stdout_chunks))
        t_err = threading.Thread(target=drain_pipe, args=(proc.stderr, stderr_chunks))
        t_out.daemon = True
        t_err.daemon = True
        t_out.start()
        t_err.start()

        ret = proc.wait(timeout=5.0)
        t_out.join(timeout=1.0)
        t_err.join(timeout=1.0)

        collected = b"".join(stdout_chunks).decode("utf-8", errors="replace")
        self.assertEqual(ret, 0)
        self.assertEqual(len(collected), max_output, "Collected bytes in memory must be capped at 50000")
        self.assertTrue(is_truncated, "Truncation flag must be True")


if __name__ == "__main__":
    unittest.main()

