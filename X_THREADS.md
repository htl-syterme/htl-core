# X_THREADS.md — Build in Public

## THREAD 1 — A POSTER DEMAIN MATIN (pin sur profil)

Tweet 1/5:
We built X-Trust: an open standard proving a human
is behind an API request.

Not a CAPTCHA. Not KYC. A signed HTTP header.
Zero PII. Zero friction. $0.005/verification.

Here is why it exists and how it works. Thread.

---

Tweet 2/5:
The IETF Web Bot Auth Working Group (AWS, Cloudflare,
Google, Meta) ships cryptographic proof that a request
came from a known AI agent.

Their charter explicitly states:
Human verification is out of scope.

Verified agent does not equal human present.
That gap costs AI founders real money every month.

---

Tweet 3/5:
The two existing fixes both fail:

CAPTCHA — kills conversion 40 to 80 percent.
KYC — kills sign-up entirely.

There is no third option in the protocol stack.

So we built one.

---

Tweet 4/5:
X-Trust in 3 lines:

npm install @htl-syterme/htl-core

const { trusted } = await requireTrust(
  req, process.env.HTL_SECRET
)

HMAC-SHA256. Expires 120s. Self-hostable.
Annotate, never block.

Live counter:
pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

---

Tweet 5/5:
MIT. Open source. Solo founder. Tablette Android.

5 Founding Partner spots open:
30 days free (100k verifications) in exchange
for honest feedback and 1 testimonial.

OSS: github.com/htl-syterme/htl-core

Tear it apart.

---

## THREAD 2 — STATS QUOTIDIENNES (template)

Posting daily until first paying customer.

Day [N]:
- Verifications: [counter]
- GitHub stars: [N]
- Replies: [N]
- Frappes: [N]

Building X-Trust in public.
github.com/htl-syterme/htl-core

---

## REGLE POST X
- 1 thread par semaine
- 1 stat post par jour
- Repondre a TOUS les commentaires dans 30 min
- Jamais de lien en premier tweet (algorithme X)
