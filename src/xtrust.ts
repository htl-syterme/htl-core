import crypto from 'node:crypto';

export interface TrustPayload {
  sub: string;
  score: number;
  iat: number;
  exp: number;
  kid: string;
  jti?: string;
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
  payload: Omit<TrustPayload, 'iat' | 'exp' | 'kid'>,
  secret: string,
  ttlSeconds = 120,
  kid = 'v1'
): string {
  if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    throw new Error(
      'HTL: generateTrustToken is server-only. Never expose HTL_SECRET to a browser.'
    );
  }
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const jti = crypto.randomBytes(16).toString('base64url');
  const fullPayload: TrustPayload = { ...payload, iat, exp, kid, jti };

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

// ---------------------------------------------------------------------------
// Ed25519 (v2) - asymetric signatures. Migration path from HMAC (v1).
// Uses Web Crypto, available on Node 18+, Deno, Bun, Cloudflare Workers,
// and browser.
// ---------------------------------------------------------------------------

const VERSION_V2 = 'v2';
const ED25519_ALG = { name: 'Ed25519' } as const;

function bytesToB64url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export interface Ed25519KeyPair {
  publicKeyHex: string;
  privateKeyJwk: JsonWebKey;
  publicKeyJwk: JsonWebKey;
}

export async function generateEd25519KeyPair(): Promise<Ed25519KeyPair> {
  const pair = (await crypto.subtle.generateKey(ED25519_ALG, true, ['sign', 'verify'])) as CryptoKeyPair;
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const rawPub = await crypto.subtle.exportKey('raw', pair.publicKey);
  const publicKeyHex = Array.from(new Uint8Array(rawPub))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { publicKeyHex, privateKeyJwk, publicKeyJwk };
}

export async function generateTrustTokenEd25519(
  payload: Omit<TrustPayload, 'iat' | 'exp' | 'kid'>,
  privateKeyJwk: JsonWebKey,
  ttlSeconds = 120,
  kid = 'v2'
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const jtiBytes = new Uint8Array(16);
  crypto.getRandomValues(jtiBytes);
  const jti = bytesToB64url(jtiBytes);
  const fullPayload: TrustPayload = { ...payload, iat, exp, kid, jti };

  const payloadB64 = bytesToB64url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const key = await crypto.subtle.importKey('jwk', privateKeyJwk, ED25519_ALG, false, ['sign']);
  const sigBuf = await crypto.subtle.sign(ED25519_ALG, key, new TextEncoder().encode(payloadB64));
  const sigB64 = bytesToB64url(new Uint8Array(sigBuf));

  return `${VERSION_V2}.${payloadB64}.${sigB64}`;
}

export async function verifyTrustTokenEd25519(
  token: string,
  publicKeyJwk: JsonWebKey,
  maxAgeSeconds = 120
): Promise<TrustPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION_V2) return null;

  const [, payloadB64, sigB64] = parts;

  try {
    const key = await crypto.subtle.importKey('jwk', publicKeyJwk, ED25519_ALG, false, ['verify']);
    const sigBytes = b64urlToBytes(sigB64);
    const ok = await crypto.subtle.verify(
      ED25519_ALG,
      key,
      sigBytes as unknown as ArrayBuffer,
      new TextEncoder().encode(payloadB64) as unknown as ArrayBuffer
    );
    if (!ok) return null;

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
