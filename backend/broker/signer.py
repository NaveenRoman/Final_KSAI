"""
Codexa Cryptographic Student Signature Utility.
Binds signatures to HTTP method, endpoint, body hash, student ID, timestamp, and unique nonce.
"""

import hmac
import hashlib
import time
from typing import Tuple, Optional, Dict, Any


def compute_body_hash(code: str, stdin: str = "") -> str:
    """Computes SHA-256 hash of the normalized code and stdin parameters."""
    normalized = f"code={code}&stdin={stdin or ''}".encode("utf-8")
    return hashlib.sha256(normalized).hexdigest()


def compute_canonical_string(
    method: str,
    endpoint: str,
    language: str,
    body_hash: str,
    student_id: str,
    timestamp: int,
    nonce: str,
) -> str:
    """Constructs canonical string for HMAC-SHA256 signing."""
    norm_method = method.upper().strip()
    norm_endpoint = endpoint.strip()
    if not norm_endpoint.startswith("/"):
        norm_endpoint = "/" + norm_endpoint
    norm_language = language.lower().strip()
    return f"{norm_method}|{norm_endpoint}|{norm_language}|{body_hash}|{student_id}|{int(timestamp)}|{nonce}"


def sign_student_request(
    signing_secret: str,
    student_id: str,
    language: str,
    code: str,
    stdin: str,
    timestamp: int,
    nonce: str,
    method: str = "POST",
    endpoint: str = "/api/run/",
) -> str:
    """
    Generates a 64-character hex HMAC-SHA256 signature for a student execution request.
    Used by Next.js / client callers.
    """
    if not signing_secret:
        raise ValueError("signing_secret cannot be empty.")
    body_hash = compute_body_hash(code, stdin)
    canonical = compute_canonical_string(method, endpoint, language, body_hash, student_id, timestamp, nonce)
    return hmac.new(
        signing_secret.encode("utf-8"),
        canonical.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest().lower()


def verify_student_request(
    signing_secret: str,
    payload: Dict[str, Any],
    max_drift_seconds: int = 30,
    current_time: Optional[float] = None,
    method: str = "POST",
    endpoint: str = "/api/run/",
) -> Tuple[bool, Optional[str]]:
    """
    Verifies the student signature against the payload attributes.
    Checks:
    1. Timestamp drift against current time (max 30s).
    2. Constant-time HMAC verification.
    Returns (True, None) if valid, or (False, error_reason).
    """
    if not signing_secret:
        return False, "SIGNING_SECRET_NOT_CONFIGURED"

    now = time.time() if current_time is None else current_time
    req_timestamp = payload.get("timestamp")

    if not isinstance(req_timestamp, (int, float)):
        return False, "INVALID_TIMESTAMP"

    # Enforce strict timestamp drift check (+/- max_drift_seconds)
    drift = abs(now - req_timestamp)
    if drift > max_drift_seconds:
        return False, f"REQUEST_EXPIRED: Timestamp drift ({drift:.1f}s) exceeds allowed limit ({max_drift_seconds}s)"

    student_id = str(payload.get("studentId", ""))
    language = str(payload.get("language", ""))
    code = str(payload.get("code", ""))
    stdin = str(payload.get("stdin", "") or "")
    nonce = str(payload.get("nonce", ""))
    provided_sig = str(payload.get("signature", "")).lower().strip()

    expected_sig = sign_student_request(
        signing_secret=signing_secret,
        student_id=student_id,
        language=language,
        code=code,
        stdin=stdin,
        timestamp=int(req_timestamp),
        nonce=nonce,
        method=method,
        endpoint=endpoint,
    )

    if not hmac.compare_digest(provided_sig, expected_sig):
        return False, "INVALID_SIGNATURE: Cryptographic signature mismatch."

    return True, None
