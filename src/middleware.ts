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
}

export type NextFunction = (err?: unknown) => void;

function readSecret(): string {
  const secret = getEnv('HTL_SECRET');
  if (!secret) throw new Error('HTL_SECRET manquant (getEnv)');
  return secret;
}

export function trustMiddleware(): (req: TrustRequest, _res: unknown, next: NextFunction) => void {
  return (req: TrustRequest, _res: unknown, next: NextFunction): void => {
    try {
      const raw = req.headers[TRUST_HEADER];
      const token = Array.isArray(raw) ? raw[0] : raw;
      req.trust = token ? verifyTrustToken(token, readSecret()) : null;
    } catch {
      req.trust = null;
    }
    next();
  };
}

export function requireTrust(threshold = 0.5): (req: TrustRequest, res: MinimalResponse, next: NextFunction) => void {
  return (req: TrustRequest, res: MinimalResponse, next: NextFunction): void => {
    const score = req.trust?.score ?? 0;
    if (!req.trust || score < threshold) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'trust_required' }));
      return;
    }
    next();
  };
}
