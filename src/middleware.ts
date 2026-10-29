import { verifyTrustToken, TrustPayload } from './xtrust.js';
import { getEnv } from './env.js';

export const TRUST_HEADER = 'x-trust';

export interface TrustRequest {
  headers: Record<string, string | string[] | undefined>;
  trust?: TrustPayload | null;
}

export interface MinimalResponse {
  statusCode: number;
  end: (body?: string) => unknown;
  // Ajout pour permettre l'injection du header IETF
  setHeader?: (name: string, value: string) => void;
}

export type NextFunction = (err?: unknown) => void;

function readSecret(): string {
  const secret = getEnv('HTL_SECRET');
  if (!secret) throw new Error('HTL_SECRET manquant (getEnv)');
  return secret;
}

export function trustMiddleware(req: TrustRequest, res: MinimalResponse, next: NextFunction): void {
  try {
    const raw = req.headers[TRUST_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;
    req.trust = token ? verifyTrustToken(token, readSecret()) : null;

    // IETF draft -01 : Si pas de signature, on demande poliment une signature
    // via le header Accept-Signature, sans bloquer la requête (doctrine AIR).
    if (!req.trust && res.setHeader) {
      res.setHeader('Accept-Signature', 'sig1=("@method" "target-uri")');
    }
  } catch {
    req.trust = null;
  }
  // Fail-open : on passe TOUJOURS à la suite
  next();
}

// NOTE : Ce middleware bloque la requête (401).
// À utiliser uniquement si c'est explicitement voulu, car la doctrine AIR
// est "Annoter, jamais bloquer".
export function requireTrust(threshold = 0.5) {
  return (req: TrustRequest, res: MinimalResponse, next: NextFunction) => {
    const score = req.trust?.score ?? 0;
    if (!req.trust || score < threshold) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'trust_required' }));
      return;
    }
    next();
  };
}
