import json
import os
import socket
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from datetime import datetime, timezone
from broker.client import BrokerClient
from sandbox.runner import execute_sandboxed_code, is_docker_active, USE_DOCKER_SANDBOX
from config.internal_auth import internal_auth_required, verify_internal_auth

IS_PRODUCTION = (
    os.getenv("DJANGO_ENV", "").lower() == "production"
    or os.getenv("ENVIRONMENT", "").lower() == "production"
    or os.getenv("NODE_ENV", "").lower() == "production"
)
INTERNAL_SECRET = os.getenv("INTERNAL_API_SECRET", "")
BROKER_SOCKET_PATH = os.getenv("BROKER_SOCKET_PATH", "/run/codexa/broker.sock")
BROKER_HOST = os.getenv("BROKER_HOST", "127.0.0.1")
BROKER_PORT = int(os.getenv("BROKER_PORT", "49281"))
STUDENT_SIGNING_SECRET = os.getenv(
    "STUDENT_SIGNING_SECRET",
    os.getenv("INTERNAL_API_SECRET", ""),
)


def get_broker_client() -> BrokerClient:
    """Instantiates broker client with UNIX socket if available or TCP fallback."""
    if os.path.exists(BROKER_SOCKET_PATH) and hasattr(socket, "AF_UNIX"):
        endpoint = BROKER_SOCKET_PATH
    else:
        endpoint = (BROKER_HOST, BROKER_PORT)
    return BrokerClient(endpoint=endpoint, signing_secret=STUDENT_SIGNING_SECRET, timeout=14.0)


@csrf_exempt
def health_check(request):
    """
    Lightweight health endpoint for Django backend monitoring.
    Reports Django application availability and execution sandbox readiness.
    Protected via internal auth verification.
    """
    if request.method not in ("GET", "HEAD"):
        return JsonResponse(
            {"success": False, "error": "Method not allowed. Use GET or HEAD."},
            status=405,
        )

    is_valid, error_response = verify_internal_auth(request)
    if not is_valid:
        return error_response

    # Lightweight, safe, read-only sandbox inspection
    # NEVER executes arbitrary student code during health checks
    sandbox_mode = "docker" if USE_DOCKER_SANDBOX else "local_process"
    docker_active = False
    sandbox_status = "Unknown"

    try:
        if USE_DOCKER_SANDBOX:
            docker_active = is_docker_active()
            sandbox_status = "Ready" if docker_active else "Unavailable"
        else:
            # In development, host subprocess runner is used
            sandbox_status = "Ready (Host Process)" if not IS_PRODUCTION else "Unavailable"
    except Exception:
        sandbox_status = "Unknown"

    return JsonResponse(
        {
            "status": "Healthy",
            "service": "django_execution_backend",
            "sandbox": {
                "status": sandbox_status,
                "mode": sandbox_mode,
                "dockerActive": docker_active,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
        status=200,
    )


@csrf_exempt
@internal_auth_required
def run_code(request):
    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "output": "Only POST requests are allowed.",
                "exitCode": 405,
            },
            status=405,
        )

    # Payload size guard: reject payloads over 64 KB
    if len(request.body) > 65536:
        return JsonResponse(
            {
                "success": False,
                "output": "Payload Too Large: Source code exceeds 64 KB limit.",
                "exitCode": 413,
            },
            status=413,
        )

    try:
        data = json.loads(request.body)
        code = data.get("code", "")
        language = str(data.get("language", "java")).lower().strip()
        stdin = data.get("stdin", "")
        if stdin is None:
            stdin = ""

        if not code.strip():
            return JsonResponse(
                {
                    "success": False,
                    "output": "No code provided.",
                    "exitCode": 400,
                },
                status=400,
            )

        student_id = str(data.get("studentId") or "student_anonymous").strip()
        has_signed_envelope = "signature" in data and "nonce" in data and "timestamp" in data

        try:
            client = get_broker_client()
            if has_signed_envelope:
                result = client.execute(
                    student_id=student_id,
                    language=language,
                    code=code,
                    stdin=stdin,
                    raw_payload_override=data,
                )
            else:
                result = client.execute(
                    student_id=student_id,
                    language=language,
                    code=code,
                    stdin=stdin,
                )

            # If broker communication failed in development, fallback to local runner
            if not IS_PRODUCTION and not result.get("success") and "Broker communication error" in str(result.get("output", "")):
                result = execute_sandboxed_code(code, language, stdin)
                status_code = 503 if result.get("exitCode") == 503 else 200
                return JsonResponse(result, status=status_code)

            # Map broker exit code to appropriate HTTP status if failed
            exit_code = result.get("exitCode", 0)
            if exit_code in (400, 401, 403, 409, 413, 429, 503):
                status_code = exit_code
            else:
                status_code = 200

            return JsonResponse(result, status=status_code)

        except Exception as broker_err:
            # In development fallback to legacy runner if broker daemon is offline
            if not IS_PRODUCTION:
                result = execute_sandboxed_code(code, language, stdin)
                status_code = 503 if result.get("exitCode") == 503 else 200
                return JsonResponse(result, status=status_code)

            return JsonResponse(
                {
                    "success": False,
                    "output": f"Execution broker unavailable: {str(broker_err)}",
                    "exitCode": 503,
                },
                status=503,
            )

    except json.JSONDecodeError:
        return JsonResponse(
            {
                "success": False,
                "output": "Invalid JSON payload.",
                "exitCode": 400,
            },
            status=400,
        )
    except Exception as e:
        return JsonResponse(
            {
                "success": False,
                "output": "Execution service encountered an internal error.",
                "exitCode": 500,
            },
            status=500,
        )