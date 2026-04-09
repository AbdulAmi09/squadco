create table if not exists org_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references organizations(id) on delete cascade,
  sandbox_mode boolean not null default true,
  live_enabled boolean not null default false,
  fail_open_mode text not null default 'verify' check (fail_open_mode in ('allow', 'verify')),
  preferred_assistant_name text,
  preferred_greeting text,
  squad_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  amount_kobo bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists background_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  customer_id uuid references bank_customers(id) on delete cascade,
  job_type text not null,
  priority text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists failed_jobs (
  id uuid primary key default gen_random_uuid(),
  background_job_id uuid references background_jobs(id) on delete set null,
  org_id uuid references organizations(id) on delete cascade,
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  error_message text not null,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  last_retried_at timestamptz
);

create index if not exists idx_billing_events_org_created_at on billing_events(org_id, created_at desc);
create index if not exists idx_background_jobs_status_created_at on background_jobs(status, created_at desc);
create index if not exists idx_failed_jobs_org_created_at on failed_jobs(org_id, created_at desc);

alter table org_settings enable row level security;
alter table billing_events enable row level security;
alter table background_jobs enable row level security;
alter table failed_jobs enable row level security;

create policy "org_settings_all" on org_settings
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "billing_events_all" on billing_events
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "background_jobs_all" on background_jobs
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "failed_jobs_all" on failed_jobs
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);
