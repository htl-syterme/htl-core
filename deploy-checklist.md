# Deploy Checklist — Session à froid (> 20% batterie)

## Étape 1 — Migration SQL alert (si pas déjà fait)

Ouvre : https://supabase.com/dashboard/project/pixmqidaoszxbdxffrxx/sql/new

Colle :
```sql
-- Colonnes alert_url + alert_threshold
alter table public.api_keys
  add column if not exists alert_url text,
  add column if not exists alert_threshold numeric default 0.4;

-- Vérifie les crons actifs
select jobid, jobname, schedule, active from cron.job;


## Étape 2 — Deploy groupé des 5 Edge Functions

Pour chacune : ouvrir `/dashboard/project/pixmqidaoszxbdxffrxx/functions/<NOM>` → Code → Ctrl+A → supprimer → coller depuis `raw.githubusercontent.com/htl-syterme/htl-core/main/supabase/functions/<NOM>/index.ts` → Deploy updates.

- [ ] hyper-responder
- [ ] honeypot
- [ ] quick-task
- [ ] report
- [ ] alert

## Étape 3 — Tests curl

```bash
curl -si "https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/hyper-responder/demo" | grep -i x-trust
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/hyper-responder" -H "Content-Type: application/json" -d '{}'
curl -sS "https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/report?k=htl_fakefakefakefakefakefakefakefake"
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/alert"

