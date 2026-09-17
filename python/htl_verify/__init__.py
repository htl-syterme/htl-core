"""htl-verify - X-Trust header verifier. Standard library only, zero dependencies."""
import base64
import hashlib
import hmac
import json
import time
from typing import Any

__version__ = "1.0.0"
__all__ = ["verify", "Untrusted"]


class Untrusted(Exception):
    """Raised when an X-Trust header fails verification."""


def _b64d(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def verify(
    header: str,
    key: bytes,
    *,
    now: float | None = None,
    max_age: int = 120,
) -> dict[str, Any]:
    """
    Verify an X-Trust header and return its claims.

    Raises Untrusted on any failure. Never returns a payload whose
    signature has not been verified first.
    """
    if not header:
        raise Untrusted("empty header")
    parts = header.split(".")
    if len(parts) != 3:
        raise Untrusted("malformed")
    version, payload_b64, sig_b64 = parts
    if version != "v1":
        raise Untrusted(f"unsupported version: {version}")

    payload = _b64d(payload_b64)
    expected = hmac.new(key, payload_b64.encode("ascii"), hashlib.sha256).digest()
    provided = _b64d(sig_b64)
    if not hmac.compare_digest(expected, provided):
        raise Untrusted("bad signature")

    claims = json.loads(payload)  # only trusted bytes reach the parser

    score = claims.get("score")
    if not isinstance(score, (int, float)) or score < 0 or score > 1:
        raise Untrusted("invalid score")

    iat = claims.get("iat")
    exp = claims.get("exp")
    if not isinstance(iat, (int, float)) or not isinstance(exp, (int, float)):
        raise Untrusted("invalid timestamps")

    n = now if now is not None else time.time()
    if n > exp:
        raise Untrusted("expired")
    if n - iat > max_age:
        raise Untrusted("stale")

    return claims
