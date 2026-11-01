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
  setHeader?: (name: string, value: string) => void;
}

export type NextFunction = (err?: unknown) => void;

function readSecret(): string {
  const secret = getEnv('HTL_SECRET');
  if (!secret) throw new Error('HTL_SECRET manquant (getEnv)');
  return secret;
}

// Helper pour renvoyer une erreur standardisée (RFC 9457 - Problem Details)
function sendProblemDetails(
  res: MinimalResponse, 
  status: number, 
  title: string, 
  type: string, 
  detail: string
) {
  if (res.setHeader) {
    res.setHeader('Content-Type', 'application/problem+json');
  }
  res.statusCode = status;
  res.end(JSON.stringify({
    type: `https://htl-system.github.io/errors/${type}`,
    title,
    status,
    detail
  }));
}

export function trustMiddleware(req: TrustRequest, res: MinimalResponse, next: NextFunction): void {
  try {
    const raw = req.headers[TRUST_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;
    req.trust = token ? verifyTrustToken(token, readSecret()) : null;

    // IETF draft -01 : Si pas de signature, on demande poliment une signature
    if (!req.trust && res.setHeader) {
      res.setHeader('Accept-Signature', 'sig1=("@method" "target-uri")');
    }
  } catch {
    req.trust = null;
  }
  // Fail-open : on passe TOUJOURS à la suite
  next();
}

// NOTE : Ce middleware bloque la requête (401/403).
// À utiliser uniquement si c'est explicitement voulu.
export function requireTrust(threshold = 0.5) {
  return (req: TrustRequest, res: MinimalResponse, next: NextFunction) => {
    const score = req.trust?.score ?? 0;
    
    // Cas 1 : Token absent ou invalide
    if (!req.trust) {
      return sendProblemDetails(res, 401, 'Trust token missing or invalid', 'missing-token', 'The request requires a valid x-trust header.');
    }
    
    // Cas 2 : Score comportemental trop bas
    if (score < threshold) {
      return sendProblemDetails(res, 403, 'Trust score too low', 'insufficient-score', `The computed trust score (${score}) is below the required threshold (${threshold}).`);
    }
    
    next();
  };
}
