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

## Threat Model — HMAC Shared Secret (v1)

X-Trust v1 uses HMAC-SHA256 with a single shared secret. This is intentional for the v1 scope and has a known limitation that we document here rather than hide.

### What the signature proves

- The token was created by someone who possesses the shared secret.
- The payload has not been tampered with in transit.
- The token is fresh (TTL 120s, iat window enforced).

### What the signature does NOT prove

- That the client is trustworthy by itself. If `trustFetch` runs in a browser and the secret is bundled into client-side code, any user can read it from devtools and forge a valid token with `score: 1.0`.
- That the score is accurate. The score is a heuristic, not an attestation.

### Recommended deployment model

- **Server-side only**: sign tokens from your backend where the secret never leaves the server. This is the safe default.
- **Client-side**: only acceptable if you accept that any user can craft tokens. Treat the score as untrusted input. Rate-limit accordingly.

### v2 roadmap — asymmetric signatures

X-Trust v2 will move to Ed25519 (RFC 9421 style):

- Server publishes the public key at `/.well-known/x-trust-key`.
- Client signs with an ephemeral key it generates locally.
- Server verifies using the published public key.
- No shared secret ever leaves the server.

No date announced. v1 is stable and shipped.

### Detection

We log every verification attempt. Anomalies (score distributions, replay attempts, forged signatures) feed into `security_events` and are reviewed weekly.
