[![Spec](https://img.shields.io/badge/spec-HTL1.0-black)](./SPEC.md)
[![npm](https://img.shields.io/npm/v/@htl-syterme/htl-core?color=black)](https://www.npmjs.com/package/@htl-syterme/htl-core)
[![JSR](https://img.shields.io/badge/JSR-htl--core-black)](https://jsr.io/@htl-syterme/htl-core)
[![PyPI](https://img.shields.io/pypi/v/htl-verify?color=black)](https://pypi.org/project/htl-verify)
[![License: MIT](https://img.shields.io/badge/license-MIT-white.svg)](./LICENSE)

# HTL - Human Trust Layer

**The open standard for signaling how human an API session looks.**

[

![npm](https://img.shields.io/npm/v/@htl-syterme/htl-core)

](https://www.npmjs.com/package/@htl-syterme/htl-core)
[

![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)

](LICENSE)

---



## Try it live

No signup, no key, no install. One curl:

```bash
curl -si https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/hyper-responder/demo | grep -i x-trust
```

You get back a real signed header:

```
X-Trust: v1.eyJzdWIiOiJkZW1vIiwic2NvcmUiOjAuNDIsImlhdCI6MTc3ODQ1OTI1NiwiZXhwIjoxNzc4NDU5Mzc2LCJub25jZSI6ImUxYjRjYTI3LWQ0YmQtNDZmNi1hOTVhLWQ4YTNmMzI1MmIzMiJ9.<sig>
```

That is the entire product. A signed per-request score (0..1) that travels with the HTTP request. No CAPTCHA, no KYC, no PII, no blocking. Your backend reads it and decides.

Live counter (public): https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter


## Specification

HTL/1.0 is a formal open specification — the human-presence complement to IETF Web Bot Auth.

- [Read the HTL/1.0 spec](./SPEC.md)
- [Zero-dependency verifier](./htl-verify.ts) — works on Cloudflare Workers, Deno, Bun, Node.js

> Web Bot Auth proves *which bot* is calling. HTL/1.0 emits a signed score of *how human a session behaves*. These are orthogonal, composable protocols. These are orthogonal protocols designed to compose.

## The Problem

Web Bot Auth (AWS, Cloudflare, Google) proves which agent is calling your API.

The IETF charter explicitly states: **human verification is out of scope.**

Your infrastructure still cannot tell a real user from a bot farm without a CAPTCHA that kills conversion, or KYC that kills trust.

**Bots burn your compute. KYC burns your users. X-Trust solves both.**

---

## The Solution: X-Trust

A signed HTTP header proving a human was behind the request before it hits your LLM.

- Zero KYC — no ID, no credit card, no friction
- Zero PII — no personal data, GDPR-native
- Zero GAFAM — open standard, self-hostable
- 3 lines of code — integrate in minutes
- $0.005/verification — cheaper than one wasted LLM call
- Complements Web Bot Auth — not a replacement

**Philosophy: Annotate, never block.**

---

## Quick Start

    npm install @htl-syterme/htl-core
```bash
pip install htl-verify

> **Full examples:** [FastAPI](docs/examples/fastapi_x_trust.py) · [Express](docs/examples/express_x_trust.js)

```
# or via JSR (Deno/Node)
deno add jsr:@htl-syterme/htl-core

### Client-side

    import { trustFetch } from "@htl-syterme/htl-core";
    const fetch = trustFetch(process.env.HTL_SECRET);
    await fetch("https://your-ai-api.com/chat", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" })
    });

### Server-side

    import { requireTrust } from "@htl-syterme/htl-core";
    app.post("/chat", async (req, res) => {
      const { trusted, score } = await requireTrust(req, process.env.HTL_SECRET);
      const response = await callLLM(req.body.prompt);
      res.json({ response, human_verified: trusted });
    });

### Middleware

    import { trustMiddleware } from "@htl-syterme/htl-core";
    app.use(trustMiddleware({ secret: process.env.HTL_SECRET, minScore: 0.5 }));

---

## How It Works

1. Client SDK measures human signals (keystroke timing, touch entropy) and generates a score 0 to 1
2. X-Trust token is HMAC-SHA256 signed, expires in 120s
3. Your server verifies the signature and annotates the request
4. You decide what to do with the annotation

No user data transmitted. No identity. No friction.

---

## Live Proof

    curl https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

Returns total live verifications. No API key needed.

---

## Pricing

| Plan | Verifications | Price |
|------|--------------|-------|
| Starter | 1,000 | $5 |
| Growth | 10,000 | $50 |
| Scale | 100,000 | $500 |

Pay once. No subscription. Crypto accepted.

Get your API key: https://htl-syterme.github.io/htl-core

---

## Founding Partners

We are selecting 5 AI infrastructure startups to integrate X-Trust before public scale.

You get: 30 days free (100k verifications) + direct founder support.
We get: Your honest feedback + 1 testimonial.

Open an issue or DM @htl_syterme on X.

---

## Why Now

The IETF Web Bot Auth Working Group (AWS, Cloudflare, Google, Meta) ships agent identity. Their charter explicitly excludes human verification.

**X-Trust is the other half.**

---

## Security

- Tokens expire after 120 seconds
- HMAC-SHA256 tamper-proof signatures
- No user data transmitted
- Self-hostable, zero vendor lock-in

---

## License

MIT — github.com/htl-syterme/htl-core

Built for AI infrastructure that refuses to choose between growth and security.

## Why Continuous, Not One-Time

| | Cloudflare Turnstile | X-Trust |
|---|---|---|
| Verification | Once at entry | Every request |
| Friction | Widget + wait | Zero |
| Scope | Browser legitimacy | Human presence |
| Standard | Proprietary | Open (IETF gap) |

X-Trust annotates every HTTP request individually.
120s TTL = automatic continuous re-attestation.
No checkpoint. No gate. Just proof, per request.
