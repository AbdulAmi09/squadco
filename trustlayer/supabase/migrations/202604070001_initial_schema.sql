create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  api_call_count integer not null default 0,
  monthly_limit integer not null default 10000,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete cascade,
  role text not null check (role in ('super_admin', 'bank_admin', 'bank_developer')),
  full_name text,
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  created_by uuid references users(id) on delete set null,
  name text not null,
  key_hash text unique not null,
  key_prefix text not null,
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists bank_customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  external_id text not null,
  bvn_hash text,
  phone_hash text,
  trust_score integer not null default 500,
  credit_score integer not null default 0,
  risk_tier text not null default 'unverified' check (risk_tier in ('unverified', 'building', 'trusted', 'elite')),
  total_transactions integer not null default 0,
  flagged_transactions integer not null default 0,
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, external_id)
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references bank_customers(id) on delete cascade,
  external_tx_id text,
  amount numeric not null,
  currency text not null default 'NGN',
  merchant text,
  location text,
  device_id text,
  ip_address text,
  channel text,
  risk_score integer,
  risk_factors jsonb not null default '[]'::jsonb,
  decision text check (decision in ('allow', 'verify', 'block')),
  ai_explanation text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'flagged')),
  created_at timestamptz not null default now()
);

create table if not exists credit_inputs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references bank_customers(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  input_type text not null,
  data jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists trust_score_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references bank_customers(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  change_amount integer not null,
  old_score integer not null,
  new_score integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  action text not null,
  resource text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  events text[] not null default '{}',
  secret text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('bank_admin', 'bank_developer')),
  invited_by uuid references users(id) on delete set null,
  token text unique not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_org_id on users(org_id);
create index if not exists idx_api_keys_org_id on api_keys(org_id);
create index if not exists idx_bank_customers_org_id on bank_customers(org_id);
create index if not exists idx_transactions_org_created_at on transactions(org_id, created_at desc);
create index if not exists idx_transactions_customer_created_at on transactions(customer_id, created_at desc);
create index if not exists idx_credit_inputs_customer on credit_inputs(customer_id, created_at desc);
create index if not exists idx_audit_logs_org_created_at on audit_logs(org_id, created_at desc);
create index if not exists idx_trust_score_history_customer_created_at on trust_score_history(customer_id, created_at desc);

create or replace function public.current_user_org_id()
returns uuid
language sql
stable
as $$
  select org_id from public.users where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(public.current_user_role() = 'super_admin', false)
$$;

alter table organizations enable row level security;
alter table users enable row level security;
alter table api_keys enable row level security;
alter table bank_customers enable row level security;
alter table transactions enable row level security;
alter table credit_inputs enable row level security;
alter table trust_score_history enable row level security;
alter table audit_logs enable row level security;
alter table webhooks enable row level security;
alter table invitations enable row level security;

create policy "organizations_select" on organizations
for select using (
  public.is_super_admin() or id = public.current_user_org_id()
);

create policy "organizations_update" on organizations
for update using (
  public.is_super_admin() or id = public.current_user_org_id()
);

create policy "users_select" on users
for select using (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "users_insert" on users
for insert with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "users_update" on users
for update using (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "users_delete" on users
for delete using (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "api_keys_all" on api_keys
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "bank_customers_all" on bank_customers
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "transactions_all" on transactions
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "credit_inputs_all" on credit_inputs
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "trust_score_history_all" on trust_score_history
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "audit_logs_all" on audit_logs
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "webhooks_all" on webhooks
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);

create policy "invitations_all" on invitations
for all using (
  public.is_super_admin() or org_id = public.current_user_org_id()
)
with check (
  public.is_super_admin() or org_id = public.current_user_org_id()
);
