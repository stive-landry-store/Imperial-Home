-- Allow several bootstrap admin emails (official + owner)

insert into public.system_config (key, value) values
  ('bootstrap_admin_emails', '["imperialhome237@gmail.com", "stivelandry16@gmail.com"]'::jsonb)
on conflict (key) do update
  set value = excluded.value, updated_at = now();

insert into public.system_config (key, value) values
  ('bootstrap_admin_email', to_jsonb('imperialhome237@gmail.com, stivelandry16@gmail.com'::text))
on conflict (key) do update
  set value = excluded.value, updated_at = now();

create or replace function public.bootstrap_admin_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(lower(trim(e)))
      from public.system_config c,
           lateral jsonb_array_elements_text(c.value) as e
      where c.key = 'bootstrap_admin_emails'
        and jsonb_typeof(c.value) = 'array'
    ),
    (
      select array_agg(lower(trim(x))) filter (where length(trim(x)) > 0)
      from public.system_config c,
           lateral unnest(string_to_array(c.value #>> '{}', ',')) as x
      where c.key = 'bootstrap_admin_email'
    ),
    '{}'::text[]
  );
$$;

create or replace function public.grant_bootstrap_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.user_role;
  v_role public.user_role;
begin
  select role into v_current from public.profiles where id = p_user_id;
  if v_current = 'main_admin' then
    v_role := 'main_admin';
  elsif exists (select 1 from public.profiles where role = 'main_admin') then
    v_role := 'admin';
  else
    v_role := 'main_admin';
  end if;

  update public.profiles
    set role = v_role
    where id = p_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title)
  values (
    p_user_id,
    true,
    true,
    case when v_role = 'main_admin' then 'Main Administrator' else 'Administrator' end
  )
  on conflict (id) do update
    set is_active = true,
        is_verified = true;

  insert into public.admin_permissions (admin_id, permission)
  select p_user_id, perm
  from unnest(array[
    'properties','reservations','customers','promotions',
    'payments','documents','chat','administrators'
  ]) as perm
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_phone := new.raw_user_meta_data ->> 'phone';

  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, new.email, v_name, v_phone, 'customer')
  on conflict (id) do nothing;

  if new.email is not null and lower(new.email) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(new.id);
  end if;

  return new;
end;
$$;

do $$
declare
  rec record;
begin
  for rec in
    select id
    from public.profiles
    where email is not null
      and lower(email) = any(public.bootstrap_admin_emails())
      and (
        role = 'customer'
        or not exists (select 1 from public.admin_profiles ap where ap.id = profiles.id)
      )
  loop
    perform public.grant_bootstrap_admin(rec.id);
  end loop;
end;
$$;
