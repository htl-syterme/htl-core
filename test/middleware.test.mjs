import test from 'node:test';
import assert from 'node:assert';
import { trustMiddleware, requireTrust } from '../dist/src/middleware.js';
import { generateEd25519KeyPair, generateTrustTokenEd25519 } from '../dist/src/xtrust.js';

test('trustMiddleware: injects Accept-Signature when no token', async () => {
  const req = { headers: {} };
  let acceptSigHeader = '';
  const res = {
    statusCode: 200,
    end: () => {},
    setHeader: (name, value) => {
      if (name === 'Accept-Signature') acceptSigHeader = value;
    }
  };
  let nextCalled = false;

  await trustMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
  assert.ok(acceptSigHeader.includes('sig1='));
});

test('trustMiddleware: successfully verifies a v2 (Ed25519) token', async () => {
  const pair = await generateEd25519KeyPair();
  process.env.HTL_PUBLIC_JWK = JSON.stringify(pair.publicKeyJwk);
  
  const token = await generateTrustTokenEd25519({ sub: 'test-v2', score: 0.9 }, pair.privateKeyJwk);
  const req = { headers: { 'x-trust': token } };
  const res = { statusCode: 200, end: () => {}, setHeader: () => {} };
  let nextCalled = false;

  // AJOUT DE AWAIT ICI
  await trustMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
  assert.ok(req.trust, 'Trust payload should be populated');
  assert.strictEqual(req.trust.sub, 'test-v2');
  assert.strictEqual(req.trust.score, 0.9);
  
  delete process.env.HTL_PUBLIC_JWK;
});

test('requireTrust: returns 401 RFC 9457 if no token', () => {
  const req = { headers: {} };
  let responseBody = '';
  let contentType = '';
  const res = {
    statusCode: 200,
    end: (body) => { responseBody = body || ''; },
    setHeader: (name, value) => {
      if (name === 'Content-Type') contentType = value;
    }
  };

  requireTrust(0.5)(req, res, () => { assert.fail('Should not call next'); });

  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(contentType, 'application/problem+json');
  const parsed = JSON.parse(responseBody);
  assert.strictEqual(parsed.title, 'Trust token missing or invalid');
});

test('requireTrust: calls next if score is valid', () => {
  const req = { headers: {}, trust: { score: 0.8, sub: 'test', iat: 0, exp: 0, kid: 'v2', jti: '' } };
  const res = { statusCode: 200, end: () => {}, setHeader: () => {} };
  let nextCalled = false;

  requireTrust(0.5)(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
});
