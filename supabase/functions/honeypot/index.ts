/**
 * honeypot — traps scanners probing for common sensitive paths.
 * Logs the hit, blacklists the IP for 7 days, alerts by email, returns 404.
 * Never returns fake credentials — a real dev must never mistake them for keys.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_ORIGIN = 'https://htl-syterme.github.io';
const cors = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = { ...cors, 'Content-Type': 'application/json' };

/** Paths that only a scanner would hit. */
const TRAPS = [
  '/admin', '/api/v1/secret-keys', '/debug/config',
  '/wp-login.php', '/.env', '/htl-core/internal',
  '/api/keys', '/config', '/.git',
];

const BLACKLIST_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const ip = (req.headers.get('x-forwarded-for') || '0.0.0.0').split(',')[0].trim();
  const path = new URL(req.url).pathname;
  const ua = req.headers.get('user-agent') || '';

  const isTrapped = TRAPS.some((t) => path.includes(t));

  if (!isTrapped) {
    return new Response(JSON.stringify({ ok: true }), { headers: json });
  }

  try {
    // 1. Record the event
    await sb.from('security_events').insert({
      event_type: 'honeypot',
      ip,
      path,
      user_agent: ua,
      score: 100,
      details: { trap: path },
    });

    // 2. Blacklist the IP
    await sb.from('ip_blacklist').upsert({
      ip,
      reason: 'honeypot_triggered',
      score: 100,
      expires_at: new Date(Date.now() + BLACKLIST_DAYS * 24 * 3600 * 1000).toISOString(),
    });

    // 3. Alert by email (non-blocking on failure)
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
          subject: '[X-Trust ALERT] Honeypot triggered by ' + ip,
          html: `<p><strong>IP:</strong> ${ip}</p><p><strong>Path:</strong> ${path}</p><p><strong>User-Agent:</strong> ${ua}</p>`,
        }),
      });
    }
  } catch (err) {
    console.warn('[honeypot] log/alert failed:', err);
  }

  // Random delay: makes automated probing slower and less predictable
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));

  // Honest 404 — no fake credentials
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: json,
  });
});
