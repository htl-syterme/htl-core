# HTL/1.0 – Human Presence Attestation
## A Profile of RFC 9421 HTTP Message Signatures

**Status:** Draft 0.2 | **Date:** 2026-11-01 | **Authors:** HTL Project

## Abstract

HTL/1.0 is the human-presence complement to IETF Web Bot Auth (draft-ietf-webbotauth-httpsig-protocol-01).

| Question | Protocol |
|----------|----------|
| Which bot is calling? | Web Bot Auth (IETF) |
| Which human delegated? | OAuth 2.0 |
| Is a human present NOW? | HTL/1.0 (this document) |

## Design Principles

1. Zero PII – verifier learns only a score and timestamp
2. Per-request – every call carries its own signed token
3. Annotate, never block – score 0..1, server decides (Fail-open)
4. Edge-native – pure HMAC-SHA256 and Ed25519, any runtime
5. Self-hostable – no third-party round-trip needed

## Header Format

HTL supports two versions of tokens:
- **v1**: `v1.{payloadB64url}.{signatureB64url}` (HMAC-SHA256)
- **v2**: `v2.{payloadB64url}.{signatureB64url}` (Ed25519)

Payload fields: `sub`, `score` (0..1), `iat`, `exp`, `jti` (16 random bytes)
Signature: HMAC-SHA256 or Ed25519 over payloadB64url
Freshness: reject if now > exp OR now - iat > 120s

## Relationship to Web Bot Auth

X-Trust + Web Bot Auth = complete HTTP trust stack:
- `X-Trust` header = human present
- `Signature-Agent` header = which bot/agent (as per IETF draft -01, pointing directly to a JWK Set URI)
- `Accept-Signature` header = server requests a signature (fail-open compliant)

## Error Handling (RFC 9457)

When a server enforces a strict threshold (via `requireTrust`), it uses RFC 9457 (Problem Details for HTTP APIs). 
The response includes `Content-Type: application/problem+json` with fields: `type`, `title`, `status`, and `detail`.

## Reference Implementation

```bash
npm install @htl-systeme/htl-core
deno add jsr:@htl-systeme/htl-core
pip install htl-verify htl-sign

