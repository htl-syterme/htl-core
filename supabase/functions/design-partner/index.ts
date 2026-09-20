import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': 'https://htl-syterme.github.io',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = { ...cors, 'Content-Type': 'application/json' };

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: json });
    }
    try {
      const cl = req.headers.get('content-length');
      if (cl && parseInt(cl) > 10240) {
        return new Response(JSON.stringify({ error: 'too large' }), { status: 413, headers: json });
      }
      const body = await req.json();
      const email = String(body.email ?? '').trim().slice(0, 200);
      if (!email || !email.includes('@') || email.length < 5) {
        return new Response(JSON.stringify({ error: 'email' }), { status: 400, headers: json });
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { error } = await supabase.from('design_partners').insert({
        email,
        company: String(body.company ?? '').slice(0, 200),
        volume: String(body.volume ?? '').slice(0, 100),
        stack: String(body.stack ?? '').slice(0, 200),
        missing_signal: String(body.missing_signal ?? '').slice(0, 1000)
      });
      if (error) {
        return new Response(JSON.stringify({ error: 'db' }), { status: 500, headers: json });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: json });
    } catch {
      return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: json });
    }
  }
};
