# Self-host X-Trust

The whole stack is open source. If the hosted endpoint is ever unreachable, you can deploy your own verifier in under 5 minutes.

## 1. Install the SDK

```
npm install @htl-syterme/htl-core
```

or

```
pip install htl-verify
```

## 2. Generate a secret

```
openssl rand -hex 32
```

Store it as an environment variable. Never commit it.

## 3. Verify a token (Node example)

```ts
import { verifyTrustToken } from '@htl-syterme/htl-core';

const payload = await verifyTrustToken(req.headers.get('x-trust'), process.env.HTL_SECRET);
// payload is null if invalid, or { sub, score, iat, exp }
```

## 4. Full reference

- Spec: `SPEC.md`
- Test vectors: `SPEC.md` section Test Vectors
- Security model: `SECURITY.md`

## 5. Endpoints (hosted, optional)

- Verify: `https://pixmqidaoszbxdbxffrxx.supabase.co/functions/v1/hyper-responder`
- Counter: `https://pixmqidaoszbxdbxffrxx.supabase.co/functions/v1/trust-counter`

Hosted is a convenience. The standard does not depend on it.
