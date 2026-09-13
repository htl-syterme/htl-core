---
title: X-Trust: Human proof for AI APIs — the part Web Bot Auth leaves out
published: true
tags: webdev, ai, security, opensource
---

The IETF Web Bot Auth Working Group — backed by AWS,
Cloudflare, Google, and Meta — is shipping cryptographic
proof that a request came from a known AI agent.

Their charter explicitly states:

> End-user (human) authentication is out of scope.

Verified agent does not mean human present.

This is the gap that costs AI infrastructure founders
real money every month.

## The problem in numbers

One bot loop hitting a free LLM tier:
- 10,000 requests at $0.01/call = $100 burned
- Zero conversion value
- Invisible until the invoice arrives

The two existing fixes both fail:

**CAPTCHA / Turnstile** — adds friction, kills conversion
by 40 to 80 percent for real users.

**KYC (ID + credit card)** — kills sign-up rate entirely.

There is no third option in the protocol stack.
Until now.

## What X-Trust does

A signed HTTP header proving a human was behind the
request before it hits your LLM.

    X-Trust: v1.payloadB64.sigB64

- Zero KYC
- Zero PII
- HMAC-SHA256
- Expires 120 seconds
- Complements Web Bot Auth — not a replacement

## 3 lines of integration

    npm install @htl-syterme/htl-core

Server-side:

    import { requireTrust } from "@htl-syterme/htl-core";

    app.post("/chat", async (req, res) => {
      const { trusted, score } = await requireTrust(
        req, process.env.HTL_SECRET
      );
      res.json({ response: await callLLM(req.body.prompt), human_verified: trusted });
    });

Middleware:

    app.use(trustMiddleware({
      secret: process.env.HTL_SECRET,
      minScore: 0.5
    }));

## Why complements, not replaces

Web Bot Auth answers: which agent is calling?
X-Trust answers: is a human present?

These are different questions. Both matter.

## Live proof

    curl https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

No API key. Real verifications. Running now.

## Open source

MIT. Self-hostable. Zero vendor lock-in.

GitHub: https://github.com/htl-syterme/htl-core

5 Founding Partner spots open — 30 days free (100k
verifications) in exchange for honest feedback.

DM @htl_syterme on X or open an issue.

Tear it apart.
