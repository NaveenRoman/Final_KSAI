"""
Codexa Execution Broker — Client Library.
Handles signature calculation, stream framing, and timeout handling for callers
such as Django views and integration test runners.
"""

import socket
import json
import time
import uuid
from typing import Dict, Any, Optional, Tuple, Union

from .signer import sign_student_request
from .protocol import format_response, ERR_MALFORMED_JSON, ERR_INTERNAL_ERROR, MAX_FRAME_BYTES


class BrokerClient:
    def __init__(
        self,
        endpoint: Union[str, Tuple[str, int]],
        signing_secret: str,
        timeout: float = 15.0,
    ):
        """
        endpoint can be a string path to a UNIX socket (e.g. '/run/codexa/broker.sock')
        or a tuple of (host, port) (e.g. ('127.0.0.1', 49152)).
        """
        self.endpoint = endpoint
        self.signing_secret = signing_secret
        self.timeout = timeout

    def execute(
        self,
        student_id: str,
        language: str,
        code: str,
        stdin: str = "",
        custom_nonce: Optional[str] = None,
        custom_timestamp: Optional[int] = None,
        custom_signature: Optional[str] = None,
        raw_payload_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Submits code execution request to the broker daemon.
        Generates cryptographic HMAC signature automatically unless overridden for testing.
        """
        start_time = time.perf_counter()

        # Build payload
        if raw_payload_override is not None:
            payload = raw_payload_override
        else:
            ts = int(time.time()) if custom_timestamp is None else int(custom_timestamp)
            nonce = uuid.uuid4().hex if custom_nonce is None else custom_nonce
            sig = (
                custom_signature
                if custom_signature is not None
                else sign_student_request(
                    signing_secret=self.signing_secret,
                    student_id=student_id,
                    language=language,
                    code=code,
                    stdin=stdin,
                    timestamp=ts,
                    nonce=nonce,
                )
            )

            payload = {
                "studentId": student_id,
                "timestamp": ts,
                "nonce": nonce,
                "signature": sig,
                "language": language,
                "code": code,
                "stdin": stdin,
            }

        # Connect and transmit
        sock = None
        try:
            if isinstance(self.endpoint, str):
                if not hasattr(socket, "AF_UNIX"):
                    raise RuntimeError("UNIX domain sockets (AF_UNIX) are not supported on this operating system.")
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                sock.connect(self.endpoint)
            else:
                host, port = self.endpoint
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(self.timeout)
                sock.connect((host, port))

            # Send newline-delimited frame
            wire_bytes = (json.dumps(payload) + "\n").encode("utf-8")
            sock.sendall(wire_bytes)

            # Receive framed response
            buffer = ""
            while "\n" not in buffer:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                buffer += chunk.decode("utf-8", errors="replace")
                if len(buffer) > MAX_FRAME_BYTES:
                    break

            if not buffer.strip():
                return format_response(
                    success=False,
                    output="Broker connection closed without returning a response.",
                    exit_code=500,
                    error=ERR_INTERNAL_ERROR,
                )

            line = buffer.strip().split("\n")[0]
            return json.loads(line)

        except socket.timeout:
            elapsed = round((time.perf_counter() - start_time) * 1000, 2)
            return format_response(
                success=False,
                output=f"Broker socket communication timed out after {self.timeout}s.",
                exit_code=504,
                execution_time=elapsed,
                error="SOCKET_TIMEOUT",
            )
        except Exception as e:
            elapsed = round((time.perf_counter() - start_time) * 1000, 2)
            return format_response(
                success=False,
                output=f"Broker communication error: {str(e)}",
                exit_code=500,
                execution_time=elapsed,
                error=ERR_INTERNAL_ERROR,
            )
        finally:
            if sock:
                try:
                    sock.close()
                except Exception:
                    pass
