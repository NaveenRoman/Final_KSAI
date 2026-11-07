#!/usr/bin/env python3
"""
Codexa Execution Broker — Controlled Capacity & Queuing Benchmark.
Simulates real student execution bursts under varying concurrency levels
without sending any traffic to production.

Evaluates:
- Baseline (max_concurrency = 2, queue_timeout = 3.0s)
- Medium Scale (max_concurrency = 8, queue_timeout = 6.0s)
- High Scale (max_concurrency = 16, queue_timeout = 8.0s)
"""

import sys
import os
import time
import asyncio
import statistics
from typing import List, Dict, Any

# Ensure backend modules can be imported
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "backend"))

from broker.server import BrokerServer
from broker.runner_backend import MockContainerRunner
from broker.signer import sign_student_request

SECRET = "test_audit_signing_secret_64chars_long_entropy_for_capacity_test"


async def simulate_student_execution(
    server: BrokerServer,
    student_id: str,
    delay_seconds: float = 1.8,
) -> Dict[str, Any]:
    """Generates an authentic signed payload and submits to broker process_request."""
    import json
    import uuid

    req_start = time.perf_counter()
    nonce = str(uuid.uuid4())
    ts = int(time.time())

    payload_to_sign = {
        "studentId": student_id,
        "language": "python",
        "code": "print('hello')",
        "stdin": "",
        "timestamp": ts,
        "nonce": nonce,
    }

    sig = sign_student_request(
        signing_secret=SECRET,
        student_id=student_id,
        language="python",
        code="print('hello')",
        stdin="",
        timestamp=ts,
        nonce=nonce,
        method="POST",
        endpoint="/api/run/",
    )
    full_payload = {**payload_to_sign, "signature": sig}
    raw_frame = json.dumps(full_payload)

    resp = await server.process_request(raw_frame)
    total_time = time.perf_counter() - req_start

    return {
        "student_id": student_id,
        "success": resp.get("success", False),
        "exit_code": resp.get("exitCode"),
        "error": resp.get("error"),
        "total_latency_ms": round(total_time * 1000, 2),
    }


async def run_burst_test(
    concurrency_limit: int,
    queue_timeout: float,
    burst_size: int,
    simulated_exec_duration: float = 1.8,
) -> Dict[str, Any]:
    """Runs a simultaneous burst of N requests against a configured BrokerServer instance."""
    mock_runner = MockContainerRunner(artificial_delay=simulated_exec_duration)
    server = BrokerServer(
        signing_secret=SECRET,
        max_concurrency=concurrency_limit,
        queue_timeout=queue_timeout,
        runner_backend=mock_runner,
    )

    t0 = time.perf_counter()
    tasks = [
        simulate_student_execution(
            server=server,
            student_id=f"student_{i:03d}",
            delay_seconds=simulated_exec_duration,
        )
        for i in range(burst_size)
    ]

    results = await asyncio.gather(*tasks)
    total_wall_time = time.perf_counter() - t0

    successes = [r for r in results if r["exit_code"] == 0 and r["success"]]
    capacity_errors = [r for r in results if r["exit_code"] == 503]
    latencies = [r["total_latency_ms"] for r in results]
    success_latencies = [r["total_latency_ms"] for r in successes]

    p50 = round(statistics.median(latencies), 1) if latencies else 0.0
    p95 = round(statistics.quantiles(latencies, n=20)[18], 1) if len(latencies) >= 20 else (max(latencies) if latencies else 0.0)

    # Calculate CPU and RAM footprints
    peak_active = min(burst_size, concurrency_limit)
    ram_mb = peak_active * 290  # 256MB container + 34MB gVisor overhead
    cpu_cores = peak_active * 0.5  # 0.5 CPU limit per container

    return {
        "concurrency_limit": concurrency_limit,
        "queue_timeout": queue_timeout,
        "burst_size": burst_size,
        "total_requests": burst_size,
        "success_count": len(successes),
        "error_503_count": len(capacity_errors),
        "success_rate_pct": round((len(successes) / burst_size) * 100, 1),
        "wall_time_sec": round(total_wall_time, 2),
        "throughput_rps": round(len(successes) / total_wall_time, 2) if total_wall_time > 0 else 0.0,
        "latency_p50_ms": p50,
        "latency_p95_ms": p95,
        "min_latency_ms": min(latencies) if latencies else 0.0,
        "max_latency_ms": max(latencies) if latencies else 0.0,
        "est_peak_ram_mb": ram_mb,
        "est_peak_cpu_cores": cpu_cores,
    }


async def main():
    print("=" * 80)
    print("CODEXA EXECUTION BROKER — CAPACITY & LOAD SIMULATION AUDIT")
    print("=" * 80)
    print("Testing burst sizes: 1, 2, 4, 8, 16 simultaneous student requests.")
    print("Simulated realistic code execution time: 1.8 seconds per run (compile + execute).\n")

    scenarios = [
        {"name": "Scenario A: Current Production Baseline (max_concurrency = 2, queue_timeout = 3.0s)", "limit": 2, "timeout": 3.0},
        {"name": "Scenario B: Tuned Moderate Scale (max_concurrency = 8, queue_timeout = 6.0s)", "limit": 8, "timeout": 6.0},
        {"name": "Scenario C: Production Target Scale (max_concurrency = 16, queue_timeout = 8.0s)", "limit": 16, "timeout": 8.0},
    ]

    burst_sizes = [1, 2, 4, 8, 16]

    all_results = {}

    for sc in scenarios:
        print(f"\n--- {sc['name']} ---")
        print(f"{'Burst':<8} | {'Success':<10} | {'503 Err':<10} | {'Success %':<12} | {'Throughput':<12} | {'p50 Latency':<14} | {'p95 Latency':<14} | {'RAM Needed':<12} | {'CPU Cores'}")
        print("-" * 110)

        sc_res = []
        for b in burst_sizes:
            res = await run_burst_test(
                concurrency_limit=sc["limit"],
                queue_timeout=sc["timeout"],
                burst_size=b,
                simulated_exec_duration=1.8,
            )
            sc_res.append(res)
            print(
                f"{res['burst_size']:<8} | "
                f"{res['success_count']:<10} | "
                f"{res['error_503_count']:<10} | "
                f"{str(res['success_rate_pct']) + '%':<12} | "
                f"{str(res['throughput_rps']) + ' req/s':<12} | "
                f"{str(res['latency_p50_ms']) + ' ms':<14} | "
                f"{str(res['latency_p95_ms']) + ' ms':<14} | "
                f"{str(res['est_peak_ram_mb']) + ' MB':<12} | "
                f"{res['est_peak_cpu_cores']}"
            )
        all_results[sc["name"]] = sc_res

    print("\n" + "=" * 80)
    print("SIMULATION COMPLETE — ZERO TRAFFIC SENT TO PRODUCTION")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
