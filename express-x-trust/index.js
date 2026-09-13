const crypto = require('crypto');

function b64urlToBuffer(s) {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function verifyXTrust(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const [, payloadB64, sigB64] = parts;
  try {
    const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest();
    const sig = b64urlToBuffer(sigB64);
    if (!crypto.timingSafeEqual(expected, sig)) return null;
    const payload = JSON.parse(b64urlToBuffer(payloadB64).toString());
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp || now - payload.iat > 120) return null;
    if (typeof payload.score !== 'number' || payload.score < 0 || payload.score > 1) return null;
    return payload;
  } catch { return null; }
}

function xTrust(secret, minScore = 0) {
  return (req, res, next) => {
    const token = req.headers['x-trust'] || '';
    const payload = token ? verifyXTrust(token, secret) : null;
    const score = payload ? payload.score : 0;
    req.xTrust = { trusted: payload !== null && score >= minScore, score, annotated: true };
    next();
  };
}

module.exports = { xTrust };
