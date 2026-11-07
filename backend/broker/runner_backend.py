"""
Codexa Execution Broker — Container Runner Backend.
Constructs fixed Docker invocations with shell=False, immutable security flags,
ephemeral isolated workspaces, and guaranteed cleanup in finally blocks.
"""

import os
import re
import time
import uuid
import shutil
import tempfile
import subprocess
import logging
import threading
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("codexa.broker.runner")

CONTAINER_TIMEOUT_SECONDS = 7.0
SUBPROCESS_TIMEOUT_SECONDS = 8.5
CLEANUP_TIMEOUT_SECONDS = 5.0

DOCKER_IMAGE = os.getenv("DOCKER_SANDBOX_IMAGE", "ksai-runner:latest")
DOCKER_RUNTIME = os.getenv("DOCKER_RUNTIME", "runsc")
MAX_OUTPUT_LENGTH = 50000


class BaseRunnerBackend:
    def execute(self, language: str, code: str, stdin: str = "") -> Dict[str, Any]:
        raise NotImplementedError


class DockerContainerRunner(BaseRunnerBackend):
    def __init__(self, workspaces_dir: Optional[str] = None):
        self.workspaces_dir = workspaces_dir
        if self.workspaces_dir:
            os.makedirs(self.workspaces_dir, exist_ok=True)

    @staticmethod
    def verify_runtime_environment() -> Tuple[bool, str]:
        """
        Preflight verification check: asserts that Docker is installed and the
        configured runtime (runsc) is registered.
        Returns (True, message) or (False, error_detail).
        """
        try:
            res = subprocess.run(
                ["docker", "info", "--format", "{{json .Runtimes}}"],
                capture_output=True,
                text=True,
                timeout=5.0,
                shell=False,
            )
            if res.returncode != 0:
                return False, f"Docker daemon query failed: {res.stderr.strip()}"
            if DOCKER_RUNTIME not in res.stdout:
                return False, f"MANDATORY_RUNTIME_MISSING: '{DOCKER_RUNTIME}' is not registered in Docker. Registered: {res.stdout.strip()}"
            return True, f"Runtime '{DOCKER_RUNTIME}' verified in Docker."
        except Exception as e:
            return False, f"Could not inspect Docker runtimes: {str(e)}"

    def execute(self, language: str, code: str, stdin: str = "") -> Dict[str, Any]:
        job_id = uuid.uuid4().hex[:12]
        container_name = f"ksai-sandbox-{job_id}"
        tmpdir = tempfile.mkdtemp(prefix=f"job_{job_id}_", dir=self.workspaces_dir)

        start_time = time.perf_counter()
        container_started = False

        try:
            # 1. Prepare code file and command
            norm_lang = language.lower().strip()
            if norm_lang in ("python", "py"):
                file_path = os.path.join(tmpdir, "main.py")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)
                inner_cmd = ["python3", "/workspace/main.py"]

            elif norm_lang == "c":
                file_path = os.path.join(tmpdir, "main.c")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)
                inner_cmd = [
                    "/bin/sh",
                    "-c",
                    "gcc /workspace/main.c -o /workspace/main && /workspace/main",
                ]

            elif norm_lang in ("cpp", "c++"):
                file_path = os.path.join(tmpdir, "main.cpp")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)
                inner_cmd = [
                    "/bin/sh",
                    "-c",
                    "g++ /workspace/main.cpp -o /workspace/main && /workspace/main",
                ]

            elif norm_lang == "java":
                match = re.search(r"public\s+class\s+([A-Za-z0-9_]+)", code)
                class_name = match.group(1) if match else "Main"
                file_path = os.path.join(tmpdir, f"{class_name}.java")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(code)
                inner_cmd = [
                    "/bin/sh",
                    "-c",
                    f"javac -J-Xms16m -J-Xmx128m /workspace/{class_name}.java && java -Xms16m -Xmx128m -XX:+UseSerialGC -cp /workspace {class_name}",
                ]
            else:
                return {
                    "success": False,
                    "output": f"Unsupported language: '{language}'",
                    "exitCode": 400,
                    "executionTime": 0.0,
                    "error": "UNSUPPORTED_LANGUAGE",
                }

            # 2. Set strict file and directory permissions (0770 / 0660)
            if os.name != "nt":
                try:
                    os.chmod(tmpdir, 0o770)
                    os.chmod(file_path, 0o660)
                except Exception as perm_err:
                    logger.warning("Could not set workspace permissions on %s: %s", tmpdir, perm_err)

            # 3. Construct fixed immutable Docker command
            docker_cmd = [
                "docker",
                "run",
                "--rm",
                "--name",
                container_name,
                "--runtime",
                DOCKER_RUNTIME,
                "--network",
                "none",
                "--cpus",
                "0.5",
                "--memory",
                "256m",
                "--memory-swap",
                "256m",
                "--pids-limit",
                "64",
                "--read-only",
                "--tmpfs",
                "/tmp:rw,noexec,nosuid,size=64m",
                "--user",
                "1001:1001",
                "--security-opt",
                "no-new-privileges",
                "-v",
                f"{tmpdir}:/workspace:rw",
                DOCKER_IMAGE,
            ] + inner_cmd

            container_started = True

            # 4. Execute via bounded streaming subprocess.Popen with shell=False
            proc = subprocess.Popen(
                docker_cmd,
                stdin=subprocess.PIPE if stdin else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=False,
            )

            # Write stdin safely and close pipe
            if stdin and proc.stdin:
                try:
                    proc.stdin.write(stdin.encode("utf-8"))
                    proc.stdin.flush()
                except Exception:
                    pass
                try:
                    proc.stdin.close()
                except Exception:
                    pass
            elif proc.stdin:
                try:
                    proc.stdin.close()
                except Exception:
                    pass

            stdout_chunks = []
            stderr_chunks = []
            is_truncated = False
            stream_lock = threading.Lock()
            total_read_bytes = 0
            MAX_DRAIN_LIMIT = MAX_OUTPUT_LENGTH * 4  # 200 KB overflow termination threshold

            def drain_pipe(stream, chunks):
                nonlocal is_truncated, total_read_bytes
                try:
                    while True:
                        chunk = stream.read(4096)
                        if not chunk:
                            break
                        with stream_lock:
                            total_read_bytes += len(chunk)
                            current_len = sum(len(c) for c in chunks)
                            if current_len < MAX_OUTPUT_LENGTH:
                                avail = MAX_OUTPUT_LENGTH - current_len
                                chunks.append(chunk[:avail])
                                if len(chunk) > avail:
                                    is_truncated = True
                            else:
                                is_truncated = True

                            # If output exceeds 200 KB overflow threshold, terminate process
                            if total_read_bytes > MAX_DRAIN_LIMIT:
                                try:
                                    proc.terminate()
                                except Exception:
                                    pass
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

            try:
                ret_code = proc.wait(timeout=SUBPROCESS_TIMEOUT_SECONDS)
                t_out.join(timeout=1.0)
                t_err.join(timeout=1.0)
            except subprocess.TimeoutExpired:
                try:
                    proc.kill()
                except Exception:
                    pass
                self._force_remove_container(container_name)
                duration = round(CONTAINER_TIMEOUT_SECONDS * 1000, 2)
                return {
                    "success": False,
                    "output": f"Execution timed out (limit: {CONTAINER_TIMEOUT_SECONDS} seconds).",
                    "exitCode": -1,
                    "executionTime": duration,
                    "error": "EXECUTION_TIMEOUT",
                }

            duration = round((time.perf_counter() - start_time) * 1000, 2)
            raw_stdout = b"".join(stdout_chunks).decode("utf-8", errors="replace")
            raw_stderr = b"".join(stderr_chunks).decode("utf-8", errors="replace")

            out = raw_stdout if ret_code == 0 else (raw_stderr or raw_stdout)
            clean_out = (out or "").replace(tmpdir, "/workspace")
            if is_truncated or len(clean_out) > MAX_OUTPUT_LENGTH:
                clean_out = (
                    clean_out[:MAX_OUTPUT_LENGTH]
                    + f"\n... [Output truncated: exceeded {MAX_OUTPUT_LENGTH} bytes limit]"
                )

            err_msg = raw_stderr.lower()
            if "unknown runtime" in err_msg or "runtime not found" in err_msg:
                return {
                    "success": False,
                    "output": f"Security runtime error: Docker runtime '{DOCKER_RUNTIME}' is not registered. Execution failed closed.",
                    "exitCode": 503,
                    "executionTime": duration,
                    "error": "RUNTIME_UNAVAILABLE",
                }

            return {
                "success": ret_code == 0,
                "output": clean_out,
                "exitCode": ret_code,
                "executionTime": duration,
                "error": None if ret_code == 0 else "EXECUTION_ERROR",
            }


        except Exception as e:
            if container_started:
                self._force_remove_container(container_name)
            logger.error("Runner execution exception for %s: %s", container_name, type(e).__name__)
            return {
                "success": False,
                "output": f"Sandbox execution error: {str(e)}",
                "exitCode": -1,
                "executionTime": 0.0,
                "error": "INTERNAL_ERROR",
            }

        finally:
            # Guaranteed cleanup of isolated student workspace
            try:
                shutil.rmtree(tmpdir, ignore_errors=True)
            except Exception:
                pass

    def _force_remove_container(self, container_name: str) -> None:
        """Forcibly removes container to prevent orphaned processes."""
        try:
            subprocess.run(
                ["docker", "rm", "-f", container_name],
                capture_output=True,
                timeout=CLEANUP_TIMEOUT_SECONDS,
                shell=False,
            )
        except Exception as rm_err:
            logger.warning("Could not remove container %s: %s", container_name, rm_err)


