import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTrustToken, verifyTrustToken } from '../dist/src/xtrust.js';

const SECRET = 'attack_secret_xyz';

// --- Malformed tokens ---
test('attack: empty token -> null', async () => {
  assert.equal(await verifyTrustToken('', SECRET), null);
});

test('attack: token with 2 parts -> null', async () => {
  assert.equal(await verifyTrustToken('v1.abc', SECRET), null);
});

test('attack: token with 4 parts -> null', async () => {
  assert.equal(await verifyTrustToken('v1.a.b.c', SECRET), null);
});

test('attack: wrong version prefix -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET);
  assert.equal(await verifyTrustToken('v2' + t.slice(2), SECRET), null);
});

// --- Signature forgery ---
test('attack: random signature -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET);
  const parts = t.split('.');
  const forged = parts[0] + '.' + parts[1] + '.' + 'A'.repeat(43);
  assert.equal(await verifyTrustToken(forged, SECRET), null);
});

test('attack: truncated signature -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET);
  const parts = t.split('.');
  const trunc = parts[0] + '.' + parts[1] + '.' + parts[2].slice(0, 20);
  assert.equal(await verifyTrustToken(trunc, SECRET), null);
});

// --- Payload tampering ---
test('attack: score tampered, signature kept -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.3 }, SECRET);
  const parts = t.split('.');
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  payload.score = 0.99;
  const tamperedB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const tampered = parts[0] + '.' + tamperedB64 + '.' + parts[2];
  assert.equal(await verifyTrustToken(tampered, SECRET), null);
});

// --- Score edge cases ---
test('attack: score = -0.1 -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: -0.1 }, SECRET);
  assert.equal(await verifyTrustToken(t, SECRET), null);
});

test('attack: score = 1.1 -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 1.1 }, SECRET);
  assert.equal(await verifyTrustToken(t, SECRET), null);
});

test('score edge: 0.0 accepted', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0 }, SECRET);
  assert.ok(await verifyTrustToken(t, SECRET));
});

test('score edge: 1.0 accepted', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 1 }, SECRET);
  assert.ok(await verifyTrustToken(t, SECRET));
});

// --- TTL boundaries ---
test('ttl: already expired (negative ttl) -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET, -10);
  assert.equal(await verifyTrustToken(t, SECRET), null);
});

test('ttl: valid short ttl -> accepted', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET, 5);
  assert.ok(await verifyTrustToken(t, SECRET));
});

test('ttl: default 120s -> accepted', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET);
  assert.ok(await verifyTrustToken(t, SECRET));
});

// --- Malformed payload (raw manipulation) ---
test('attack: payload not JSON -> null', async () => {
  const t = await generateTrustToken({ sub: 'u', score: 0.5 }, SECRET);
  const parts = t.split('.');
  const garbage = Buffer.from('not json at all').toString('base64url');
  const bogus = parts[0] + '.' + garbage + '.' + parts[2];
  assert.equal(await verifyTrustToken(bogus, SECRET), null);
});

test('attack: missing score field -> null', async () => {
  const payload = { sub: 'u', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 60 };
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const bogus = 'v1.' + b64 + '.' + 'A'.repeat(43);
  assert.equal(await verifyTrustToken(bogus, SECRET), null);
});
