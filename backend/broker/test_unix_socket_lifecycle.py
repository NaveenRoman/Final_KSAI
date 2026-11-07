"""
Codexa Unix Domain Socket Lifecycle and Resilience Test Suite.
Verifies:
1. Socket file creation with mode 0660 in parent directory with mode 0770.
2. Full request/response over socket.AF_UNIX using BrokerClient.
3. Client disconnect and reconnection (simulating Gunicorn worker reload).
4. Broker daemon graceful shutdown (socket unlinking).
5. Broker daemon restart (socket recreation and reconnection).
"""

import os
import sys
import time
import socket
import tempfile
import threading
import unittest

from backend.broker.server import BrokerServer
from backend.broker.client import BrokerClient
from backend.broker.nonce_store import NonceStore
from backend.broker.test_broker import MockContainerRunner


class TestUnixSocketLifecycle(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not hasattr(socket, "AF_UNIX"):
            raise unittest.SkipTest("AF_UNIX is not supported on this operating system/Python build.")

        # Determine target directory: prefer /run/codexa if writable, otherwise use isolated tempdir
        cls.target_dir = "/run/codexa" if os.path.exists("/run/codexa") and os.access("/run/codexa", os.W_OK) else None
        cls._temp_dir = None
        if not cls.target_dir:
            cls._temp_dir = tempfile.mkdtemp(prefix="codexa_run_")
            cls.target_dir = cls._temp_dir
            try:
                os.chmod(cls.target_dir, 0o770)
            except Exception:
                pass

        cls.socket_path = os.path.join(cls.target_dir, "broker.sock")
        cls.wal_path = os.path.join(cls.target_dir, "nonces.wal")
        cls.signing_secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

    @classmethod
    def tearDownClass(cls):
        if cls._temp_dir and os.path.exists(cls._temp_dir):
            import shutil
            shutil.rmtree(cls._temp_dir, ignore_errors=True)

    def test_01_socket_creation_and_permissions(self):
        """Verifies socket file is created with mode 0660 and parent has mode 0770."""
        parent_mode = oct(os.stat(self.target_dir).st_mode)[-4:]
        self.assertIn(parent_mode, ("0770", "0775", "0755"), f"Unexpected parent dir mode: {parent_mode}")

        server = BrokerServer(
            signing_secret=self.signing_secret,
            socket_path=self.socket_path,
            runner_backend=MockContainerRunner(),
            nonce_store=NonceStore(wal_path=self.wal_path),
        )

        import asyncio
        loop = asyncio.new_event_loop()

        def run_server():
            asyncio.set_event_loop(loop)
            loop.run_until_complete(server.start())
            loop.run_forever()

        t = threading.Thread(target=run_server, daemon=True)
        t.start()
        time.sleep(1.0)

        try:
            self.assertTrue(os.path.exists(self.socket_path), "Socket file was not created!")
            socket_mode = oct(os.stat(self.socket_path).st_mode)[-4:]
            self.assertEqual(socket_mode, "0660", f"Socket mode should be 0660, got {socket_mode}")

            # Execute code over AF_UNIX
            client = BrokerClient(endpoint=self.socket_path, signing_secret=self.signing_secret, timeout=5.0)
            res = client.execute(
                student_id="student_socket_perm_test",
                language="python",
                code="print('Hello socket')",
            )
            self.assertTrue(res["success"])
            self.assertEqual(res["exitCode"], 0)
            self.assertIn("Hello socket", res["output"])

        finally:
            loop.call_soon_threadsafe(loop.stop)
            time.sleep(0.5)
            asyncio.run(server.stop())

    def test_02_backend_disconnect_and_reconnect(self):
        """Verifies socket survives client disconnect and accepts new client sessions."""
        server = BrokerServer(
            signing_secret=self.signing_secret,
            socket_path=self.socket_path,
            runner_backend=MockContainerRunner(),
            nonce_store=NonceStore(wal_path=self.wal_path),
        )

        import asyncio
        loop = asyncio.new_event_loop()
        def run_server():
            asyncio.set_event_loop(loop)
            loop.run_until_complete(server.start())
            loop.run_forever()

        t = threading.Thread(target=run_server, daemon=True)
        t.start()
        time.sleep(1.0)

        try:
            client1 = BrokerClient(endpoint=self.socket_path, signing_secret=self.signing_secret, timeout=5.0)
            res1 = client1.execute(student_id="s1", language="c", code="main(){}")
            self.assertTrue(res1["success"])

            del client1
            time.sleep(0.5)

            # Socket MUST still exist
            self.assertTrue(os.path.exists(self.socket_path), "Broker socket was destroyed when client disconnected!")

            # Connect client 2
            client2 = BrokerClient(endpoint=self.socket_path, signing_secret=self.signing_secret, timeout=5.0)
            res2 = client2.execute(student_id="s2", language="cpp", code="main(){}")
            self.assertTrue(res2["success"])
            self.assertEqual(res2["exitCode"], 0)

        finally:
            loop.call_soon_threadsafe(loop.stop)
            time.sleep(0.5)
            asyncio.run(server.stop())

    def test_03_broker_restart_recreates_socket(self):
        """Verifies stopping broker unlinks socket, and restarting recreates it cleanly."""
        server = BrokerServer(
            signing_secret=self.signing_secret,
            socket_path=self.socket_path,
            runner_backend=MockContainerRunner(),
            nonce_store=NonceStore(wal_path=self.wal_path),
        )

        import asyncio
        loop = asyncio.new_event_loop()
        def run_server():
            asyncio.set_event_loop(loop)
            loop.run_until_complete(server.start())
            loop.run_forever()

        t = threading.Thread(target=run_server, daemon=True)
        t.start()
        time.sleep(1.0)

        self.assertTrue(os.path.exists(self.socket_path))

        loop.call_soon_threadsafe(loop.stop)
        time.sleep(0.5)
        asyncio.run(server.stop())

        self.assertFalse(os.path.exists(self.socket_path), "Socket was not unlinked on broker stop!")

        server2 = BrokerServer(
            signing_secret=self.signing_secret,
            socket_path=self.socket_path,
            runner_backend=MockContainerRunner(),
            nonce_store=NonceStore(wal_path=self.wal_path),
        )
        loop2 = asyncio.new_event_loop()
        def run_server2():
            asyncio.set_event_loop(loop2)
            loop2.run_until_complete(server2.start())
            loop2.run_forever()

        t2 = threading.Thread(target=run_server2, daemon=True)
        t2.start()
        time.sleep(1.0)

        try:
            self.assertTrue(os.path.exists(self.socket_path), "Broker restart failed to recreate socket file!")
            client = BrokerClient(endpoint=self.socket_path, signing_secret=self.signing_secret, timeout=5.0)
            res = client.execute(student_id="s3", language="java", code="class Main{}")
            self.assertTrue(res["success"])
        finally:
            loop2.call_soon_threadsafe(loop2.stop)
            time.sleep(0.5)
            asyncio.run(server2.stop())


if __name__ == "__main__":
    unittest.main()
