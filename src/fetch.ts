import { generateTrustToken, computeBehavioralScore } from './xtrust.js';

export interface TrustFetchInit extends RequestInit {
  trust?: {
    sub: string;
    signals?: Record<string, unknown>;
    ttlSeconds?: number;
  };
}

export async function trustFetch(input: string | URL, init: TrustFetchInit = {}): Promise<Response> {
  const { trust, headers, ...rest } = init;
  const outHeaders = new Headers(headers);
  const secret = process.env.HTL_SECRET ?? '';

  if (trust && secret) {
    // Fail-open: any error here must NEVER block the request.
    // Doctrine AIR: annotate, never block.
    try {
        const score = computeBehavioralScore(trust.signals ?? { sub: trust.sub });
        const token = await generateTrustToken({ sub: trust.sub, score }, secret, trust.ttlSeconds);
        outHeaders.set('x-trust', token);
    } catch { /* fail-open: proceed without header */ }
  }

  return fetch(input, { ...rest, headers: outHeaders });
}
