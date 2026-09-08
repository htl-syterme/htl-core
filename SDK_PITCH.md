# SDK_PITCH.md — Pitches mainteneurs

## LITELLM — Issue/PR pitch

Title: Add X-Trust human-presence header support

Hi,

LiteLLM routes requests between providers but has no way
to distinguish human-initiated requests from agent loops
at the HTTP layer.

X-Trust fills that gap: a signed header (HMAC-SHA256)
attesting human presence. Zero PII. Zero KYC.
Complements Web Bot Auth — the IETF charter explicitly
excludes human verification.

Integration would be ~30 lines:

    from htl_core import require_trust

    @router.post("/chat")
    async def chat(request: Request):
        trusted = await require_trust(
            request, os.environ["HTL_SECRET"]
        )
        # route differently based on trusted.score

OSS: github.com/htl-syterme/htl-core
Live counter: pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter

Happy to open the PR myself.

---

## VERCEL AI SDK — Issue pitch

Title: Human-presence attestation via X-Trust header

The Vercel AI SDK handles agent-to-LLM routing but
the IETF Web Bot Auth charter explicitly excludes
human verification — leaving "is a human present"
unanswered at the protocol level.

X-Trust adds that signal: signed HTTP header,
HMAC-SHA256, expires 120s, zero PII.

    import { requireTrust } from "@htl-syterme/htl-core";

    export async function POST(req: Request) {
      const { trusted, score } = await requireTrust(
        req, process.env.HTL_SECRET
      );
      // annotate, never block
    }

Would love feedback on the integration approach.
OSS: github.com/htl-syterme/htl-core

---

## LANGCHAIN — Issue pitch

Title: Human verification middleware for LLM chains

LangChain chains have no native signal for whether
a human initiated the chain or an agent is looping.

X-Trust provides that signal at the HTTP layer:
HMAC-SHA256 signed header, zero PII, zero KYC.
The IETF explicitly scopes human verification out
of Web Bot Auth — X-Trust fills that gap.

OSS: github.com/htl-syterme/htl-core
Happy to contribute the integration.

---

## OPEN-WEBUI — Issue pitch

Title: Add X-Trust header support for human vs agent routing

Open WebUI serves both humans and automated scripts
on the same endpoints with no protocol-level distinction.

X-Trust would let Open WebUI annotate human sessions
differently from agent sessions — zero KYC, zero PII,
3 lines of middleware.

OSS: github.com/htl-syterme/htl-core
