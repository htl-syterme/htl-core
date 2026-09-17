# htl-verify

Verify X-Trust signed human-presence headers in Python. Standard library only.

## Install

    pip install htl-verify

## Use

    from htl_verify import verify, Untrusted

    try:
        claims = verify(header, key=secret_bytes)
        score = claims["score"]
        if score >= 0.5:
            pass  # annotated as likely-human
    except Untrusted:
        pass  # treat as unverified; never blocks by default

## What it is not

Not a CAPTCHA, not identity, not bot authentication. The score is a signal,
not a proof. A determined client can raise its own score; that is a property
of any client-side signal and is documented in the project SPEC.

## Wire format

    X-Trust: v1.<payload_b64url>.<sig_b64url>

Payload JSON: `{sub, score, iat, exp, nonce?}`. HMAC-SHA256 over the
base64url payload. TTL 120s. Score 0..1.
