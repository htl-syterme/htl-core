/**
 * report - Shadow Report endpoint.
 * Input : ?k=htl_xxx (API key in the clear; hashed server-side).
 * Output: JSON weekly aggregation for that key.
 * CORS whitelist, DB timeout, no logging of the raw key.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_ORIGIN = 'https://htl-syterme.github.io';
const cors = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
const json = { ...cors, 'Content-Type': 'application/json' };

const DB_TIMEOUT_MS = 5000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: json,
    });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('k') ?? '';
  if (!key.startsWith('htl_') || key.length < 20) {
    return new Response(JSON.stringify({ error: 'invalid_key' }), { status: 400, headers: json });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
    const keyHex = Array.from(new Uint8Array(keyBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { data: keyRow } = await withTimeout(
      supabase
        .from('api_keys')
        .select('id, key_prefix, credits_total, credits_used, status')
        .eq('key_hash', '\\x' + keyHex)
        .maybeSingle(),
      DB_TIMEOUT_MS
    );

    if (!keyRow) {
      return new Response(JSON.stringify({ error: 'unknown_key' }), { status: 404, headers: json });
    }

    const { data: weekly } = await withTimeout(
      supabase
        .from('trust_weekly')
        .select('week, requests, never_moved, engaged, p50')
        .eq('api_key_id', keyRow.id)
        .order('week', { ascending: false })
        .limit(8),
      DB_TIMEOUT_MS
    );

    const totals = (weekly ?? []).reduce(
      (acc: any, w: any) => {
        acc.requests += Number(w.requests ?? 0);
        acc.never_moved += Number(w.never_moved ?? 0);
        acc.engaged += Number(w.engaged ?? 0);
        return acc;
      },
      { requests: 0, never_moved: 0, engaged: 0 }
    );

    const botShare = totals.requests > 0 ? totals.never_moved / totals.requests : 0;

    return new Response(
      JSON.stringify({
        key_prefix: keyRow.key_prefix,
        status: keyRow.status,
        credits_total: keyRow.credits_total,
        credits_used: keyRow.credits_used,
        totals,
        bot_share: Number(botShare.toFixed(4)),
        weeks: weekly ?? [],
      }),
      { headers: json }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(err) }), {
      status: 500,
      headers: json,
    });
  }
});
