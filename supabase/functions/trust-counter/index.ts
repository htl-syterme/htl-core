/**
 * trust-counter - public endpoint returning the total number of
 * verified trust events. JWT OFF. CORS whitelist, short cache.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_ORIGIN = 'https://htl-syterme.github.io';
const cors = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = {
  ...cors,
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=15',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: json });
  }
  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { count, error } = await sb
      .from('trust_events')
      .select('id', { count: 'exact', head: true });
    if (error) {
      return new Response(JSON.stringify({ total_verifs: 0, error: 'db' }), { status: 500, headers: json });
    }
    return new Response(JSON.stringify({ total_verifs: count ?? 0 }), { status: 200, headers: json });
  } catch (err) {
    return new Response(JSON.stringify({ total_verifs: 0, error: 'internal' }), { status: 500, headers: json });
  }
});
