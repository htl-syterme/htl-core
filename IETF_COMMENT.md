# IETF_COMMENT.md

## Comment pour webbotauth Working Group

URL: datatracker.ietf.org/wg/webbotauth/about/

---

Subject: Complementary proposal — human-presence
attestation as out-of-scope companion to Web Bot Auth

Dear Working Group,

The Web Bot Auth charter correctly identifies that
end-user (human) authentication is out of scope.

We believe this creates a gap that operators need
to fill at the protocol level, not the application
level.

Proposal: X-Trust, a complementary signed header
attesting human presence.

Format: v1.payloadB64.sigB64
Algorithm: HMAC-SHA256
TTL: 120 seconds
PII: zero
KYC: zero

The signal is not identity. It is presence.
The server annotates, never blocks.

This is explicitly designed to sit alongside
Web Bot Auth, not replace it:

- Web Bot Auth answers: which agent is calling?
- X-Trust answers: is a human present?

These are orthogonal questions. Both matter for
AI infrastructure operators.

Reference implementation (MIT):
github.com/htl-syterme/htl-core

Live deployment:
pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

We welcome technical feedback on the threat model,
replay attack surface, and token format.

---

## Mailing list target
ietf-http-wg@w3.org
webbotauth@ietf.org

## Quand envoyer
Apres Show HN (credibilite stars necessaire)
Minimum 100 stars avant envoi
