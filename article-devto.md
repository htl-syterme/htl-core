# What Web Bot Auth deliberately leaves out

*Or: why your API doesn't need to know WHO is calling, it needs to know whether a HUMAN is behind the call.*

There's a moment in every standards conversation when someone opens the scope question. The IETF Web Bot Auth working group just published their charter draft. Reading it carefully, one line stands out: **end-user authentication is explicitly out of scope**.

That's not a bug. It's a design choice, and I think it's the right one. Web Bot Auth answers *which agent* is calling — Cloudflare, AWS, Google all now ship cryptographic proof a request came from ChatGPT, Operator, or an equivalent. That's useful, and it's necessary.

But it leaves a gap that grows every month.

## The gap

An agent can be legitimate and still not represent a consenting human. A crawler can be cryptographically authentic and still burn your compute budget. An "authenticated" ChatGPT request is not the same thing as a person who typed something at 9pm on their phone.

Web Bot Auth solves the identity-of-agent problem. Nobody has solved the identity-of-user-present problem in a way that's frictionless. The current answers are all some flavor of CAPTCHA or KYC:

- **Cloudflare Turnstile, hCaptcha, reCAPTCHA** — a widget that interrupts the session.
- **KYC / ID verification** — worse: it kills conversion, especially on free tiers.
- **Rate limiting by IP** — broken on mobile, where a single carrier NAT shares thousands of users.

All three treat human verification as a checkpoint. None of them treat it as a *continuous signal*.

## A different shape

The idea I've been building around is simple: **attach a signed behavioural score to each request, and let the receiving origin decide what to do with it.**

Format: a single HTTP header, `X-Trust`, carrying a versioned, HMAC-SHA256-signed payload:

    X-Trust: v1.eyJzdWIiOiJ1c2VyLTEiLCJzY29yZSI6MC44OCwiaWF0IjoxNzc4NDU5MjU2LCJleHAiOjE3Nzg0NTkzNzZ9.<sig>

The payload is JSON: `{sub, score, iat, exp, nonce}`. The score is a float between 0 and 1, computed client-side from signals the browser already exposes — keystroke timing variance, scroll gaps, touch entropy. It starts at 0.30 the moment the page loads and rises as the session shows interaction. It expires after 120 seconds. It travels with the request as a normal header.

The receiving server can do anything with it. The reference implementations I've built annotate the request and pass it through unchanged. There's no block, no widget, no redirect, no signup interruption.

Three lines of code on the client:

    import { trustFetch } from '@htl-syterme/htl-core';
    const myFetch = trustFetch(process.env.HTL_SECRET);
    await myFetch('https://my-api.com/chat', { method: 'POST', body });

Three lines on the server:

    import { requireTrust } from '@htl-syterme/htl-core';
    const { trusted, score } = await requireTrust(req, process.env.HTL_SECRET);
    if (!trusted) return res.status(403).end();

## What this is not

It is not proof of humanity. A determined client can fabricate the signals. I've documented that in the spec's Threat Model section, because pretending otherwise would be dishonest.

What it *is*, is an economic signal that raises the cost of automated abuse. Combined with a time-bounded score cap — `0.30 + 0.10 * floor(elapsed / 15s)` — a bot has to hold a connection for 90 seconds to reach 0.9. That's enough friction to make free-tier farming unprofitable on most AI products.

## Try it

    curl -si https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/hyper-responder/demo | grep -i x-trust

You get back a real signed header. No signup, no key, no install.

The spec, the reference verifier (zero dependencies, standard library only), and the Python package are all at [github.com/htl-syterme/htl-core](https://github.com/htl-syterme/htl-core).

## Why now

The Web Bot Auth draft is in active discussion. The mailing list is public. The timing is such that the *human-side* answer can be designed alongside the agent-side answer, instead of bolted on two years later as a commercial black box.

If you're building an AI product where free-tier abuse is a real line item on your cloud bill, this is worth ten minutes of your attention. If you're not, feel free to ignore — the entire thing is annotation-only, which means it costs you nothing to leave off.

That's the point.

---

*Feedback on the wire format welcome — especially from anyone who has deployed RFC 9421 signature verification at scale. Amine.*
