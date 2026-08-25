# htl-core

Humanity Trust Layer — proof-of-humanity API for AI infrastructure.
Zero KYC, zero PII. The X-Trust header standard.

## Intégration en 3 lignes

```ts
import { trustFetch } from 'htl-core';

const res = await trustFetch('https://your-llm-gateway/v1/chat', {
  trust: { sub: 'user-42', signals: { keystroke: 'p91', pointer: 'arc' } },
});
// Header injecté automatiquement : X-Trust: v1.<payload>.<signature>
```

Côté serveur (Express) : annoter sans bloquer (l'AIR, pas le mur).

```ts
import { trustMiddleware, requireTrust } from 'htl-core';

app.use(trustMiddleware());                  // annote req.trust, ne bloque JAMAIS
app.post('/v1/chat', requireTrust(0.5), h);  // guard optionnel (seuil de score)
```

## Env vars

| Variable | Rôle |
|---|---|
| `HTL_SECRET` | Secret HMAC-SHA256 (signature + vérification). Jamais en dur. Voir `.env.example`. |

## Format du header X-Trust

`v1.<base64url(payloadJSON)>.<base64url(HMAC-SHA256)>`
Payload : `sub`, `score` (biométrie comportementale 0..1, locale, déterministe), `iat`, `exp`.

## Dev local

```bash
npm install
npm test
npm run build
```

MIT
