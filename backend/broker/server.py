"""
Codexa Execution Broker — Core Server Daemon.
Enforces:
- Global maximum concurrent executions (Semaphore: 2)
- In-memory queue with timeout (3.0s)
- Per-student single execution lock
- Independent HMAC-SHA256 signature verification
- Persistent WAL-backed nonce replay protection
- Newline-delimited JSON stream framing (Max 1 MB)
- Non-blocking execution pool with guaranteed finally cleanup
"""

import os
import sys
import json
import time
import socket
import signal
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Set, Dict, Any

from .protocol import (
    validate_request_payload,
    format_response,
    ProtocolError,
    MAX_FRAME_BYTES,
    ERR_MALFORMED_JSON,
    ERR_INVALID_SIGNATURE,
    ERR_REPLAY_DETECTED,
    ERR_CONCURRENT_LIMIT,
    ERR_CAPACITY_EXCEEDED,
    ERR_INTERNAL_ERROR,
    ERR_PAYLOAD_TOO_LARGE,
)
from .signer import verify_student_request
from .nonce_store import NonceStore
from .runner_backend import BaseRunnerBackend, DockerContainerRunner

logger = logging.getLogger("codexa.broker.server")


class BrokerServer:
    def __init__(
        self,
        signing_secret: str,
        socket_path: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[int] = None,
        max_concurrency: int = 2,
        queue_timeout: float = 3.0,
        runner_backend: Optional[BaseRunnerBackend] = None,
        nonce_store: Optional[NonceStore] = None,
    ):
        self.signing_secret = signing_secret
        self.socket_path = socket_path
        self.host = host
        self.port = port
        self.max_concurrency = max_concurrency
        self.queue_timeout = queue_timeout

        self.runner = runner_backend or DockerContainerRunner()
        self.nonce_store = nonce_store or NonceStore()

        self.semaphore = asyncio.Semaphore(self.max_concurrency)
        self.active_students: Set[str] = set()
        self.thread_pool = ThreadPoolExecutor(max_workers=max_concurrency + 4)

        self._server = None
        self._is_running = False

    async def start(self) -> None:
        """Starts the server on UNIX socket or TCP loopback."""
        loop = asyncio.get_running_loop()

        if self.socket_path and hasattr(socket, "AF_UNIX"):
            # Ensure parent directory exists and remove existing stale socket file
            socket_dir = os.path.dirname(os.path.abspath(self.socket_path))
            os.makedirs(socket_dir, exist_ok=True)
            if os.path.exists(self.socket_path):
                os.remove(self.socket_path)

            self._server = await asyncio.start_unix_server(
                self._handle_client,
                path=self.socket_path,
            )
            # Set socket permissions (0660)
            try:
                os.chmod(self.socket_path, 0o660)
            except Exception:
                pass
            logger.info("Broker server listening on UNIX socket: %s", self.socket_path)

        elif self.host and self.port:
            self._server = await asyncio.start_server(
                self._handle_client,
                host=self.host,
                port=self.port,
            )
            logger.info("Broker server listening on TCP: %s:%d", self.host, self.port)
        else:
            raise ValueError("Must provide either socket_path (on systems supporting AF_UNIX) or host/port.")

        self._is_running = True

    async def stop(self) -> None:
        """Gracefully stops server and cleans up resources."""
        self._is_running = False
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None

        if self.socket_path and os.path.exists(self.socket_path):
            try:
                os.remove(self.socket_path)
            except Exception:
                pass

        if self.thread_pool:
            self.thread_pool.shutdown(wait=False)

        if self.nonce_store:
            self.nonce_store.close()

    async def _handle_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        """Handles a single client stream connection with newline-delimited framing."""
        try:
            while self._is_running:
                # Read line with maximum frame buffer protection
                try:
                    raw_line = await reader.readline()
                except Exception:
                    break

                if not raw_line:
                    break  # Client disconnected

                if len(raw_line) > MAX_FRAME_BYTES:
                    err_resp = format_response(
                        success=False,
                        output=f"Payload exceeds maximum allowed frame size ({MAX_FRAME_BYTES} bytes).",
                        exit_code=413,
                        error=ERR_PAYLOAD_TOO_LARGE,
                    )
                    await self._send_response(writer, err_resp)
                    break

                # Process single execution request
                response_dict = await self.process_request(raw_line.decode("utf-8", errors="replace"))
                await self._send_response(writer, response_dict)

        except Exception as e:
            logger.error("Client handler exception: %s", e)
        finally:
            try:
                writer.close()
                await writer.wait_closed()
            except Exception:
                pass

    async def _send_response(self, writer: asyncio.StreamWriter, resp: Dict[str, Any]) -> None:
        out_bytes = (json.dumps(resp) + "\n").encode("utf-8")
        writer.write(out_bytes)
        await writer.drain()

    async def process_request(self, raw_str: str) -> Dict[str, Any]:
        """
        Executes full validation, cryptographic verification, concurrency scheduling,
        and container execution pipeline.
        """
        # 1. Parse JSON
        try:
            raw_payload = json.loads(raw_str.strip())
        except Exception:
            return format_response(
                success=False,
                output="Malformed JSON request frame.",
                exit_code=400,
                error=ERR_MALFORMED_JSON,
            )

        # 2. Strict Schema Validation (rejection of unknown/invalid fields)
        try:
            validated = validate_request_payload(raw_payload)
        except ProtocolError as pe:
            return format_response(
                success=False,
                output=pe.message,
                exit_code=pe.http_status,
                error=pe.code,
            )

        # 3. Independent Cryptographic Signature Verification
        is_valid_sig, sig_err = verify_student_request(
            signing_secret=self.signing_secret,
            payload=validated,
            max_drift_seconds=30,
        )
        if not is_valid_sig:
            return format_response(
                success=False,
                output=f"Authentication failed: {sig_err}",
                exit_code=401,
                error=ERR_INVALID_SIGNATURE,
            )

        # 4. Atomic Nonce Replay Check (Persistent WAL + Memory)
        nonce = validated["nonce"]
        is_fresh_nonce, nonce_err = self.nonce_store.check_and_record(nonce)
        if not is_fresh_nonce:
            return format_response(
                success=False,
                output=f"Replay detected: {nonce_err}",
                exit_code=409,
                error=ERR_REPLAY_DETECTED,
            )

        student_id = validated["studentId"]

        # 5. Enforce Per-Student Concurrency Lock (Max 1 active execution)
        if student_id in self.active_students:
            return format_response(
                success=False,
                output=f"Student {student_id} already has a program executing. Simultaneous executions are prohibited.",
                exit_code=429,
                error=ERR_CONCURRENT_LIMIT,
            )

        # Register active student
        self.active_students.add(student_id)

        # 6. Enforce Global Maximum Concurrency Semaphore with Queue Timeout (3.0s)
        try:
            await asyncio.wait_for(self.semaphore.acquire(), timeout=self.queue_timeout)
        except asyncio.TimeoutError:
            self.active_students.discard(student_id)
            return format_response(
                success=False,
                output=f"Execution capacity saturated (all {self.max_concurrency} execution slots busy). Queue timeout of {self.queue_timeout}s expired.",
                exit_code=503,
                error=ERR_CAPACITY_EXCEEDED,
            )

        # 7. Execute in isolated container backend via non-blocking ThreadPoolExecutor
        loop = asyncio.get_running_loop()
        try:
            raw_result = await loop.run_in_executor(
                self.thread_pool,
                self.runner.execute,
                validated["language"],
                validated["code"],
                validated["stdin"],
            )
            return format_response(
                success=raw_result.get("success", False),
                output=raw_result.get("output", ""),
                exit_code=raw_result.get("exitCode", 1),
                execution_time=raw_result.get("executionTime", 0.0),
                error=raw_result.get("error"),
            )
        except Exception as exec_err:
            logger.error("Execution exception in runner: %s", exec_err)
            return format_response(
                success=False,
                output="Internal execution error occurred.",
                exit_code=500,
                error=ERR_INTERNAL_ERROR,
            )
        finally:
            # Guaranteed release of student lock and global concurrency slot
            self.active_students.discard(student_id)
            self.semaphore.release()


