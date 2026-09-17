/**
 * rotate-htl-secret — rotates the X-Trust HMAC signing secret on schedule.
 * Protected by x-cron-secret. Dual-secret with 2h overlap for zero downtime.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_ORIGIN = 'https://htl-syterme.github.io';
const cors = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = { ...cors, 'Content-Type': 'application/json' };

/** Constant-time string compare — avoids timing leaks on the cron secret. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Generate 32 random bytes as a hex string. */
function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: json });
  }

  const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
  const provided = req.headers.get('x-cron-secret') ?? '';
  if (!cronSecret || !provided || !timingSafeEqual(provided, cronSecret)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: json });
  }

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: current } = await sb.rpc('read_secret', { secret_name: 'htl_secret_current' });

    const newSecret = generateSecret();
    const newVersion = 'v' + Date.now();

    // Shift current → previous (2h overlap window)
    if (current) {
      await sb.rpc('upsert_secret', {
        secret_name: 'htl_secret_previous',
        secret_value: current,
        secret_desc: 'Previous HTL secret — 2h overlap',
      });
    }

    // Install new current
    await sb.rpc('upsert_secret', {
      secret_name: 'htl_secret_current',
      secret_value: newSecret,
      secret_desc: 'Current HTL secret ' + newVersion,
    });

    // Log rotation
    await sb.from('secret_rotations').insert({
      secret_name: 'htl_secret',
      version: newVersion,
      status: 'success',
      details: { overlap_hours: 2 },
    });

    // Notify by email (non-blocking on failure)
    const resendKey = Deno.env.get('RESEND_KEY') ?? '';
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: 'diengamine.htl@gmail.com',
          subject: '[X-Trust] Secret rotated OK ' + newVersion,
          html: `<p>Secret rotated successfully.</p><p>Version: <code>${newVersion}</code></p>`,
        }),
      });
    }

    return new Response(JSON.stringify({ ok: true, version: newVersion }), { headers: json });
  } catch (err) {
    await sb.from('secret_rotations').insert({
      secret_name: 'htl_secret',
      version: 'failed',
      status: 'failed',
      details: { error: String(err) },
    });

    return new Response(JSON.stringify({ error: 'internal', detail: String(err) }), {
      status: 500,
      headers: json,
    });
  }
});