class MockContainerRunner(BaseRunnerBackend):
    """
    Mock runner backend used for testing broker queueing, timeouts, concurrency,
    and framing when Docker is unavailable in local testing environments.
    """

    def __init__(self, artificial_delay: float = 0.0, fail_with_timeout: bool = False):
        self.artificial_delay = artificial_delay
        self.fail_with_timeout = fail_with_timeout
        self.cleaned_up_containers = []
        self.executed_count = 0

    def execute(self, language: str, code: str, stdin: str = "") -> Dict[str, Any]:
        self.executed_count += 1
        container_name = f"ksai-sandbox-mock-{uuid.uuid4().hex[:8]}"

        try:
            if self.artificial_delay > 0:
                time.sleep(self.artificial_delay)

            if self.fail_with_timeout:
                raise subprocess.TimeoutExpired(cmd=["mock_docker"], timeout=CONTAINER_TIMEOUT_SECONDS)

            # Simulated outputs based on language and code
            if "error" in code.lower():
                return {
                    "success": False,
                    "output": "Simulated Runtime Error: division by zero",
                    "exitCode": 1,
                    "executionTime": 15.0,
                    "error": "EXECUTION_ERROR",
                }

            m = re.search(r'(?:print(?:ln)?|printf)\(["\'](.*?)["\']', code)
            if not m:
                m = re.search(r'cout\s*<<\s*["\'](.*?)["\']', code)
            if m:
                output = f"{m.group(1)}\n"
            elif "hello" in code.lower():
                output = "Hello World\n"
            else:
                output = f"Mock execution success for {language}.\n"

            if len(output) > MAX_OUTPUT_LENGTH:
                output = (
                    output[:MAX_OUTPUT_LENGTH]
                    + f"\n... [Output truncated: exceeded {MAX_OUTPUT_LENGTH} bytes limit]"
                )

            return {
                "success": True,
                "output": output,
                "exitCode": 0,
                "executionTime": 12.5,
                "error": None,
            }

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "output": f"Execution timed out (limit: {CONTAINER_TIMEOUT_SECONDS} seconds).",
                "exitCode": -1,
                "executionTime": CONTAINER_TIMEOUT_SECONDS * 1000,
                "error": "EXECUTION_TIMEOUT",
            }
        finally:
            self.cleaned_up_containers.append(container_name)
