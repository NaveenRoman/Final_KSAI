import os
import hmac
import logging
from functools import wraps
from django.http import JsonResponse

logger = logging.getLogger("config.internal_auth")

IS_PRODUCTION = (
    os.getenv("DJANGO_ENV", "").lower() == "production"
    or os.getenv("ENVIRONMENT", "").lower() == "production"
    or os.getenv("NODE_ENV", "").lower() == "production"
)


def verify_internal_auth(request) -> tuple[bool, JsonResponse | None]:
    """
    Validates X-Internal-Secret header using constant-time string comparison.
    Fails closed in production if secret is missing (500) or token is invalid (401).
    """
    secret = os.getenv("INTERNAL_API_SECRET", "")

    if IS_PRODUCTION:
        if not secret:
            logger.error("CRITICAL: INTERNAL_API_SECRET is not configured in production mode.")
            return False, JsonResponse(
                {
                    "success": False,
                    "output": "Configuration Error: INTERNAL_API_SECRET is mandatory in production environment.",
                    "message": "Configuration Error: INTERNAL_API_SECRET is mandatory in production environment.",
                    "exitCode": 500,
                },
                status=500,
            )
        token = request.headers.get("X-Internal-Secret", "")
        if not token or not hmac.compare_digest(token, secret):
            return False, JsonResponse(
                {
                    "success": False,
                    "output": "Unauthorized: Access requires internal authentication.",
                    "message": "Unauthorized: Access requires internal authentication.",
                    "exitCode": 401,
                },
                status=401,
            )
        return True, None

    # In development: enforce if secret is configured
    if secret:
        token = request.headers.get("X-Internal-Secret", "")
        if not token or not hmac.compare_digest(token, secret):
            return False, JsonResponse(
                {
                    "success": False,
                    "output": "Unauthorized: Access requires internal authentication.",
                    "message": "Unauthorized: Access requires internal authentication.",
                    "exitCode": 401,
                },
                status=401,
            )

    return True, None


def internal_auth_required(view_func):
    """Decorator to protect views with internal service authentication."""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        is_valid, error_response = verify_internal_auth(request)
        if not is_valid:
            return error_response
        return view_func(request, *args, **kwargs)
    return _wrapped_view
