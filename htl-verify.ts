/**
 * htl-verify — Zero-dependency X-Trust verifier
 * Cloudflare Workers, Deno, Bun, Node.js, browsers
 * No network call. Pure WebCrypto. MIT License.
 */

export interface TrustPayload {
  sub: string;
  score: number;
  iat: number;
  exp: number;
}

export interface TrustResult {
  trusted: boolean;
  score: number;
  fresh: number;
  payload: TrustPayload | null;
}

function b64urlToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export async function verify(
  token: string,
  secret: string,
  minScore = 0
): Promise<TrustResult> {
  const FAIL: TrustResult = { trusted: false, score: 0, fresh: 0, payload: null };
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "v1") return FAIL;
    const [, payloadB64, sigB64] = parts;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC", key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return FAIL;
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payloadB64))
    ) as TrustPayload;
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) return FAIL;
    if (now - payload.iat > 120) return FAIL;
    if (typeof payload.score !== "number") return FAIL;
    if (payload.score < 0 || payload.score > 1) return FAIL;
    const ttl = payload.exp - payload.iat;
    const age = now - payload.iat;
    const fresh = Math.max(0, 1 - age / ttl);
    return {
      trusted: payload.score >= minScore,
      score: payload.score,
      fresh,
      payload,
    };
  } catch {
    return FAIL;
  }
}

/** Combined presence score = human signal × freshness decay */
export function presenceScore(payload: TrustPayload): number {
  const now = Math.floor(Date.now() / 1000);
  const ttl = payload.exp - payload.iat;
  const age = now - payload.iat;
  const fresh = Math.max(0, 1 - age / ttl);
  return payload.score * fresh;
    }
