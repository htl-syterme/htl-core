
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.read_secret(secret_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault AS $$
DECLARE secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name LIMIT 1;
  RETURN secret_value;
END; $$;

REVOKE ALL ON FUNCTION public.read_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_secret(text) TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_secret(secret_name text, secret_value text, secret_desc text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, vault AS $$
DECLARE existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = secret_name;
  IF existing_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = existing_id;
  END IF;
  RETURN vault.create_secret(secret_value, secret_name, COALESCE(secret_desc, 'HTL secret'));
END; $$;

REVOKE ALL ON FUNCTION public.upsert_secret(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_secret(text, text, text) TO service_role;

CREATE TABLE IF NOT EXISTS public.secret_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_name text NOT NULL,
  version text NOT NULL,
  rotated_at timestamptz NOT NULL DEFAULT now(),
  previous_version text,
  status text NOT NULL DEFAULT 'success',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  ip inet,
  user_agent text,
  path text,
  payload_hash text,
  score int DEFAULT 0,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nonce_cache (
  nonce text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ip_blacklist (
  ip inet PRIMARY KEY,
  reason text,
  score int DEFAULT 100,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.security_config (key, value) VALUES
  ('rate_limit_max_requests', '30'),
  ('rate_limit_window_seconds', '60'),
  ('anomaly_score_threshold', '80'),
  ('blacklist_duration_hours', '24'),
  ('htl_secret_overlap_hours', '2')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_security_events_time ON public.security_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events (ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nonce_expires ON public.nonce_cache (expires_at);

SELECT cron.schedule('cleanup-security', '*/15 * * * *', $$
  DELETE FROM public.nonce_cache WHERE expires_at < now();
  DELETE FROM public.ip_blacklist WHERE expires_at IS NOT NULL AND expires_at < now();
  DELETE FROM public.security_events WHERE created_at < now() - interval '30 days';
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
$$);
