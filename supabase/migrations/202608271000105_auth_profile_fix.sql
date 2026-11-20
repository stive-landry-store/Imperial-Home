-- Repair missing profiles + safer signup trigger

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
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email),
        full_name = case when length(trim(excluded.full_name)) > 0 then excluded.full_name else profiles.full_name end,
        phone = coalesce(excluded.phone, profiles.phone);

  if new.email is not null and lower(new.email) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(new.id);
  end if;

  return new;
end;
$$;

-- Creates a profile row if the auth trigger did not run (legacy users)
create or replace function public.ensure_user_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if found then
    return v_profile;
  end if;

  select * into v_user from auth.users where id = v_uid;
  if not found then
    raise exception 'User not found';
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    v_user.id,
    v_user.email,
    coalesce(v_user.raw_user_meta_data ->> 'full_name', ''),
    v_user.raw_user_meta_data ->> 'phone',
    'customer'
  )
  on conflict (id) do update
    set email = coalesce(excluded.email, profiles.email)
  returning * into v_profile;

  if v_user.email is not null and lower(v_user.email) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(v_user.id);
    select * into v_profile from public.profiles where id = v_uid;
  end if;

  return v_profile;
end;
$$;

grant execute on function public.ensure_user_profile() to authenticated;
