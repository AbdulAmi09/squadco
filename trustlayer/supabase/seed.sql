insert into organizations (id, name, slug, plan, status, api_call_count, monthly_limit)
values
  ('11111111-1111-1111-1111-111111111111', 'TrustLayer Internal', 'trustlayer-internal', 'enterprise', 'active', 0, 1000000),
  ('22222222-2222-2222-2222-222222222222', 'Demo Bank', 'demo-bank', 'growth', 'active', 1240, 50000)
on conflict (id) do nothing;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'superadmin@trustlayer.ai',
    crypt('ChangeMe123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"TrustLayer Super Admin"}',
    now(),
    now(),
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'admin@demobank.ai',
    crypt('ChangeMe123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Bank Admin"}',
    now(),
    now(),
    '',
    ''
  )
on conflict (id) do nothing;

insert into users (id, org_id, role, full_name, email)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'super_admin', 'TrustLayer Super Admin', 'superadmin@trustlayer.ai'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'bank_admin', 'Demo Bank Admin', 'admin@demobank.ai')
on conflict (id) do nothing;

insert into bank_customers (
  id,
  org_id,
  external_id,
  bvn_hash,
  phone_hash,
  trust_score,
  credit_score,
  risk_tier,
  total_transactions,
  flagged_transactions,
  last_activity_at
)
values
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'demo_customer_001',
    encode(digest('22222222222', 'sha256'), 'hex'),
    encode(digest('08030000000', 'sha256'), 'hex'),
    640,
    665,
    'trusted',
    18,
    2,
    now() - interval '1 hour'
  )
on conflict (org_id, external_id) do nothing;

insert into trust_score_history (
  customer_id,
  org_id,
  change_amount,
  old_score,
  new_score,
  reason,
  metadata
)
values
  (
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    140,
    500,
    640,
    'Seeded baseline trust profile',
    '{"source":"seed"}'
  );

insert into transactions (
  org_id,
  customer_id,
  external_tx_id,
  amount,
  currency,
  merchant,
  location,
  device_id,
  ip_address,
  channel,
  risk_score,
  risk_factors,
  decision,
  ai_explanation,
  status,
  created_at
)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'seed_tx_001',
    250000,
    'NGN',
    'Salary Payment',
    'Lagos',
    'device_demo',
    '127.0.0.1',
    'mobile',
    18,
    '[{"type":"trusted_pattern","severity":"low"}]'::jsonb,
    'allow',
    'This transaction matched the customer''s usual spending pattern and device history, so it was approved.',
    'approved',
    now() - interval '1 day'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '55555555-5555-5555-5555-555555555555',
    'seed_tx_002',
    1200000,
    'NGN',
    'POS Terminal',
    'Abuja',
    'device_new',
    '127.0.0.1',
    'mobile',
    69,
    '[{"type":"amount_deviation","severity":"high","ratio":4.8},{"type":"new_device","severity":"medium","device_id":"device_new"}]'::jsonb,
    'block',
    'This payment was much larger than usual and came from a device we do not recognize, so it was blocked for safety.',
    'flagged',
    now() - interval '4 hours'
  );

insert into audit_logs (org_id, user_id, action, resource, metadata)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '44444444-4444-4444-4444-444444444444',
    'org.seeded',
    'organizations',
    '{"source":"seed"}'
  );
