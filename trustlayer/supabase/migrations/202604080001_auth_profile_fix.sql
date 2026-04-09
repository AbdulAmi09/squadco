create or replace function public.current_user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.users where id = auth.uid()
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'super_admin', false)
$$;

drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users
for select using (
  id = auth.uid()
  or public.is_super_admin()
  or org_id = public.current_user_org_id()
);

drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users
for update using (
  id = auth.uid()
  or public.is_super_admin()
  or org_id = public.current_user_org_id()
);
