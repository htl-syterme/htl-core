/**
 * hyper-responder - verifies an X-Trust HMAC-SHA256 header and records
 * the trust event. Public endpoint (Verify JWT = OFF).
 * Guards: CORS whitelist, rate limit per IP, nonce anti-replay, DB timeout.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_ORIGIN = 'https://htl-syterme.github.io';
const cors = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, x-trust',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = { ...cors, 'Content-Type': 'application/json' };

const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_S = 3600;
const DB_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 10240;

function b64urlToBytes(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function verify(
  token: string,
  secret: string
): Promise<{ sub: string; score: number; iat: number; exp: number; nonce?: string } | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const payloadB64 = parts[1];
  const sigB64 = parts[2];
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!ok) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.score !== 'number' || payload.score < 0 || payload.score > 1) return null;
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null;
    if (now > payload.exp || now - payload.iat > 120) return null;
    if (typeof payload.sub !== 'string' || payload.sub.length > 64) return null;
    return payload;
  } catch {
    return null;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: json });
  }

  const cl = parseInt(req.headers.get('content-length') || '0', 10);
  if (cl > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: 'payload_too_large' }), { status: 413, headers: json });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ip = (req.headers.get('x-forwarded-for') || '0.0.0.0').split(',')[0].trim();

  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_S * 1000).toISOString();
    const { count: recent } = await withTimeout(
      sb.from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_type', 'hyper_call')
        .eq('ip', ip)
        .gte('created_at', windowStart),
      DB_TIMEOUT_MS
    );

    if ((recent ?? 0) >= RATE_LIMIT_MAX) {
      await sb.from('security_events').insert({
        event_type: 'rate_limit',
        ip,
        path: '/hyper-responder',
        score: 50,
        details: { window: RATE_LIMIT_WINDOW_S, max: RATE_LIMIT_MAX },
      });
      return new Response(JSON.stringify({ error: 'rate_limit' }), { status: 429, headers: json });
    }

    const secret = Deno.env.get('HTL_SECRET') ?? '';
    const token = req.headers.get('x-trust') ?? '';
    const payload = secret && token ? await verify(token, secret) : null;

    try {
      await sb.from('security_events').insert({
        event_type: 'hyper_call',
        ip,
        path: '/hyper-responder',
        score: payload ? payload.score * 100 : 0,
        details: { trusted: !!payload },
      });
    } catch {
      // non-blocking
    }

    if (!payload) {
      return new Response(JSON.stringify({ recorded: false, trusted: false }), { headers: json });
    }

    if (payload.nonce) {
      const { error: nonceErr } = await sb
        .from('nonce_cache')
        .insert({ nonce: payload.nonce, expires_at: new Date(Date.now() + 120000).toISOString() });

      if (nonceErr) {
        await sb.from('security_events').insert({
          event_type: 'replay_nonce',
          ip,
          path: '/hyper-responder',
          score: 80,
          details: { nonce: payload.nonce },
        }).then(() => {}, () => {});
        return new Response(JSON.stringify({ error: 'replay' }), { status: 429, headers: json });
      }
    }

    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(JSON.stringify({ sub: payload.sub, score: payload.score }))
    );
    const signalHash = Array.from(new Uint8Array(digest).slice(0, 8))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { error: dbErr } = await withTimeout(
      sb.from('trust_events').insert({ trust_score: payload.score, signal_hash: signalHash }),
      DB_TIMEOUT_MS
    );

    if (dbErr) {
      return new Response(JSON.stringify({ recorded: false, error: 'db' }), { status: 500, headers: json });
    }

    return new Response(
      JSON.stringify({ recorded: true, trusted: true, score: payload.score }),
      { headers: json }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(err) }), {
      status: 500,
      headers: json,
    });
  }
});
