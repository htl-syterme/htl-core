# Attack Tests - X-Trust / HTL

All tests below run on every push via `node --test test/*.mjs`.
Current status: **20 passed, 0 failed**.

## Malformed tokens

| Attack | Expected | Status |
|--------|----------|--------|
| Empty token | null | PASS |
| 2 parts instead of 3 | null | PASS |
| 4 parts instead of 3 | null | PASS |
| Wrong version prefix (v2) | null | PASS |

## Signature forgery

| Attack | Expected | Status |
|--------|----------|--------|
| Random signature | null | PASS |
| Truncated signature | null | PASS |

## Payload tampering

| Attack | Expected | Status |
|--------|----------|--------|
| Score modified, sig kept | null | PASS |
| Payload not JSON | null | PASS |
| Missing score field | null | PASS |

## Score boundaries

| Attack | Expected | Status |
|--------|----------|--------|
| score = -0.1 | null | PASS |
| score = 1.1 | null | PASS |
| score = 0.0 | accepted | PASS |
| score = 1.0 | accepted | PASS |

## TTL

| Attack | Expected | Status |
|--------|----------|--------|
| Already expired (negative ttl) | null | PASS |
| Short valid ttl (5s) | accepted | PASS |
| Default 120s | accepted | PASS |

## Baseline

| Test | Expected | Status |
|------|----------|--------|
| Valid token | accepted | PASS |
| Wrong secret | null | PASS |
| Tampered signature | null | PASS |
| Score = 5 (baseline) | null | PASS |

## Run locally
npm install
npm run build
node --test test/*.mjs

Expected output: `tests 20 / pass 20 / fail 0`.
