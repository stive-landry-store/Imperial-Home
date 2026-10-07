-- Persist admin edits on the public site + main_admin can appoint admins

-- Public visitors must read the homepage fiche image URL
drop policy if exists config_public_read on public.system_config;
create policy config_public_read on public.system_config
  for select using (
    key in (
      'phone', 'whatsapp', 'email', 'payment_instructions_en',
      'payment_instructions_fr', 'hold_minutes', 'brand_name', 'city',
      'home_fiche_image_url'
    )
    or public.is_staff()
  );

-- Staff can update site content; bootstrap emails remain main_admin only
drop policy if exists config_admin_write on public.system_config;
create policy config_main_admin_write on public.system_config
  for all using (public.current_role() = 'main_admin')
  with check (public.current_role() = 'main_admin');

create policy config_staff_insert on public.system_config
  for insert with check (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url'
    )
  );

create policy config_staff_update on public.system_config
  for update using (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url'
    )
  )
  with check (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url'
    )
  );

-- Main admin promotes an existing registered user to administrator
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
begin
  if public.current_role() <> 'main_admin' then
    raise exception 'Only the main administrator can appoint admins';
  end if;

  select id into v_user_id
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No account found for this email. Ask the person to register first.';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id and role = 'main_admin') then
    raise exception 'This user is already the main administrator';
  end if;

  update public.profiles set role = 'admin' where id = v_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (
    v_user_id,
    false,
    true,
    coalesce(nullif(trim(p_title), ''), 'Administrateur'),
    auth.uid()
  )
  on conflict (id) do update
    set is_active = true,
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

-- Main admin can deactivate an administrator (not main_admin)
create or replace function public.deactivate_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'main_admin' then
    raise exception 'Only the main administrator can deactivate admins';
  end if;

  if exists (select 1 from public.profiles where id = p_user_id and role = 'main_admin') then
    raise exception 'Cannot deactivate the main administrator';
  end if;

  update public.admin_profiles set is_active = false where id = p_user_id;
  update public.profiles set role = 'customer' where id = p_user_id;
end;
$$;

-- Main admin can reactivate a former administrator
create or replace function public.reactivate_admin(
  p_user_id uuid,
  p_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'main_admin' then
    raise exception 'Only the main administrator can reactivate admins';
  end if;

  update public.profiles set role = 'admin' where id = p_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (
    p_user_id,
    false,
    true,
    coalesce(nullif(trim(p_title), ''), 'Administrateur'),
    auth.uid()
  )
  on conflict (id) do update
    set is_active = true,
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
grant execute on function public.deactivate_admin(uuid) to authenticated;
grant execute on function public.reactivate_admin(uuid, text) to authenticated;
