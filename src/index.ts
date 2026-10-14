export { generateTrustToken, verifyTrustToken, computeBehavioralScore } from './xtrust.js';
export type { TrustPayload } from './xtrust.js';
export {
  generateEd25519KeyPair,
  generateTrustTokenEd25519,
  verifyTrustTokenEd25519,
} from './xtrust.js';
export type { Ed25519KeyPair } from './xtrust.js';
export { trustMiddleware, requireTrust, TRUST_HEADER } from './middleware.js';
export type { TrustRequest, MinimalResponse, NextFunction } from './middleware.js';
export { trustFetch } from './fetch.js';
export type { TrustFetchInit } from './fetch.js';
