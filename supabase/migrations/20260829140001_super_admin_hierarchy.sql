-- Step 2 of 2. Hierarchy: super_admin > main_admin > admin > customer.
--   super_admin  stivelandry16@gmail.com : controls everything, can never be removed or changed.
--   main_admin   imperialhome237@gmail.com : appoints and removes simple admins only.
--   admin        works on reservations, properties... cannot touch any other admin.

insert into public.system_config (key, value) values
  ('super_admin_email', to_jsonb('stivelandry16@gmail.com'::text)),
  ('bootstrap_admin_emails', '["imperialhome237@gmail.com", "stivelandry16@gmail.com"]'::jsonb),
  ('bootstrap_admin_email', to_jsonb('imperialhome237@gmail.com, stivelandry16@gmail.com'::text))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- The real role of the signed-in user.
create or replace function public.actor_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Existing policies and functions test current_role() = 'main_admin'. The super admin passes all of them.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select case when role = 'super_admin' then 'main_admin'::public.user_role else role end
  from public.profiles where id = auth.uid()
$$;

create or replace function public.role_rank(p_role public.user_role)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'super_admin' then 3
    when 'main_admin' then 2
    when 'admin' then 1
    else 0
  end
$$;

grant execute on function public.actor_role() to authenticated;
grant execute on function public.role_rank(public.user_role) to authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    left join public.admin_profiles a on a.id = p.id
    where p.id = auth.uid()
      and p.role in ('admin', 'main_admin', 'super_admin')
      and coalesce(a.is_active, p.role in ('main_admin', 'super_admin'))
  )
$$;

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.actor_role());

drop policy if exists config_main_admin_write on public.system_config;
create policy config_main_admin_write on public.system_config
  for all
  using (
    public.actor_role() = 'super_admin'
    or (public.current_role() = 'main_admin' and key not in ('bootstrap_admin_emails', 'bootstrap_admin_email', 'super_admin_email'))
  )
  with check (
    public.actor_role() = 'super_admin'
    or (public.current_role() = 'main_admin' and key not in ('bootstrap_admin_emails', 'bootstrap_admin_email', 'super_admin_email'))
  );

-- Bootstrap: the super admin e-mail becomes super_admin, the other bootstrap e-mails become main_admin.
create or replace function public.grant_bootstrap_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_current public.user_role;
  v_role public.user_role;
  v_super text;
