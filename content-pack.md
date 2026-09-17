# HTL — Content Pack (à poster au bon moment)

---

## 1. SHOW HN — à poster quand karma HN >= 5

**Titre :**
Show HN: X-Trust – a signed HTTP header scoring how human a session behaves

**Premier commentaire (à poster par toi immédiatement après le submit) :**

The honest threat model first, because I'd rather get it out of the way: the score is not a proof of humanity. A motivated client can fabricate the signals. What it is, is an economic signal — combined with a time-bounded cap (score ≤ 0.30 + 0.10 × floor(elapsed/15s)), a bot has to hold a session for ~90 seconds to reach 0.9. That's enough friction to make free-tier farming unprofitable on most AI products.

Context: the IETF Web Bot Auth charter explicitly declares end-user authentication out of scope. That's the right call — but it leaves a gap. Web Bot Auth proves *which agent* is calling. Nobody has solved the *human-is-present* problem without a CAPTCHA or KYC in the middle.

X-Trust is a per-request signed header. HMAC-SHA256, 120s TTL, JSON payload {sub, score, iat, exp, nonce}. Annotation-only: the receiving server decides what to do with the score, the header never blocks. Zero PII, zero KYC.

Live demo, no install:

    curl -si https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/hyper-responder/demo | grep -i x-trust

Code (MIT): github.com/htl-syterme/htl-core
Spec: HTL/1.0
Python verifier: `pip install htl-verify`

Solo founder, tablet-only dev environment for the record. Tear it apart — especially the threat model.

---

## 2. IETF MAILING LIST — à poster quand web-bot-auth@ietf.org subscription confirmée

**Sujet :** Implementation experience: signaling human-side behaviour alongside bot signatures

**Corps :**

Hi all,

The charter puts end-user authentication out of scope, which I think is correct. I've been running a small complementary experiment on the human side and wanted to share what came out of it, in case it's useful input for the BCP discussion.

Shape: a server-side component attaches a signed header (`X-Trust: v1.<payload>.<sig>`) carrying a 0..1 behavioural score with a 120s TTL. The score starts low and rises as the session shows interaction. Annotation only — the receiving origin decides what to do. No identity, no PII, no client-side challenge.

Things I learned that may matter for the BCP:

1. Mixed traffic on one IP is the norm on mobile (carrier NAT), so anything IP-based mis-scores real people.
2. Origins want a graded signal, not a bit. A binary "human / not human" gets ignored or worked around; a 0..1 score lets them set their own threshold.
3. A short TTL plus a server-issued nonce is enough to make replay uneconomic at this cost level.
4. Time-bounded score growth (`0.30 + 0.10 × floor(elapsed/15s)`) makes fabrication cost proportional to wall-clock time, which is a cheap lever.

Spec and reference verifier here: github.com/htl-syterme/htl-core/blob/main/SPEC.md

Feedback on the wire format welcome, especially from people who've deployed RFC 9421 verification at scale.

Amine Dieng

---

## 3. DISCORD — Hono / LiteLLM / LangChain

**Règle :** rejoindre, aider 2 personnes sur des questions techniques AVANT de mentionner X-Trust. Sinon, ban.

**Après avoir aidé 2 personnes, message possible :**

> Hey — small thing since I've been lurking here: I built X-Trust, a signed header that scores how human a session behaves, so you can annotate requests without blocking or CAPTCHA. It's annotation-only, HMAC-SHA256, no KYC, no PII. There's a Python verifier (`pip install htl-verify`) and a TS one on npm/JSR. If it's useful for anyone here hitting bot abuse on free tiers, ping me. Not selling anything — repo is MIT.

---

## 4. PR COMMENT — modèle générique

Utilisable pour répondre à un mainteneur qui demande un changement, ou relancer une PR sans harceler :

> Done — kept the callback opt-in as you asked, dropped the extra config key since metadata already carries it. One thing I'm not sure about: should a malformed header log at warning or debug? Went with debug to avoid noise but happy to flip it.

Une question précise. Zéro émoji. Concession si le mainteneur a raison, en une phrase, sans s'excuser.

---

## 5. COLD EMAIL — relance J+7 (si silence)

**Sujet :** closing the loop

**Corps :**

No reply is a fine answer. I'll stop here.

If bot traffic becomes a problem later, the repo will still be there: github.com/htl-syterme/htl-core

Good luck with the launch.

Amine

---

## RÈGLES DE PUBLICATION (à relire avant chaque post)

- Jamais de lien cliquable en premier tweet/message (algorithme X, Reddit mods).
- Style humain, première personne, imparfait toléré.
- Zéro bullet point creux dans le corps — chaque item doit contenir une info.
- Concède une faiblesse avant qu'on te la trouve (threat model, limites).
- Pas de "notre solution" / "notre entreprise" / "I hope this email finds you well".
- Signature : "Amine" seul.
