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
  // Vrais signaux comportementaux : keystroke timing + touch entropy.
  // Score 0..1 base sur la variance des intervalles (coefficient de variation).
  // Un humain est irregulier (CV eleve), un bot est regulier (CV proche de 0).
  const toArr = (v: unknown): number[] => Array.isArray(v) ? v.filter(x => typeof x === 'number') : [];
  const keystrokes = toArr(signals.keystrokes);
  const touches = toArr(signals.touches);
  const mouseMoves = toArr(signals.mouseMoves);

  const totalSignals = keystrokes.length + touches.length + mouseMoves.length;
  if (totalSignals < 5) return 0.1;

  const cv = (arr: number[]): number => {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (mean === 0) return 0;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
    return Math.sqrt(variance) / mean;
  };

  const cvKeys = cv(keystrokes);
  const cvTouches = cv(touches);
  const cvMoves = cv(mouseMoves);

  const weighted = cvKeys * 0.5 + cvTouches * 0.3 + cvMoves * 0.2;
  const score = Math.min(1, Math.max(0, weighted * 2));

  const confidenceBonus = Math.min(0.2, totalSignals / 500);

  return Number(Math.min(1, score + confidenceBonus).toFixed(4));
}
