# Changelog

All notable changes to HTL / X-Trust are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions use [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Per-tenant signing keys table (`signing_keys`) with `kid` claim in the payload. Legacy `v1` key falls back to `HTL_SECRET`.
- Time-bounded score growth: `score ≤ 0.30 + 0.10 × floor(elapsed_seconds / 15)`. Makes fabrication cost proportional to wall-clock time.
- Python verifier `htl-verify`, standard library only, published at `python/htl_verify/`.
- Shadow Report endpoint (`report`): weekly aggregation of a key's traffic, with `bot_share` field. Dashboard lookup form on `docs/index.html`.
- Hourly bot-share webhook (`alert`): fires a signed POST to a per-key `alert_url` when `bot_share` exceeds `alert_threshold`.
- `SECURITY.md` with 72h acknowledgment commitment.
- GitHub Actions release workflow with npm provenance and JSR publish.
- `report`, `alert` Edge Functions deployed with CORS whitelist, timing-safe compare, and DB timeouts.

### Changed
- API keys are now stored as SHA-256 hashes (`api_keys.key_hash` + `key_prefix`) instead of plaintext. A full database leak no longer exposes customer keys.
- Rate limit moved from per-IP to per-API-key, keyed by `key_prefix`. The IP-based limiter is retained as a secondary signal only.
- Honeypot ban window reduced from 7 days to 1 hour.
- Honeypot skips browser-initiated requests (`sec-fetch-dest` present) to avoid banning real users who land on a trap via `<img src="...">`.
- Pitch framing: replaced "proves your users are human" with "a signed, per-request score of how human a session behaves". The previous framing was technically wrong and killed credibility with security engineers.

### Fixed
- Nonce race: replaced check-then-insert with a unique index on `nonce_cache(nonce)` plus insert-first. Two concurrent requests with the same nonce can no longer both pass.
- `quick-task` referenced `api.respond.com` (typo) instead of `api.resend.com`.
- `quick-task` used `Deno.saveasync` instead of `Deno.serve(async`.
- `quick-task` email HTML contained a stray backtick-tag (`ch2>` instead of `<h2>`).
- Supabase project id typo across 8 files (`pixmqidaoszbxdbxffrxx` → `pixmqidaoszxbdxffrxx`).

### Security
- `honeypot` no longer returns fake API keys — returns an honest 404.
- `security-report` requires `x-cron-secret` (timing-safe).
- CORS whitelist on all Edge Functions: `https://htl-syterme.github.io`. No more `*`.
- `CRON_SECRET` and `PADDLE_WEBHOOK_SECRET` compared in constant time.

## [1.0.0] — 2026-08-28

### Added
- Initial release: X-Trust wire format, HMAC-SHA256, TTL 120s.
- TypeScript SDK `@htl-syterme/htl-core` on npm and JSR.
- Backend: `hyper-responder`, `trust-counter`, `quick-task`.
- Paddle integration: 3 price tiers, webhook handler, API key delivery by email.
- Dashboard, spec (`SPEC.md`), and three legal pages (terms, privacy, refund).
