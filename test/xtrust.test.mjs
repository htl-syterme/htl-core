import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTrustToken, verifyTrustToken } from '../dist/src/xtrust.js';

const SECRET = 'test_secret_123';

test('token valide -> vérifié', async () => {
  const token = await generateTrustToken({ sub: 'user-1', score: 0.88 }, SECRET);
  const payload = await verifyTrustToken(token, SECRET);
  assert.ok(payload);
  assert.equal(payload.score, 0.88);
});

test('mauvais secret -> null', async () => {
  const token = await generateTrustToken({ sub: 'user-1', score: 0.88 }, SECRET);
  assert.equal(await verifyTrustToken(token, 'wrong'), null);
});

test('token trafiqué -> null', async () => {
  const token = await generateTrustToken({ sub: 'user-1', score: 0.88 }, SECRET);
  const tampered = token.slice(0, -2) + 'xx';
  assert.equal(await verifyTrustToken(tampered, SECRET), null);
});

test('score hors limites -> null', async () => {
  const token = await generateTrustToken({ sub: 'user-1', score: 5 }, SECRET);
  assert.equal(await verifyTrustToken(token, SECRET), null);
});