def main():
    """
    Production entrypoint for Codexa Standalone Execution Broker daemon.
    Reads environment configuration, initializes persistent WAL NonceStore,
    handles SIGTERM and SIGINT for graceful shutdown, and executes asyncio server loop.
    """
    signing_secret = os.getenv("STUDENT_SIGNING_SECRET")
    if not signing_secret:
        logger.error("FATAL: STUDENT_SIGNING_SECRET environment variable is mandatory.")
        sys.exit(1)

    socket_path = os.getenv("BROKER_SOCKET_PATH")
    host = os.getenv("BROKER_HOST")
    port_str = os.getenv("BROKER_PORT")
    port = int(port_str) if port_str else None

    # Fallback to UNIX socket if neither is explicitly configured
    if not socket_path and not (host and port):
        if hasattr(socket, "AF_UNIX") and os.name != "nt":
            socket_path = "/run/codexa/broker.sock"
        else:
            host = "127.0.0.1"
            port = 49152

    wal_path = os.getenv("WAL_PATH", "/var/lib/codexa/nonces.wal")
    max_concurrency = int(os.getenv("MAX_CONCURRENCY", "2"))
    queue_timeout = float(os.getenv("QUEUE_TIMEOUT", "3.0"))

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    nonce_store = NonceStore(wal_path=wal_path)
    server = BrokerServer(
        signing_secret=signing_secret,
        socket_path=socket_path,
        host=host,
        port=port,
        max_concurrency=max_concurrency,
        queue_timeout=queue_timeout,
        nonce_store=nonce_store,
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    stop_event = asyncio.Event()

    def handle_signal():
        logger.info("Received termination signal, initiating graceful broker shutdown...")
        stop_event.set()

    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, handle_signal)
        except (NotImplementedError, AttributeError):
            signal.signal(sig, lambda _s, _f: stop_event.set())

    async def run():
        await server.start()
        logger.info("Broker server successfully started. Ready to accept execution requests.")
        await stop_event.wait()
        logger.info("Stopping broker server and releasing resources...")
        await server.stop()
        logger.info("Broker server cleanly terminated.")

    try:
        loop.run_until_complete(run())
    except KeyboardInterrupt:
        logger.info("KeyboardInterrupt received, exiting.")
    finally:
        loop.close()


if __name__ == "__main__":
    main()
