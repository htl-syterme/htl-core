-- HTL - Anonymisation IP + purge pg_cron
-- Objectif RGPD : ne jamais stocker IP brute persistante

create extension if not exists pgcrypto;

-- Fonction : hash IP avec sel journalier rotatif
create or replace function public.anonymize_ip(ip_addr text)
returns text
language plpgsql
security definer
as $$
declare
  daily_salt text;
  hashed text;
begin
  select value::text into daily_salt
    from public.security_config
   where key = 'ip_daily_salt'
   limit 1;
  if daily_salt is null then
    daily_salt := encode(gen_random_bytes(16), 'hex');
    insert into public.security_config (key, value, updated_at)
    values ('ip_daily_salt', to_jsonb(daily_salt), now())
    on conflict (key) do update
      set value = excluded.value, updated_at = now();
  end if;
  hashed := encode(digest(ip_addr || daily_salt, 'sha256'), 'hex');
  return substring(hashed from 1 for 16);
end;
$$;

revoke all on function public.anonymize_ip(text) from public;
grant execute on function public.anonymize_ip(text) to service_role;

-- Purge : events > 30 jours, nonces expires, blacklist expires
create or replace function public.purge_security_data()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.security_events where created_at < now() - interval '30 days';
  delete from public.nonce_cache where expires_at < now();
  delete from public.ip_blacklist where expires_at < now();
  delete from public.rate_limits where window_start < now() - interval '24 hours';
end;
$$;

revoke all on function public.purge_security_data() from public;
grant execute on function public.purge_security_data() to service_role;

-- Cron pg_cron : purge toutes les 15 min
-- (Doit etre execute apres avoir active pg_cron dans Extensions)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('purge-security') where exists (
      select 1 from cron.job where jobname = 'purge-security'
    );
    perform cron.schedule(
      'purge-security',
      '*/15 * * * *',
      $$select public.purge_security_data();$$
    );
  end if;
end $$;