begin
  perform set_config('ih.bootstrap', '1', true);

  select lower(trim(email)), role into v_email, v_current from public.profiles where id = p_user_id;
  select lower(trim(c.value #>> '{}')) into v_super from public.system_config c where c.key = 'super_admin_email';

  if v_email is not null and v_email = v_super then
    v_role := 'super_admin';
  elsif v_current = 'super_admin' then
    v_role := 'super_admin';
  else
    v_role := 'main_admin';
  end if;

  update public.profiles set role = v_role where id = p_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title)
  values (
    p_user_id,
    true,
    true,
    case v_role when 'super_admin' then 'Super administrateur' else 'Main admin' end
  )
  on conflict (id) do update
    set is_active = true,
        is_verified = true,
        title = excluded.title;

  insert into public.admin_permissions (admin_id, permission)
  select p_user_id, perm
  from unnest(array[
    'properties','reservations','customers','promotions',
    'payments','documents','chat','administrators'
  ]) as perm
  on conflict do nothing;
end;
$$;

-- These two were callable by any signed-in user through the API.
revoke all on function public.grant_bootstrap_admin(uuid) from public, anon, authenticated;
revoke all on function public.bootstrap_admin_emails() from public, anon, authenticated;

-- Guards: even direct table updates cannot break the hierarchy.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.user_role;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;
  if auth.uid() is null or current_setting('ih.bootstrap', true) = '1' then
    return new;
  end if;
  v_actor := public.actor_role();

  if old.role = 'super_admin' then
    raise exception 'The super administrator cannot be changed' using errcode = '42501';
  end if;
  if new.role = 'super_admin' then
    raise exception 'The super administrator cannot be created from the app' using errcode = '42501';
  end if;
  if v_actor = 'super_admin' then
    return new;
  end if;
  if v_actor = 'main_admin' and old.role in ('customer', 'admin') and new.role in ('customer', 'admin') then
    return new;
  end if;
  raise exception 'Not allowed to change this role' using errcode = '42501';
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update of role on public.profiles
  for each row execute function public.guard_profile_role();

create or replace function public.guard_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.user_role;
  v_target public.user_role;
  v_self boolean;
begin
  if auth.uid() is null or current_setting('ih.bootstrap', true) = '1' then
    return coalesce(new, old);
  end if;
  v_actor := public.actor_role();
  select role into v_target from public.profiles where id = old.id;
  v_self := auth.uid() = old.id;

  if v_target = 'super_admin' then
    if tg_op = 'DELETE' or not v_self then
      raise exception 'The super administrator cannot be removed or changed' using errcode = '42501';
    end if;
    if new.is_active = false then
      raise exception 'The super administrator cannot be removed or changed' using errcode = '42501';
    end if;
    return new;
  end if;

  if v_target = 'main_admin' then
    if v_actor = 'super_admin' then
      return coalesce(new, old);
    end if;
    if v_self and tg_op = 'UPDATE' and new.is_active = old.is_active then
      return new;
    end if;
    raise exception 'Only the super administrator can change a main administrator' using errcode = '42501';
  end if;

  if v_actor in ('super_admin', 'main_admin') then
    return coalesce(new, old);
  end if;
  if v_self and tg_op = 'UPDATE' and new.is_active = old.is_active and new.is_verified = old.is_verified then
    return new;
  end if;
  raise exception 'Simple administrators cannot manage other administrators' using errcode = '42501';
end;
$$;

drop trigger if exists admin_profiles_guard on public.admin_profiles;
create trigger admin_profiles_guard
  before update or delete on public.admin_profiles
  for each row execute function public.guard_admin_profile();

create or replace function public.guard_admin_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.user_role;
  v_target public.user_role;
  v_admin uuid;
begin
  if auth.uid() is null or current_setting('ih.bootstrap', true) = '1' then
    return coalesce(new, old);
  end if;
  v_admin := coalesce(new.admin_id, old.admin_id);
  v_actor := public.actor_role();
  select role into v_target from public.profiles where id = v_admin;

  if v_actor = 'super_admin' then
    return coalesce(new, old);
  end if;
  if v_actor = 'main_admin' and v_target not in ('super_admin', 'main_admin') then
    return coalesce(new, old);
  end if;
  raise exception 'Not allowed to change these permissions' using errcode = '42501';
end;
$$;

drop trigger if exists admin_permissions_guard on public.admin_permissions;
create trigger admin_permissions_guard
  before insert or update or delete on public.admin_permissions
  for each row execute function public.guard_admin_permissions();

-- Management functions.
create or replace function public.promote_user_to_admin(
  p_email text,
  p_title text default 'Administrateur'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_target public.user_role;
begin
  if public.actor_role() not in ('main_admin', 'super_admin') then
    raise exception 'Only the main administrator can appoint admins';
  end if;

  select id, role into v_user_id, v_target
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No account found for this email. Ask the person to register first.';
  end if;
  if v_target in ('main_admin', 'super_admin') then
    raise exception 'This user already has a higher administrator role';
  end if;

  update public.profiles set role = 'admin' where id = v_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (v_user_id, true, true, coalesce(nullif(trim(p_title), ''), 'Administrateur'), auth.uid())
  on conflict (id) do update
    set is_active = true,
        is_verified = true,
        title = coalesce(nullif(trim(p_title), ''), admin_profiles.title);

  insert into public.admin_permissions (admin_id, permission)
  select v_user_id, perm
  from unnest(array[
    'properties', 'reservations', 'customers', 'promotions',
    'payments', 'documents', 'chat', 'administrators'
  ]) as perm
  on conflict do nothing;

  return v_user_id;
end;
$$;

create or replace function public.promote_user_to_main_admin(
  p_email text,
  p_title text default 'Main admin'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_target public.user_role;
begin
  if public.actor_role() <> 'super_admin' then
    raise exception 'Only the super administrator can appoint a main administrator';
  end if;

  select id, role into v_user_id, v_target
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No account found for this email. Ask the person to register first.';
  end if;
  if v_target = 'super_admin' then
    raise exception 'This user is the super administrator';
  end if;

  update public.profiles set role = 'main_admin' where id = v_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (v_user_id, true, true, coalesce(nullif(trim(p_title), ''), 'Main admin'), auth.uid())
  on conflict (id) do update
    set is_active = true,
        is_verified = true,
        title = coalesce(nullif(trim(p_title), ''), admin_profiles.title);

  insert into public.admin_permissions (admin_id, permission)
  select v_user_id, perm
  from unnest(array[
    'properties', 'reservations', 'customers', 'promotions',
    'payments', 'documents', 'chat', 'administrators'
  ]) as perm
  on conflict do nothing;

  return v_user_id;
end;
$$;

create or replace function public.deactivate_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.user_role;
  v_target public.user_role;
begin
  v_actor := public.actor_role();
  if v_actor not in ('main_admin', 'super_admin') then
    raise exception 'Only the main administrator can remove admins';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself';
  end if;

  select role into v_target from public.profiles where id = p_user_id;
  if v_target = 'super_admin' then
    raise exception 'The super administrator cannot be removed';
  end if;
  if public.role_rank(v_actor) <= public.role_rank(v_target) then
    raise exception 'You cannot remove an administrator of the same or higher level';
  end if;

  update public.admin_profiles set is_active = false where id = p_user_id;
  update public.profiles set role = 'customer' where id = p_user_id;
end;
$$;

create or replace function public.reactivate_admin(
  p_user_id uuid,
  p_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.user_role;
begin
  if public.actor_role() not in ('main_admin', 'super_admin') then
    raise exception 'Only the main administrator can reactivate admins';
  end if;
  select role into v_target from public.profiles where id = p_user_id;
  if v_target in ('main_admin', 'super_admin') then
    raise exception 'This user already has a higher administrator role';
  end if;

  update public.profiles set role = 'admin' where id = p_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (p_user_id, true, true, coalesce(nullif(trim(p_title), ''), 'Administrateur'), auth.uid())
  on conflict (id) do update
    set is_active = true,
        is_verified = true,
        title = coalesce(nullif(trim(p_title), ''), admin_profiles.title);

  insert into public.admin_permissions (admin_id, permission)
  select p_user_id, perm
  from unnest(array[
    'properties', 'reservations', 'customers', 'promotions',
    'payments', 'documents', 'chat', 'administrators'
  ]) as perm
  on conflict do nothing;
end;
$$;

grant execute on function public.promote_user_to_admin(text, text) to authenticated;
grant execute on function public.promote_user_to_main_admin(text, text) to authenticated;
grant execute on function public.deactivate_admin(uuid) to authenticated;
grant execute on function public.reactivate_admin(uuid, text) to authenticated;

-- Functions that list administrators must include the super admin.
do $$
declare
  r record;
  v_def text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    v_def := pg_get_functiondef(r.oid);
    if v_def ~ '\(\s*''admin''\s*,\s*''main_admin''\s*\)' then
      begin
        execute regexp_replace(v_def, '\(\s*''admin''\s*,\s*''main_admin''\s*\)', '(''admin'', ''main_admin'', ''super_admin'')', 'g');
      exception when others then
        raise notice 'Skipped function %: %', r.oid::regprocedure, sqlerrm;
      end;
    end if;
  end loop;
end;
$$;

-- Transfer: stivelandry16@gmail.com becomes super admin, imperialhome237@gmail.com becomes main admin.
do $$
declare
  rec record;
begin
  for rec in
    select id from public.profiles
    where lower(trim(email)) in ('stivelandry16@gmail.com', 'imperialhome237@gmail.com')
  loop
    perform public.grant_bootstrap_admin(rec.id);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
