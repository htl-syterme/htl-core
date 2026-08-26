# htl-core — Humanity Trust Layer

**Le standard X-Trust pour l'infrastructure IA.** Preuve d'humanité sans KYC, sans PII, en un header HTTP.

## Le problème qu'on résout

Agrégateurs LLM, wrappers, agents autonomes : le trafic bot déguisé en humain = fraude, abus, metrics faussées. Le KYC tue la conversion. HTL prouve l'humanité **avant** la requête LLM — zéro KYC, zéro donnée personnelle.

## L'AIR, pas le mur

Le X-Trust voyage comme un header invisible. On annote sans bloquer. **3 lignes pour le dev. 0,005 € / vérification.**

## Intégration en 3 lignes

```ts
import { trustFetch } from '@htl-syterme/htl-core';

const res = await trustFetch('https://votre-gateway-llm/v1/chat', {
  trust: { sub: 'user-42', signals: { keystroke: 'p91', pointer: 'arc' } },
});
```

## Middleware (Express-compatible)

```ts
import { trustMiddleware, requireTrust } from '@htl-syterme/htl-core';

app.use(trustMiddleware());                 // annote, ne bloque jamais
app.post('/v1/chat', requireTrust(0.5), h); // guard optionnel
```

## Endpoint de vérification public (LIVE v0.1)


## Compteur live du standard

Vérifications enregistrées en temps réel : `https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/trust-counter`

Chaque appel vérifié par le endpoint X-Trust incrémente ce compteur. La preuve que le standard tourne, sous vos yeux.
