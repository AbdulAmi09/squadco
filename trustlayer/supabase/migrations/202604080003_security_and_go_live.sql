create table if not exists user_security (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  totp_enabled boolean not null default false,
  totp_secret text,
  recovery_codes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists go_live_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  submitted_by uuid references users(id) on delete set null,
  company_name text not null,
  rc_number text,
  business_details jsonb not null default '{}'::jsonb,
  use_case_description text,
  status text not null default 'pending',
  review_notes text,
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_security enable row level security;
alter table go_live_requests enable row level security;

create policy "user_security_same_user" on user_security
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "go_live_org_access" on go_live_requests
  for all
  using (
    exists (
      select 1
      from users
      where users.id = auth.uid()
        and (
          users.role = 'super_admin'
          or users.org_id = go_live_requests.org_id
        )
    )
  )
  with check (
    exists (
      select 1
      from users
      where users.id = auth.uid()
        and (
          users.role = 'super_admin'
          or users.org_id = go_live_requests.org_id
        )
    )
  );
