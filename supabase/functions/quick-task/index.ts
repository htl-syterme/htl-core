/**
 * quick-task - Paddle webhook handler for X-Trust.
 * Verifies the Paddle signature, generates an API key, stores it,
 * and emails it to the buyer. Idempotent on order id.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_ORIGIN = 'https://htl-syterme.github.io';
const cors = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, paddle-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = { ...cors, 'Content-Type': 'application/json' };

const PRICE_MAP: Record<string, number> = {
  'pri_01m2p3nq2yehqy4v07kc9dtqk3': 1000,
  'pri_01m2p3xh52y8anqxe1kcqpjyah': 10000,
  'pri_01m2p40yxrzvtp4490vpraf94r': 100000,
};

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return 'htl_' + hex;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  const parts: Record<string, string> = {};
  signatureHeader.split(';').forEach((p) => {
    const [k, v] = p.split('=');
    if (k && v) parts[k] = v;
  });
  const ts = parts['ts'];
  const h1 = parts['h1'];
  if (!ts || !h1) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(ts, 10)) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(ts + ':' + rawBody)
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  if (expected.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}

async function sendKeyEmail(
  resendKey: string,
  to: string,
  apiKey: string,
  orderId: string,
  verifications: number
): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to,
      subject: 'Your X-Trust API Key',
      html:
        '<h2>X-Trust - API Key</h2>' +
        '<p>Your key is ready:</p>' +
        '<p><strong>' + apiKey + '</strong></p>' +
        '<p>Credits: ' + verifications.toLocaleString('en-US') + ' verifications</p>' +
        '<p>Order: ' + orderId + '</p>' +
        '<p>Docs: <a href="https://github.com/htl-syterme/htl-core">github.com/htl-syterme/htl-core</a></p>',
    }),
  });
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: json });
  }
  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get('PADDLE_WEBHOOK_SECRET') ?? '';
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: json });
    }
    const signature = req.headers.get('paddle-signature');
    const valid = await verifyPaddleSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 401, headers: json });
    }
    const event = JSON.parse(rawBody);
    if (event.event_type !== 'transaction.completed') {
      return new Response(JSON.stringify({ received: true, processed: false }), { status: 200, headers: json });
    }
    const data = event.data ?? {};
    const orderId: string = data.id ?? '';
    const email: string = (data.customer && data.customer.email) || '';
    const priceId: string = (data.items && data.items[0] && data.items[0].price && data.items[0].price.id) || '';
    const verifications = PRICE_MAP[priceId];
    if (!orderId || !isValidEmail(email) || !verifications) {
      return new Response(JSON.stringify({ received: true, processed: false, reason: 'invalid_payload' }), { status: 200, headers: json });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: existing } = await supabase
      .from('api_keys')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ received: true, processed: false, reason: 'duplicate' }), { status: 200, headers: json });
    }
    const apiKey = generateApiKey();
      const keyBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
      const keyHex = Array.from(new Uint8Array(keyBytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
      const keyHash = '\\x' + keyHex;
      const keyPrefix = apiKey.slice(0, 12);
    const { error: insertError } = await supabase.from('api_keys').insert({
        key_hash: keyHash,
        key_prefix: keyPrefix,
      email,
      order_id: orderId,
      status: 'active',
      credits_total: verifications,
      credits_used: 0,
    });
    if (insertError) {
      return new Response(JSON.stringify({ received: true, error: 'db_insert_failed' }), { status: 500, headers: json });
    }
    const resendKey = Deno.env.get('RESEND_KEY') ?? '';
    const sent = await sendKeyEmail(resendKey, email, apiKey, orderId, verifications);
    return new Response(JSON.stringify({ received: true, processed: true, email_sent: sent }), { status: 200, headers: json });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'internal', detail: String(err) }), { status: 500, headers: json });
  }
});
