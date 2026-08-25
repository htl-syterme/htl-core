import crypto from 'node:crypto';

export interface TrustPayload {
  sub: string;
  score: number;
  iat: number;
  exp: number;
}

const ALGORITHM = 'sha256';
const VERSION = 'v1';

function b64urlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function b64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function generateTrustToken(
  payload: Omit<TrustPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds = 60
): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const fullPayload: TrustPayload = { ...payload, iat, exp };

  const payloadB64 = b64urlEncode(JSON.stringify(fullPayload));
  const signature = crypto.createHmac(ALGORITHM, secret).update(payloadB64).digest('base64url');

  return `${VERSION}.${payloadB64}.${signature}`;
}

export function verifyTrustToken(token: string, secret: string, maxAgeSeconds = 120): TrustPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) return null;

  const [, payloadB64, signature] = parts;
  const expectedSig = crypto.createHmac(ALGORITHM, secret).update(payloadB64).digest('base64url');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
  } catch {
    return null;
  }

  try {
    const payload: TrustPayload = JSON.parse(b64urlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);

    if (now > payload.exp) return null;
    if (now - payload.iat > maxAgeSeconds) return null;
    if (payload.score < 0 || payload.score > 1) return null;

    return payload;
  } catch {
    return null;
  }
}

export function computeBehavioralScore(signals: Record<string, unknown>): number {
  const hash = crypto.createHash('sha256').update(JSON.stringify(signals)).digest('hex');
  const num = parseInt(hash.substring(0, 8), 16);
  return Number((num / 0xFFFFFFFF).toFixed(4));
}
