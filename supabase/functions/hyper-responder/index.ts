import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trust'
};
const json = { ...cors, 'Content-Type': 'application/json' };

function b64urlToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verify(token: string, secret: string) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, payloadB64, sigB64] = parts;
  try {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, b64urlToBytes(sigB64), new TextEncoder().encode(payloadB64));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadB64)));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.score !== 'number' || payload.score < 0 || payload.score > 1) return null;
    if (now > payload.exp || now - payload.iat > 120) return null;
    return payload as { sub: string; score: number; iat: number; exp: number };
  } catch {
    return null;
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const secret = Deno.env.get('HTL_SECRET') ?? '';
      const token = req.headers.get('x-trust') ?? '';
      const payload = secret && token ? await verify(token, secret) : null;

      if (!payload) {
        return new Response(JSON.stringify({ recorded: false, trusted: false }), { headers: json });
      }

      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
      const signalHash = Array.from(new Uint8Array(digest).slice(0, 8))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { error } = await supabase
        .from('trust_events')
        .insert({ trust_score: payload.score, signal_hash: signalHash });
      if (error) {
        return new Response(JSON.stringify({ recorded: false, error: 'db' }), { status: 500, headers: json });
      }
      return new Response(JSON.stringify({ recorded: true, trusted: true, score: payload.score }), { headers: json });
    } catch {
      return new Response(JSON.stringify({ recorded: false, error: 'internal' }), { status: 500, headers: json });
    }
  }
};
