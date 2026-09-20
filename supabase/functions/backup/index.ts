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
      const secret = Deno.env.get('CRON_SECRET') ?? '';
      const provided = req.headers.get('x-cron-secret') ?? '';
      if (!secret || !timingSafeEqual(secret, provided)) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: json });
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const tables = ['trust_events', 'api_keys', 'design_partners', 'security_events', 'ip_blacklist', 'secret_rotations'];
      const dump: Record<string, unknown> = {
        timestamp: new Date().toISOString(),
        tables: {}
      };
      for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').limit(10000);
        if (!error) (dump.tables as Record<string, unknown>)[t] = data ?? [];
      }
      return new Response(JSON.stringify(dump), { headers: json });
    } catch {
      return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: json });
    }
  }
};
