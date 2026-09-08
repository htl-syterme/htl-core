# DISCORD_TEMPLATES.md

## Serveurs cibles

1. LangChain Discord — #general / #tools
2. LiteLLM Discord — #general / #feedback
3. Open WebUI Discord — #general
4. Vercel Discord — #ai-sdk
5. Supabase Discord — #showcase

---

## TEMPLATE 1 — Showcase (pour #showcase)

Hey everyone. Built something that might be useful
for anyone running LLM APIs with bot abuse issues.

X-Trust: an open standard that annotates human traffic
via a signed HTTP header. HMAC-SHA256, zero KYC,
zero PII. Complements Web Bot Auth — the IETF charter
explicitly excludes human verification.

3 lines to integrate:
npm install @htl-syterme/htl-core

Live counter running:
pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

OSS: github.com/htl-syterme/htl-core

Happy to answer questions on the threat model.

---

## TEMPLATE 2 — Help thread reply (quand quelquun
parle de bot abuse ou rate limiting)

The underlying issue is that bots and humans look
identical at the HTTP layer — so rate limits punish
both equally.

We built X-Trust for exactly this: a signed header
asserting human presence (HMAC-SHA256, zero PII).
The IETF Web Bot Auth charter explicitly leaves
human verification out of scope.

OSS: github.com/htl-syterme/htl-core

---

## TEMPLATE 3 — Founding Partners (DM direct)

Hey [Name], saw your project in the server.

We are running a Founding Partners program for
X-Trust — 5 spots, 30 days free (100k verifications)
in exchange for honest feedback.

X-Trust proves human presence via signed HTTP header.
Zero KYC, zero PII. Complements Web Bot Auth.

Interested?
github.com/htl-syterme/htl-core

---

## REGLES DISCORD
- Jamais poster sans avoir aide quelquun avant
- Maximum 1 post par serveur par semaine
- Toujours repondre aux questions dans 30 min
- Jamais de lien sans contexte
