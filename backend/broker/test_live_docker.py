"""
Codexa Live Docker Integration Test Suite.
Verifies real isolated container compilation and execution.
DOES NOT use MockContainerRunner. Fails closed / skips if Docker daemon is not available.
"""

import os
import unittest
import subprocess
from backend.broker.runner_backend import DockerContainerRunner, DOCKER_RUNTIME, DOCKER_IMAGE


class TestLiveDockerRunner(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 1. Assert Docker CLI is available
        try:
            res = subprocess.run(["docker", "info"], capture_output=True, text=True, timeout=5.0)
            if res.returncode != 0:
                raise unittest.SkipTest(f"Docker daemon not running: {res.stderr.strip()}")
        except (FileNotFoundError, subprocess.SubprocessError) as err:
            raise unittest.SkipTest(f"Docker CLI not available on this host: {err}")

        # 2. Assert gVisor runtime (runsc) is registered
        valid, msg = DockerContainerRunner.verify_runtime_environment()
        if not valid:
            raise unittest.SkipTest(f"Required gVisor runtime check failed: {msg}")

        cls.runner = DockerContainerRunner()

    def test_01_live_python_execution(self):
        res = self.runner.execute("python", "print('Real Docker Python Success')")
        self.assertTrue(res["success"], f"Execution failed: {res.get('output')}")
        self.assertEqual(res["exitCode"], 0)
        self.assertIn("Real Docker Python Success", res["output"])

    def test_02_live_c_compilation(self):
        code = '#include <stdio.h>\nint main() { printf("Real Docker C Success\\n"); return 0; }'
        res = self.runner.execute("c", code)
        self.assertTrue(res["success"], f"Execution failed: {res.get('output')}")
        self.assertEqual(res["exitCode"], 0)
        self.assertIn("Real Docker C Success", res["output"])

    def test_03_live_cpp_compilation(self):
        code = '#include <iostream>\nint main() { std::cout << "Real Docker C++ Success\\n"; return 0; }'
        res = self.runner.execute("cpp", code)
        self.assertTrue(res["success"], f"Execution failed: {res.get('output')}")
        self.assertEqual(res["exitCode"], 0)
        self.assertIn("Real Docker C++ Success", res["output"])

    def test_04_live_java_compilation(self):
        code = 'public class Main { public static void main(String[] args) { System.out.println("Real Docker Java Success"); } }'
        res = self.runner.execute("java", code)
        self.assertTrue(res["success"], f"Execution failed: {res.get('output')}")
        self.assertEqual(res["exitCode"], 0)
        self.assertIn("Real Docker Java Success", res["output"])

    def test_05_live_network_isolation(self):
        # Outbound network requests must fail because container runs with --network none
        code = "import urllib.request; urllib.request.urlopen('http://1.1.1.1', timeout=2)"
        res = self.runner.execute("python", code)
        self.assertFalse(res["success"], "Network request must fail under --network none")

    def test_06_live_read_only_rootfs(self):
        # Writing outside /workspace or /tmp must fail because container runs with --read-only
        code = "with open('/root/malicious.txt', 'w') as f: f.write('exploit')"
        res = self.runner.execute("python", code)
        self.assertFalse(res["success"], "Root filesystem writes must fail under --read-only")
        self.assertIn("Read-only file system", res["output"])

    def test_07_live_non_root_uid(self):
        # Must execute strictly as student UID 1001
        code = "import os; print('UID=' + str(os.getuid()))"
        res = self.runner.execute("python", code)
        self.assertTrue(res["success"])
        self.assertIn("UID=1001", res["output"])

    def test_08_live_timeout_interruption(self):
        # Infinite loops must be interrupted by timeout and container destroyed
        code = "while True: pass"
        res = self.runner.execute("python", code)
        self.assertFalse(res["success"])
        self.assertEqual(res["exitCode"], -1)
        self.assertEqual(res["error"], "EXECUTION_TIMEOUT")


if __name__ == "__main__":
    unittest.main()
