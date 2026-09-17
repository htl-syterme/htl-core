# Security Policy

## Reporting a vulnerability

Email **diengamine.htl@gmail.com** with:

- A short description of the issue
- Reproduction steps, or a minimal proof of concept
- The affected component (`htl-core` SDK, an Edge Function, the Paddle webhook, the API)
- Your disclosure preference (named or anonymous)

Do not open a public GitHub issue for security reports.

## What we commit to

- Acknowledgment within **72 hours** (business days).
- A first assessment within **7 days**.
- A fix or a documented mitigation within **30 days** for confirmed issues, unless the impact requires coordinated disclosure.
- Credit in the changelog and in the fix commit, if you want it.

## Scope

In scope:

- The X-Trust wire format and its reference implementations (`src/`, `python/`, `supabase/functions/`).
- The hosted endpoints (`hyper-responder`, `trust-counter`, `quick-task`, `report`, `alert`).
- The Paddle webhook signature check.

Out of scope:

- Issues that require an attacker to already hold a valid API key and use it as intended.
- Rate-limit bypasses that require a /64 IPv6 pool and no other primitive.
- Any submission that amounts to "the score is not proof of humanity". That's documented in the SPEC's Threat Model section and is a known, accepted limitation.

## Known limitations

The score is an economic signal, not a cryptographic proof. A motivated client can fabricate the behavioural signals that feed the score. The mitigation is time-bounded growth, which makes fabrication cost roughly proportional to wall-clock time per session. See `SPEC.md` → Threat Model.

We do not perform identity verification, age verification, sanctions screening, or KYC. Not by design, not ever.

## Cryptographic details

- Header format: `X-Trust: v1.<payload_b64url>.<sig_b64url>`
- Signature: HMAC-SHA256 over the base64url-encoded payload.
- TTL: 120 seconds. Replay protection via a server-issued nonce stored in `nonce_cache`.
- API keys: stored as SHA-256 hashes. Plaintext shown once at issuance.
- Paddle webhook: HMAC-SHA256 over `<ts>:<raw_body>`, 5-minute window, timing-safe compare.
