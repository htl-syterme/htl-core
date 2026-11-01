"""htl_sign: Generate X-Trust signed human-presence headers. Standard library only."""

import base64
import hashlib
import hmac
import json
import time
from typing import Any, Optional

VERSION = "v1"


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def generate_trust_token(
    secret: str,
    sub: str = "client",
    score: float = 0.8,
    ttl_seconds: int = 120,
) -> str:
    """Generate an X-Trust token. Format: v1.payloadB64.sigB64."""
    if not 0 <= score <= 1:
        raise ValueError("score must be between 0 and 1")

    now = int(time.time())
    payload: dict[str, Any] = {
        "sub": sub,
        "score": score,
        "iat": now,
        "exp": now + ttl_seconds,
    }

    payload_json = json.dumps(payload, separators=(",", ":"))
    payload_b64 = b64url_encode(payload_json.encode("utf-8"))

    key = secret.encode("utf-8")
    sig = hmac.new(key, payload_b64.encode("ascii"), hashlib.sha256).digest()
    sig_b64 = b64url_encode(sig)

    return f"{VERSION}.{payload_b64}.{sig_b64}"


def build_signed_headers(
    secret: str, 
    sub: str = "client", 
    score: float = 0.8,
    agent_url: Optional[str] = None
) -> dict[str, str]:
    """
    Return a dict ready to merge into HTTP headers.
    Includes X-Trust and, if provided, Signature-Agent (IETF draft -01).
    """
    headers = {
        "X-Trust": generate_trust_token(secret, sub=sub, score=score)
    }
    if agent_url:
        headers["Signature-Agent"] = agent_url
        
    return headers


__all__ = ["generate_trust_token", "build_signed_headers", "VERSION"]
