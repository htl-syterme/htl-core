create table if not exists public.design_partners (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company text,
  volume text,
  stack text,
  missing_signal text,
  created_at timestamptz default now()
);

alter table public.design_partners enable row level security;

create policy "design_partners_insert_anon"
  on public.design_partners
  for insert
  to anon
  with check (true);

-- No SELECT for anon. Owner reads via service_role only.
