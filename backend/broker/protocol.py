"""
Codexa Execution Broker — Protocol and Schema Definition
Strict JSON-over-stream protocol with newline-delimited framing and maximum frame limits.
"""

import json
import re
from typing import Dict, Any, Tuple, Optional

MAX_FRAME_BYTES = 1024 * 1024  # 1 MB maximum payload frame
MAX_CODE_LENGTH = 50000
MAX_STDIN_LENGTH = 10000
MAX_OUTPUT_LENGTH = 50000

ALLOWED_LANGUAGES = {"python", "py", "c", "cpp", "c++", "java"}
ALLOWED_REQUEST_FIELDS = {
    "studentId",
    "timestamp",
    "nonce",
    "signature",
    "language",
    "code",
    "stdin",
}

# Standardized Error Codes
ERR_MALFORMED_JSON = "MALFORMED_JSON"
ERR_UNKNOWN_FIELD = "UNKNOWN_FIELD"
ERR_MISSING_FIELD = "MISSING_FIELD"
ERR_INVALID_FIELD = "INVALID_FIELD"
ERR_UNSUPPORTED_LANGUAGE = "UNSUPPORTED_LANGUAGE"
ERR_PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
ERR_INVALID_SIGNATURE = "INVALID_SIGNATURE"
ERR_REQUEST_EXPIRED = "REQUEST_EXPIRED"
ERR_REPLAY_DETECTED = "REPLAY_DETECTED"
ERR_CONCURRENT_LIMIT = "CONCURRENT_RUN_LIMIT_EXCEEDED"
ERR_CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED"
ERR_EXECUTION_TIMEOUT = "EXECUTION_TIMEOUT"
ERR_INTERNAL_ERROR = "INTERNAL_ERROR"


class ProtocolError(Exception):
    def __init__(self, code: str, message: str, http_status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status


def validate_request_payload(payload: Any) -> Dict[str, Any]:
    """
    Strictly validates incoming request dictionary.
    Rejects unknown fields, invalid types, length violations, and unsupported languages.
    """
    if not isinstance(payload, dict):
        raise ProtocolError(ERR_INVALID_FIELD, "Request payload must be a JSON object.")

    # 1. Reject unknown fields
    unknown_keys = set(payload.keys()) - ALLOWED_REQUEST_FIELDS
    if unknown_keys:
        first_unknown = sorted(list(unknown_keys))[0]
        raise ProtocolError(
            ERR_UNKNOWN_FIELD,
            f"Unknown field in request payload: '{first_unknown}'",
            http_status=400,
        )

    # 2. Check required fields
    required_keys = {"studentId", "timestamp", "nonce", "signature", "language", "code"}
    missing_keys = required_keys - set(payload.keys())
    if missing_keys:
        first_missing = sorted(list(missing_keys))[0]
        raise ProtocolError(
            ERR_MISSING_FIELD,
            f"Missing mandatory request field: '{first_missing}'",
            http_status=400,
        )

    # 3. Validate studentId
    student_id = payload.get("studentId")
    if not isinstance(student_id, str) or not student_id.strip() or len(student_id) > 128:
        raise ProtocolError(ERR_INVALID_FIELD, "studentId must be a non-empty string up to 128 chars.")

    # 4. Validate timestamp
    timestamp = payload.get("timestamp")
    if not isinstance(timestamp, (int, float)) or isinstance(timestamp, bool):
        raise ProtocolError(ERR_INVALID_FIELD, "timestamp must be a numeric Unix epoch timestamp.")

    # 5. Validate nonce
    nonce = payload.get("nonce")
    if not isinstance(nonce, str) or not nonce.strip() or len(nonce) > 64:
        raise ProtocolError(ERR_INVALID_FIELD, "nonce must be a non-empty string up to 64 chars.")

    # 6. Validate signature
    sig = payload.get("signature")
    if not isinstance(sig, str) or not re.fullmatch(r"^[a-fA-F0-9]{64}$", sig):
        raise ProtocolError(ERR_INVALID_SIGNATURE, "signature must be a 64-character hex HMAC-SHA256 string.")

    # 7. Validate language
    lang = payload.get("language")
    if not isinstance(lang, str):
        raise ProtocolError(ERR_INVALID_FIELD, "language must be a string.")
    norm_lang = lang.lower().strip()
    if norm_lang not in ALLOWED_LANGUAGES:
        raise ProtocolError(
            ERR_UNSUPPORTED_LANGUAGE,
            f"Unsupported language: '{lang}'. Allowed: {sorted(list(ALLOWED_LANGUAGES))}",
        )

    # 8. Validate code
    code = payload.get("code")
    if not isinstance(code, str) or not code.strip():
        raise ProtocolError(ERR_INVALID_FIELD, "code must be a non-empty string.")
    if len(code) > MAX_CODE_LENGTH:
        raise ProtocolError(
            ERR_PAYLOAD_TOO_LARGE,
            f"code length ({len(code)}) exceeds maximum allowed ({MAX_CODE_LENGTH} characters).",
            http_status=413,
        )

    # 9. Validate stdin (optional, defaults to empty string)
    stdin = payload.get("stdin", "")
    if stdin is None:
        stdin = ""
    if not isinstance(stdin, str):
        raise ProtocolError(ERR_INVALID_FIELD, "stdin must be a string if provided.")
    if len(stdin) > MAX_STDIN_LENGTH:
        raise ProtocolError(
            ERR_PAYLOAD_TOO_LARGE,
            f"stdin length ({len(stdin)}) exceeds maximum allowed ({MAX_STDIN_LENGTH} characters).",
            http_status=413,
        )

    return {
        "studentId": student_id.strip(),
        "timestamp": int(timestamp),
        "nonce": nonce.strip(),
        "signature": sig.lower(),
        "language": norm_lang,
        "code": code,
        "stdin": stdin,
    }


def format_response(
    success: bool,
    output: str = "",
    exit_code: int = 0,
    execution_time: float = 0.0,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    """Constructs a standard response dictionary."""
    clean_output = str(output or "")
    if len(clean_output) > MAX_OUTPUT_LENGTH:
        clean_output = (
            clean_output[:MAX_OUTPUT_LENGTH]
            + f"\n... [Output truncated: exceeded {MAX_OUTPUT_LENGTH} bytes limit]"
        )

    return {
        "success": bool(success),
        "output": clean_output,
        "exitCode": int(exit_code),
        "executionTime": round(float(execution_time), 2),
        "error": error,
    }
