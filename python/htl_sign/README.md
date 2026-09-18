# htl-sign

Generate X-Trust signed human-presence HTTP headers. Standard library only.

## Install

    pip install htl-sign

## Usage

    from htl_sign import build_x_trust_header
    headers = build_x_trust_header(secret="your_secret", sub="user-1", score=0.88)
    # headers == {"X-Trust": "v1.eyJ...signature"}

## What it does

Signs a JSON payload {sub, score, iat, exp} with HMAC-SHA256, base64url-encoded,
prefixed with "v1.". Compatible with htl-verify (Python) and @htl-syterme/htl-core (TypeScript).

## Links

- Spec: github.com/htl-syterme/htl-core/blob/main/SPEC.md
- Dashboard: htl-syterme.github.io/htl-core
