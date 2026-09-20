# Self-host X-Trust

X-Trust is fully open source. If the hosted service is unavailable or you simply want to run the verifier yourself, you can deploy your own setup in a few minutes.

## 1. Install the SDK

For Node.js:

```
npm install @htl-syterme/htl-core
```

For Python:

```
pip install htl-verify
```

## 2. Generate a secret

Generate a 32-byte secret with:

```
openssl rand -hex 32
```

Keep the value in an environment variable. Never commit the secret to your repository.

## 3. Verify a token

Node.js example:

```ts
import { verifyTrustToken } from '@htl-syterme/htl-core';

const payload = await verifyTrustToken(
  req.headers.get('x-trust'),
  process.env.HTL_SECRET
);

// null if invalid, otherwise:
// { sub, score, iat, exp }
```

The verifier returns null when the token is invalid. A valid token returns its signed payload.

## 4. Reference material

The repository contains the full technical reference:

- `SPEC.md` - protocol specification
- `SPEC.md` - Test Vectors section
- `SECURITY.md` - security model

## 5. Hosted endpoints

You can use the hosted endpoints if you do not want to run your own instance:

- Verify: `https://pixmqidaoszbxdbxffrxx.supabase.co/functions/v1/hyper-responder`
- Counter: `https://pixmqidaoszbxdbxffrxx.supabase.co/functions/v1/trust-counter`

The hosted service is optional. X-Trust is a standard, not a dependency on a particular hosted endpoint.
