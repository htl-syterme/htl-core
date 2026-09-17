alter table public.api_keys
  add column if not exists alert_url text,
  add column if not exists alert_threshold numeric default 0.4;

select cron.schedule(
  'hourly-bot-share-alert',
  '0 * * * *',
  $$
    select net.http_post(
      url := 'https://pixmqidaoszxbdxffrxx.supabase.co/functions/v1/alert',
      headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true))
    );
  $$
);
