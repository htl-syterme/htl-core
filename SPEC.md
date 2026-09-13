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
