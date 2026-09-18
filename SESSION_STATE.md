# HTL — État de session (17 sept 2026, session Fable)

## ✅ Déployé sur Supabase (live en prod)
- hyper-responder : kid + time-bound + rate limit par clé + api_key_id
- trust-counter : live
- quick-task : version avec hash SHA-256 (déployé plus tôt)
- honeypot : ban 1h + sec-fetch-dest
- rotate-htl-secret : version pré-dual-secret
- security-report : live

## ✅ Déployé sur Supabase — TOUT À JOUR
- hyper-responder : + `api_key_id` + time-bound score + kid lookup + rate limit par clé + fail-open
- rotate-htl-secret : + dual-secret 5 min overlap (annotation TODO)
- **report** : Edge Function Shadow Report (nouveau)
- **alert** : Edge Function webhook horaire HMAC (nouveau)
- docs/index.html + app.js : formulaire Shadow Report
- docs/styles.css : CSS Shadow Report
- python/htl_verify/ : verifier Python stdlib
- SPEC.md : Per-tenant keys + Time-bounded score + Threat model

## ✅ SQL appliqué en prod
- Table `signing_keys`
- Vue `trust_weekly` + colonne `trust_events.api_key_id`
- Colonnes `api_keys.key_hash` + `key_prefix` + `alert_url` + `alert_threshold`
- `api_keys.api_key` supprimée
- Extensions `pg_net` + `pg_cron`
- Secret `security_config.cron_alert_secret`
- Cron `hourly-bot-share-alert` (jobid 5, `0 * * * *`)
- Config `security_config.honeypot` = `{ban_hours: 1}`

## ❌ À FAIRE à la prochaine session (batterie > 20%)

### 1. Deploy groupé Supabase (5 fonctions)
Pour chacune : ouvrir `/dashboard/project/pixmqidaoszxbdxffrxx/functions/<nom>` → Code → Ctrl+A → supprime → colle depuis `raw.githubusercontent.com/htl-syterme/htl-core/main/supabase/functions/<nom>/index.ts` → Deploy updates.

- [x] hyper-responder
- [x] honeypot
- [x] quick-task
- [x] report
- [x] alert

### 2. Tests curl après chaque deploy
- hyper-responder : `curl -si .../hyper-responder/demo | grep -i x-trust` → header présent
- hyper-responder sans clé : → 204
- honeypot : `curl -si .../honeypot/admin` → 404 (et pas de ban car sec-fetch absent... à vérifier)
- report : `curl .../report?k=htl_fake` → 404 `unknown_key`
- alert sans CRON_SECRET : `curl -X POST .../alert` → 403

### 3. Migration SQL `alert_columns`
Exécuter `supabase/migrations/20260917_alert_columns.sql` (corrigée) si pas déjà fait.

### 4. Emails GPT
- Récupérer la réponse de GPT (10 emails personnalisés)
- Les coller à Claude pour nettoyage
- Envoyer via Gmail aux 10 prospects

### 5. Show HN
- Vérifier karma `news.ycombinator.com/user?id=htl`
- Si ≥ 5 : poster Show HN (texte dans MASTER_PLAN.md local)

## Règles actives
- Batterie < 20% = pas de deploy Edge Function (risque de bundle partiel)
- Zéro caractère non-ASCII dans le code
- Secret collé dans le chat = brûlé
- 30 min rule : répondre à tout dans 30 minutes

## Mot de réveil
"TU ES MON CTO. Reprends SESSION_STATE.md. Étape 1 : deploy groupé Supabase des 5 Edge Functions."
