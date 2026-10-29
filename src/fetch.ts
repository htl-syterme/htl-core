import { generateTrustToken, computeBehavioralScore } from './xtrust.js';
import { getEnv } from './env.js';

export interface TrustFetchInit extends RequestInit {
  trust?: {
    sub: string;
    signals?: Record<string, unknown>;
    ttlSeconds?: number;
  };
  // Ajout pour le draft IETF -01
  agentUrl?: string; 
}

export async function trustFetch(input: string | URL, init: TrustFetchInit = {}): Promise<Response> {
  const { trust, agentUrl, headers, ...rest } = init;
  const outHeaders = new Headers(headers);

  // 1. Injection du Signature-Agent (IETF draft -01)
  const finalAgentUrl = agentUrl || getEnv('HTL_AGENT_URL');
  if (finalAgentUrl) {
    outHeaders.set('Signature-Agent', finalAgentUrl);
  }

  // 2. Gestion de la signature HTL (Fail-open)
  if (trust) {
    try {
      const secret = getEnv('HTL_SECRET');
      if (secret) {
        const score = computeBehavioralScore(trust.signals ?? { sub: trust.sub });
        const token = await generateTrustToken({ sub: trust.sub, score }, secret, trust.ttlSeconds);
        outHeaders.set('x-trust', token);
      }
    } catch {
      // Fail-open: proceed without header
    }
  }

  return fetch(input, { ...rest, headers: outHeaders });
}
