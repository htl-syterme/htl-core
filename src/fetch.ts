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
    const score = computeBehavioralScore(trust.signals ?? { sub: trust.sub });
    const token = generateTrustToken({ sub: trust.sub, score }, secret, trust.ttlSeconds);
    outHeaders.set('x-trust', token);
  }

  return fetch(input, { ...rest, headers: outHeaders });
}
