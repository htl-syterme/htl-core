import { generateEd25519KeyPair, generateTrustTokenEd25519, verifyTrustTokenEd25519 } from '../dist/src/xtrust.js';

const pair = await generateEd25519KeyPair();
console.log('publicKeyHex length:', pair.publicKeyHex.length);

const token = await generateTrustTokenEd25519(
  { sub: 'test-user', score: 0.42 },
  pair.privateKeyJwk
);
console.log('token starts with v2:', token.startsWith('v2.'));

const verified = await verifyTrustTokenEd25519(token, pair.publicKeyJwk);
console.log('verified sub:', verified?.sub);
console.log('verified score:', verified?.score);
console.log('verified kid:', verified?.kid);

// Tamper test: modify one character of the payload
const parts = token.split('.');
const tampered = parts[0] + '.' + parts[1].slice(0, -1) + 'A' + '.' + parts[2];
const bad = await verifyTrustTokenEd25519(tampered, pair.publicKeyJwk);
console.log('tampered returns null:', bad === null);

// Wrong key test
const pair2 = await generateEd25519KeyPair();
const wrongKey = await verifyTrustTokenEd25519(token, pair2.publicKeyJwk);
console.log('wrong key returns null:', wrongKey === null);
