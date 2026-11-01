import test from 'node:test';
import assert from 'node:assert';
import { trustMiddleware, requireTrust } from '../dist/src/middleware.js';

test('trustMiddleware: injects Accept-Signature when no token', () => {
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

  trustMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
  assert.ok(acceptSigHeader.includes('sig1='));
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
  assert.strictEqual(parsed.status, 401);
});

test('requireTrust: returns 403 RFC 9457 if score too low', () => {
  const req = { headers: {}, trust: { score: 0.2, sub: 'test', iat: 0, exp: 0, kid: 'v2', jti: '' } };
  let responseBody = '';
  const res = {
    statusCode: 200,
    end: (body) => { responseBody = body || ''; },
    setHeader: () => {}
  };

  requireTrust(0.5)(req, res, () => { assert.fail('Should not call next'); });

  assert.strictEqual(res.statusCode, 403);
  const parsed = JSON.parse(responseBody);
  assert.strictEqual(parsed.title, 'Trust score too low');
  assert.strictEqual(parsed.status, 403);
});

test('requireTrust: calls next if score is valid', () => {
  const req = { headers: {}, trust: { score: 0.8, sub: 'test', iat: 0, exp: 0, kid: 'v2', jti: '' } };
  const res = { statusCode: 200, end: () => {}, setHeader: () => {} };
  let nextCalled = false;

  requireTrust(0.5)(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true);
});
