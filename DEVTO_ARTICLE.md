# DEVTO_ARTICLE.md
# X-Trust: Human proof for AI APIs — the part Web Bot Auth leaves out

## Tags: webdev, ai, security, opensource

---

The IETF Web Bot Auth Working Group — backed by AWS, 
Cloudflare, Google, and Meta — is shipping cryptographic 
proof that a request came from a known AI agent.

Their charter explicitly states:

> End-user (human) authentication is out of scope.

Verified agent does not mean human present.

This is the gap that costs AI infrastructure founders 
real money every month.

---

## The problem in numbers

One bot loop hitting a free LLM tier:
- 10,000 requests at $0.01/call = $100 burned
- Zero conversion value
- Invisible until the invoice arrives

The two existing fixes both fail:

**CAPTCHA / Turnstile** — adds friction, kills conversion 
by 40 to 80 percent for real users.

**KYC (ID + credit card)** — kills sign-up rate entirely 
for privacy-conscious users and Web3 audiences.

There is no third option in the protocol stack.

Until now.

---

## What X-Trust does

X-Trust is an open standard that annotates human traffic 
via a signed HTTP header — before it hits your LLM.

The header looks like this:

    X-Trust: v1.payloadB64.sigB64

The payload contains:
- sub: anonymous session identifier
- score: human confidence 0 to 1
- iat: issued at timestamp
- exp: expiry (120 seconds)

The signature is HMAC-SHA256. Tamper-proof. Stateless.

---

## How it works

1. Client SDK measures keystroke timing variance and 
touch movement entropy
2. Generates a trust score between 0 and 1
3. Signs it with your shared secret (HMAC-SHA256)
4. Attaches it as HTTP header X-Trust to every request
5. Your server verifies the signature in microseconds

No user data leaves the device. No identity. No cookies.

---

## 3 lines of integration

Install:

    npm install @htl-syterme/htl-core

Server-side verification:

    import { requireTrust } from "@htl-syterme/htl-core";

    app.post("/chat", async (req, res) => {
      const { trusted, score } = await requireTrust(
        req,
        process.env.HTL_SECRET
      );
      const response = await callLLM(req.body.prompt);
      res.json({ response, human_verified: trusted });
    });

Middleware:

    app.use(trustMiddleware({
      secret: process.env.HTL_SECRET,
      minScore: 0.5
    }));

---

## Why complements, not replaces

Web Bot Auth answers: which agent is calling?
X-Trust answers: is a human present?

These are different questions. Both matter.

A signed Anthropic agent calling your API on behalf 
of a bot script is verified agent + no human.

A real user on Firefox with no agent is unverified 
agent + human present.

The IETF charter is explicit. X-Trust fills the gap.

---

## Live proof

The verification counter is public and live:

    curl https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

No API key. Real verifications. Running now.

---

## Open source

MIT license. Self-hostable. Zero vendor lock-in.

GitHub: https://github.com/htl-syterme/htl-core

Founding Partners program open: 5 startups get 
30 days free (100k verifications) in exchange for 
honest feedback and one testimonial.

DM @htl_syterme on X or open an issue.

---

Tear it apart.
