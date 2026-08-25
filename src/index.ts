export { generateTrustToken, verifyTrustToken, computeBehavioralScore } from './xtrust.js';
export type { TrustPayload } from './xtrust.js';
export { trustMiddleware, requireTrust, TRUST_HEADER } from './middleware.js';
export type { TrustRequest, MinimalResponse, NextFunction } from './middleware.js';
export { trustFetch } from './fetch.js';
export type { TrustFetchInit } from './fetch.js';
