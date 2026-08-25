import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTrustToken,
  verifyTrustToken,
  computeBehavioralScore
} from '../src/xtrust.js';

const SECRET = 'test-secret';

test('round-trip : génération puis vérification', () => {
  const token = generateTrustToken({ sub: 'user-1', score: 0.87 }, SECRET);
  const payload = verifyTrustToken(token, SECRET);
  assert.ok(payload);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.score, 0.87);
});

test('format : v1.<payload>.<signature>', () => {
  const token = generateTrustToken({ sub: 'user-1', score: 0.5 }, SECRET);
  const parts = token.split('.');
  assert.equal(parts.length, 3);
  assert.equal(parts[0], 'v1');
});

test('rejet : signature falsifiée', () => {
  const token = generateTrustToken({ sub: 'user-1', score: 0.87 }, SECRET);
  const parts = token.split('.');
  const sig = parts[2];
  const flipped = sig.endsWith('A') ? sig.slice(0, -1) + 'B' : sig.slice(0, -1) + 'A';
  assert.equal(verifyTrustToken(`${parts[0]}.${parts[1]}.${flipped}`, SECRET), null);
});

test('rejet : payload modifié (score gonflé)', () => {
  const token = generateTrustToken({ sub: 'user-1', score: 0.2 }, SECRET);
  const parts = token.split('.');
  const now = Math.floor(Date.now() / 1000);
  const forgedPayload = Buffer.from(
    JSON.stringify({ sub: 'user-1', score: 0.99, iat: now, exp: now + 60 })
  ).toString('base64url');
  assert.equal(verifyTrustToken(`${parts[0]}.${forgedPayload}.${parts[2]}`, SECRET), null);
});

test('rejet : mauvais secret', () => {
  const token = generateTrustToken({ sub: 'user-1', score: 0.87 }, SECRET);
  assert.equal(verifyTrustToken(token, 'wrong-secret'), null);
});

test('rejet : token expiré', () => {
  const token = generateTrustToken({ sub: 'user-1', score: 0.9 }, SECRET, -10);
  assert.equal(verifyTrustToken(token, SECRET), null);
});

test('rejet : format malformé', () => {
  assert.equal(verifyTrustToken('garbage', SECRET), null);
  assert.equal(verifyTrustToken('v2.abc.def', SECRET), null);
});

test('biométrie : score déterministe dans [0,1]', () => {
  const signals = { keystrokes: 'pattern-a', pointer: 'arc-3' };
  const s1 = computeBehavioralScore(signals);
  const s2 = computeBehavioralScore(signals);
  assert.equal(s1, s2);
  assert.ok(s1 >= 0 && s1 <= 1);
});
