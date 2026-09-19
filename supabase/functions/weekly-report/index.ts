import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': 'https://htl-syterme.github.io',
  'Access-Control-Allow-Headers': 'content-type, x-cron-secret'
};
const json = { ...cors, 'Content-Type': 'application/json' };

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
      const provided = req.headers.get('x-cron-secret') ?? '';
      if (!cronSecret || !timingSafeEqual(cronSecret, provided)) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: json });
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('trust_events')
        .select('trust_score, created_at')
        .gte('created_at', since);
      if (error) {
        return new Response(JSON.stringify({ error: 'db' }), { status: 500, headers: json });
      }
      const total = data?.length ?? 0;
      const avg = total > 0 ? data!.reduce((s, r) => s + (r.trust_score ?? 0), 0) / total : 0;
      const resendKey = Deno.env.get('RESEND_KEY') ?? '';
      const html = '<h2>HTL Weekly Report</h2>'
        + '<p>Period: last 7 days</p>'
        + '<table border="1" cellpadding="6" style="border-collapse:collapse">'
        + '<tr><td>Verifications</td><td>' + total + '</td></tr>'
        + '<tr><td>Average score</td><td>' + avg.toFixed(3) + '</td></tr>'
        + '</table>'
        + '<p><a href="https://htl-syterme.github.io/htl-core">Dashboard</a></p>';
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
          to: 'diengamine.htl@gmail.com',
          subject: 'HTL Weekly Report - ' + total + ' verifications',
          html: html
        })
      });
      return new Response(JSON.stringify({ ok: true, total, avg: Number(avg.toFixed(3)) }), { headers: json });
    } catch {
      return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: json });
    }
  }
};
