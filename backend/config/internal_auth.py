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
    Fails closed in ALL environments (production and development) if secret is missing (500)
    or token is missing/invalid (401). Zero predictable fallbacks.
    """
    secret = os.getenv("INTERNAL_API_SECRET", "")

    if not secret:
        logger.error("CRITICAL: INTERNAL_API_SECRET is not configured in environment.")
        return False, JsonResponse(
            {
                "success": False,
                "output": "Configuration Error: INTERNAL_API_SECRET is mandatory. Configure INTERNAL_API_SECRET in the environment.",
                "message": "Configuration Error: INTERNAL_API_SECRET is mandatory. Configure INTERNAL_API_SECRET in the environment.",
                "exitCode": 500,
            },
            status=500,
        )

    token = request.headers.get("X-Internal-Secret", "")
    if not token or not hmac.compare_digest(token, secret):
        return False, JsonResponse(
            {
                "success": False,
                "output": "Unauthorized: Access requires valid internal authentication.",
                "message": "Unauthorized: Access requires valid internal authentication.",
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
