# HTL/1.0 — Human Presence Attestation
## A Profile of RFC 9421 HTTP Message Signatures

**Status:** Draft 0.1 | **Date:** 2026-09-13 | **Authors:** HTL Project

## Abstract

HTL/1.0 is the human-presence complement to IETF Web Bot Auth.

| Question | Protocol |
|----------|----------|
| Which bot is calling? | Web Bot Auth (IETF) |
| Which human delegated? | OAuth 2.0 |
| Is a human present NOW? | HTL/1.0 (this document) |

## Design Principles

1. Zero PII — verifier learns only a score and timestamp
2. Per-request — every call carries its own signed token
3. Annotate, never block — score 0..1, server decides
4. Edge-native — pure HMAC-SHA256, any runtime
5. Self-hostable — no third-party round-trip needed

## Header Format

X-Trust: v1.{payloadB64url}.{signatureB64url}

Payload fields: sub, score (0..1), iat, exp
Signature: HMAC-SHA256 over payloadB64url
Freshness: reject if now > exp OR now - iat > 120s

## Relationship to Web Bot Auth

X-Trust + Web Bot Auth = complete HTTP trust stack:
- X-Trust header = human present
- Signature-Agent header = which bot/agent

## Reference Implementation

npm install @htl-syterme/htl-core
deno add jsr:@htl-syterme/htl-core

## Per-tenant keys

As of v1.1, each customer's API key is bound to a signing key identified by
a `kid` claim in the payload. Verifiers MUST look up the secret by `kid`.
Implementations that only support a single shared secret MUST reject payloads
whose `kid` is not their known value.

Signing keys are stored hashed; the plaintext is shown once at issuance.

## Time-bounded score

A verifier MUST reject any score that is not consistent with the elapsed
wall-clock time since `iat`. The reference implementation caps the effective
score at `0.30 + 0.10 * floor(elapsed_seconds / 15)`. This bounds the economic
cost of fabricating a high score: a client cannot present a 0.9 score on a
session that started 5 seconds ago.

## Threat model

The score is an economic signal, not a cryptographic proof of humanity.

- A determined client can raise its own score, at a cost proportional to
  wall-clock time per session (see Time-bounded score).
- The header is signed with HMAC-SHA256; forged signatures are rejected.
- The signature does not attest to what happened on the client. It attests
  that a holder of the API key signed a payload claiming a given score.
- Mixed traffic on a single IP (mobile carriers, corporate NAT) is expected.
  Verifiers SHOULD NOT block on IP alone.
- Replay is mitigated by a server-issued nonce plus a 120s TTL.

Consumers SHOULD treat the score as one signal among several, and MUST NOT
rely on it as the sole basis for high-stakes decisions.

## Test Vectors

Reference vectors for implementers. All signatures use HMAC-SHA256.

Encoding: base64url without padding (RFC 4648 section 5).

### Vector 1 - valid token

- secret: `htl_spec_test_secret_do_not_use_in_prod`
- payload: `{"exp":1700000120,"iat":1700000000,"score":0.88,"sub":"spec-user-1"}`
- token: `v1.eyJleHAiOjE3MDAwMDAxMjAsImlhdCI6MTcwMDAwMDAwMCwic2NvcmUiOjAuODgsInN1YiI6InNwZWMtdXNlci0xIn0.KSsidNfQ5hzwTKXUdWIo_jBw4HoUlTaWoWCtOjClzx8`
- expected: verify returns payload

### Vector 2 - invalid signature

- secret: `htl_spec_test_secret_do_not_use_in_prod`
- payload: `{"exp":1700000120,"iat":1700000000,"score":0.88,"sub":"spec-user-1"}`
- token: `v1.eyJleHAiOjE3MDAwMDAxMjAsImlhdCI6MTcwMDAwMDAwMCwic2NvcmUiOjAuODgsInN1YiI6InNwZWMtdXNlci0xIn0.AAAA`
- expected: verify returns null

### Vector 3 - wrong secret

- secret: `wrong_secret`
- payload: `{"exp":1700000120,"iat":1700000000,"score":0.88,"sub":"spec-user-1"}`
- token: `v1.eyJleHAiOjE3MDAwMDAxMjAsImlhdCI6MTcwMDAwMDAwMCwic2NvcmUiOjAuODgsInN1YiI6InNwZWMtdXNlci0xIn0.KSsidNfQ5hzwTKXUdWIo_jBw4HoUlTaWoWCtOjClzx8`
- expected: verify returns null

### Vector 4 - score out of range (forged with valid sig)

- secret: `htl_spec_test_secret_do_not_use_in_prod`
- payload: `{"exp":1700000120,"iat":1700000000,"score":5.0,"sub":"spec-user-1"}`
- token: `v1.eyJleHAiOjE3MDAwMDAxMjAsImlhdCI6MTcwMDAwMDAwMCwic2NvcmUiOjUuMCwic3ViIjoic3BlYy11c2VyLTEifQ.cT7fg5g5MkCNIaqsL9gN0GR80v8f3b_1KDUFG8KMC1s`
- expected: verify returns null

