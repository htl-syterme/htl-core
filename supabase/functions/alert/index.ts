/**
 * alert - hourly bot-share threshold check.
 * Called by pg_cron with x-cron-secret. For each active key whose
 * 1h bot_share exceeds alert_threshold, POSTs a signed payload to
 * alert_url. Doctrine AIR: notify, never block.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const DB_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!cronSecret || provided.length !== cronSecret.length) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }
  let diff = 0;
  for (let i = 0; i < cronSecret.length; i++) {
    diff |= cronSecret.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  if (diff !== 0) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  const hmacSecret = Deno.env.get('HTL_SECRET') ?? '';

  const { data: keys } = await withTimeout(
    supabase
      .from('api_keys')
      .select('id, key_prefix, alert_url, alert_threshold, email')
      .eq('status', 'active')
      .not('alert_url', 'is', null),
    DB_TIMEOUT_MS
  );

  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  let fired = 0;

  for (const k of keys ?? []) {
    const { data: recent } = await withTimeout(
      supabase
        .from('trust_events')
        .select('trust_score')
        .eq('api_key_id', k.id)
        .gte('created_at', since),
      DB_TIMEOUT_MS
    );
    if (!recent || recent.length < 10) continue;
    const low = recent.filter((r: any) => Number(r.trust_score) <= 0.3).length;
    const share = low / recent.length;
    const threshold = Number(k.alert_threshold ?? 0.4);
    if (share <= threshold) continue;

    const payload = JSON.stringify({
      event: 'bot_share_threshold_exceeded',
      key_prefix: k.key_prefix,
      window: '1h',
      bot_share: Number(share.toFixed(4)),
      threshold,
      requests: recent.length,
      ts: new Date().toISOString(),
    });
    const sig = await hmacHex(hmacSecret, payload);
    try {
      await fetch(k.alert_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-HTL-Signature': 'sha256=' + sig,
        },
        body: payload,
      });
      fired++;
    } catch {
      // swallow, next hour will retry
    }
  }

  return new Response(JSON.stringify({ ok: true, fired }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
