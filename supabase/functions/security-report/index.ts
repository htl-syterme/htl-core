/**
 * security-report — sends the daily X-Trust security digest.
 * Protected by x-cron-secret. Only callable by the scheduled cron.
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

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const [eventsRes, rotationsRes, blacklistRes] = await Promise.all([
      sb.from('security_events').select('event_type, score, ip, created_at').gte('created_at', since),
      sb.from('secret_rotations').select('status, created_at').gte('created_at', since),
      sb.from('ip_blacklist').select('ip, reason, score').limit(10),
    ]);

    const events = eventsRes.data ?? [];
    const rotations = rotationsRes.data ?? [];
    const blacklist = blacklistRes.data ?? [];

    const total = events.length;
    const honeypots = events.filter((e) => e.event_type === 'honeypot').length;
    const replays = events.filter((e) => e.event_type === 'replay_nonce').length;
    const ratelimits = events.filter((e) => e.event_type === 'rate_limit').length;
    const rotationOk = rotations.filter((r) => r.status === 'success').length;

    const blacklistHtml =
      blacklist.length > 0
        ? blacklist.map((b) => `<li>${b.ip} — ${b.reason}</li>`).join('')
        : '<li>None</li>';

    const html = `
<h2>X-Trust — Daily Security Report</h2>
<p>Window: last 24h</p>
<ul>
  <li>Total events: <strong>${total}</strong></li>
  <li>Honeypot triggers: <strong>${honeypots}</strong></li>
  <li>Replay attacks blocked: <strong>${replays}</strong></li>
  <li>Rate limits hit: <strong>${ratelimits}</strong></li>
  <li>Secret rotations OK: <strong>${rotationOk}</strong></li>
</ul>
<h3>Active blacklist (top 10)</h3>
<ul>${blacklistHtml}</ul>
<p>System: <strong>OPERATIONAL</strong></p>
`;

    const resendKey = Deno.env.get('RESEND_KEY') ?? '';
    let emailSent = false;
    if (resendKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: 'diengamine.htl@gmail.com',
          subject: '[X-Trust] Daily Security Report',
          html,
        }),
      });
      emailSent = res.ok;
    }

    return new Response(
      JSON.stringify({ ok: true, total, honeypots, replays, ratelimits, rotationOk, emailSent }),
      { headers: json }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(err) }), {
      status: 500,
      headers: json,
    });
  }
});
