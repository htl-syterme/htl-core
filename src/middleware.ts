import { verifyTrustToken, verifyTrustTokenEd25519, TrustPayload } from './xtrust.js';
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

// AJOUT DE ASYNC ICI
export async function trustMiddleware(req: TrustRequest, res: MinimalResponse, next: NextFunction): Promise<void> {
  try {
    const raw = req.headers[TRUST_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;
    
    if (token) {
      if (token.startsWith('v2.')) {
        const pubKeyStr = getEnv('HTL_PUBLIC_JWK');
        if (pubKeyStr) {
          const pubKeyJwk = JSON.parse(pubKeyStr);
          // AJOUT DE AWAIT ICI
          req.trust = await verifyTrustTokenEd25519(token, pubKeyJwk);
        } else {
          req.trust = null;
        }
      } else {
        const secret = getEnv('HTL_SECRET');
        if (secret) {
          req.trust = verifyTrustToken(token, secret);
        } else {
          req.trust = null;
        }
      }
    } else {
      req.trust = null;
    }

    if (!req.trust && res.setHeader) {
      res.setHeader('Accept-Signature', 'sig1=("@method" "target-uri")');
    }
  } catch {
    req.trust = null;
  }
  
  next();
}

export function requireTrust(threshold = 0.5) {
  return (req: TrustRequest, res: MinimalResponse, next: NextFunction) => {
    const score = req.trust?.score ?? 0;
    
    if (!req.trust) {
      return sendProblemDetails(res, 401, 'Trust token missing or invalid', 'missing-token', 'The request requires a valid x-trust header.');
    }
    if (score < threshold) {
      return sendProblemDetails(res, 403, 'Trust score too low', 'insufficient-score', `The computed trust score (${score}) is below the required threshold (${threshold}).`);
    }
    next();
  };
}
