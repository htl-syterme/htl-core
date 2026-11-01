[![Spec](https://img.shields.io/badge/spec-HTL1.0-black)](./SPEC.md)
[![npm](https://img.shields.io/npm/v/@htl-systeme/htl-core?color=black)](https://www.npmjs.com/package/@htl-systeme/htl-core)
[![JSR](https://img.shields.io/badge/JSR-htl--core-black)](https://jsr.io/@htl-systeme/htl-core)
[![PyPI htl-verify](https://img.shields.io/pypi/v/htl-verify?color=black)](https://pypi.org/project/htl-verify/)
[![PyPI htl-sign](https://img.shields.io/pypi/v/htl-sign?color=black)](https://pypi.org/project/htl-sign/)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](./LICENSE)
[![Attacks tests](https://img.shields.io/badge/attacks%20tests-32-passing-brightgreen)](./ATTACKS.md)

# HTL - Human Trust Layer

> **Maintainer notice** — I will be off-grid for about 30 days from 2026-09-20 for personal reasons. X-Trust will continue running in autonomous mode: monitoring remains active, endpoints stay available, and signatures continue to be issued. Human support will be paused until I return. New issues will be acknowledged automatically and reviewed when I am back. If you need an independent deployment in the meantime, see `docs/self-host.md`.

**The open standard for signaling how human an API session looks.**

[![npm](https://img.shields.io/npm/v/@htl-systeme/htl-core)](https://www.npmjs.com/package/@htl-systeme/htl-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](./LICENSE)

---

## Try it live

No signup, no key, no install. One curl:

```bash
curl -si https://pixmqldaoszxbdxxfrrx.supabase.co/functions/v1/hyper-responder/demo | grep -i x-trust
```

You get back a real signed header:

```
X-Trust: v1.eyJzdWIiOiJkZW1vIiwiZXhwIjoxNz...<signature>
```

That is the entire product. A signed per-request score (0..1) that travels with the HTTP request. No CAPTCHA, no KYC, no PII, no blocking. Your backend reads it and decides.

Live counter (public): https://pixmqldaoszxbdxxfrrx.supabase.co/functions/v1/trust-counter

---

Specification

HTL/1.0 is a formal open specification — the human-presence complement to IETF Web Bot Auth.

· Read the HTL/1.0 spec
· Zero-dependency verifier — works on Cloudflare Workers, Deno, Bun, Node.js

Web Bot Auth proves which bot is calling. HTL/1.0 emits a signed score of how human a session behaves. These are orthogonal, composable protocols. 
Aligned with IETF draft-ietf-webbotauth-httpsig-protocol-01 (Signature-Agent, Accept-Signature).
Supports v1 (HMAC) and v2 (Ed25519).
RFC 9457 (Problem Details) for strict error handling.

The Problem

Web Bot Auth (AWS, Cloudflare, Google) proves which agent is calling your API.

The IETF charter explicitly states: human verification is out of scope.

Your infrastructure still cannot tell a real user from a bot farm without a CAPTCHA that kills conversion, or KYC that kills trust.

Bots burn your compute. KYC burns your users. X-Trust solves both.

---

The Solution: X-Trust

A signed HTTP header signaling how human a session looks, before it hits your LLM.

· Zero KYC — no ID, no credit card, no friction
· Zero PII — no personal data, GDPR-native
· Zero GAFAM — open standard, self-hostable
· 3 lines of code — integrate in minutes
· open source
· Complements Web Bot Auth — not a replacement

Philosophy: Annotate, never block.

---

Quick Start

```bash
npm install @htl-systeme/htl-core
```

```bash
pip install htl-verify   # verify tokens
pip install htl-sign     # sign tokens
```

Full examples: FastAPI · Express

Client-side

```javascript
import { trustFetch } from "@htl-systeme/htl-core";

// IETF draft -01: agentUrl sets the Signature-Agent header
await trustFetch("https://your-ai-api.com/chat", {
  method: "POST",
  body: JSON.stringify({ prompt: "Hello" }),
  trust: { sub: "user-123", signals: mySignals },
  agentUrl: "https://example.com/.well-known/http-message-signatures-directory"
});
```

Server-side (Fail-open)

```javascript
import { trustMiddleware } from "@htl-systeme/htl-core";
app.use(trustMiddleware);
```

Server-side (Strict - RFC 9457)

```javascript
import { requireTrust } from "@htl-systeme/htl-core";
app.post("/chat", requireTrust(0.5), async (req, res) => {
  // req.trust contains the verified score
});
```

---

How It Works

1. Client SDK measures human signals (keystroke timing, touch entropy) and generates a score 0 to 1
2. X-Trust token is signed (v1 HMAC-SHA256 or v2 Ed25519), expires in 120s, includes a jti nonce
3. Your server verifies the signature and annotates the request (fail-open)
4. You decide what to do with the annotation

No user data transmitted. No identity. No friction.

---

Security

· Tokens expire after 120 seconds
· v1: HMAC-SHA256 tamper-proof signatures
· v2: Ed25519 asymmetric signatures (JWKS)
· No user data transmitted
· Self-hostable, zero vendor lock-in

---

License

MIT — github.com/htl-systeme/htl-core

Built for AI infrastructure that refuses to choose between growth and security.
