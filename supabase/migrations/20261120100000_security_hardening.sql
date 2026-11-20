-- Imperial Home — security hardening.
-- Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
--
-- 1. Admin rights from the bootstrap list are granted ONLY to verified e-mail addresses.
-- 2. Push delivery functions (VAPID private key) are reserved to the service role.
-- 3. Generic rate limiting for Edge Functions (register, assistant, translate).

-- ---------------------------------------------------------------- 1. verified bootstrap admins

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

  if new.email is not null
     and new.email_confirmed_at is not null
     and lower(trim(new.email)) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(new.id);
  end if;

  return new;
end;
$$;

-- When the address is confirmed later (link in the inbox), grant the bootstrap role at that moment.
create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and old.email_confirmed_at is null
     and new.email is not null
     and lower(trim(new.email)) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_confirmed();

revoke all on function public.handle_user_confirmed() from public, anon, authenticated;

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users%rowtype;
  v_profile public.profiles%rowtype;
begin
  select * into v_user from auth.users where id = auth.uid();
  if not found then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_user.id;
  if found then
    return v_profile;
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    v_user.id,
    v_user.email,
    coalesce(v_user.raw_user_meta_data ->> 'full_name', split_part(v_user.email, '@', 1), ''),
    v_user.raw_user_meta_data ->> 'phone',
    'customer'
  )
  returning * into v_profile;

  if v_user.email is not null
     and v_user.email_confirmed_at is not null
     and lower(trim(v_user.email)) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(v_user.id);
    select * into v_profile from public.profiles where id = v_user.id;
  end if;

  return v_profile;
end;
$$;
grant execute on function public.ensure_profile() to authenticated;

-- Any staff account whose address was never verified loses its rights until it is.
update public.profiles p
  set role = 'customer'
  from auth.users u
  where u.id = p.id
    and u.email_confirmed_at is null
    and p.role in ('admin', 'main_admin', 'super_admin');

-- ---------------------------------------------------------------- 2. push functions: service role only

revoke execute on function public.init_push_keys(text, text) from anon, authenticated, public;
revoke execute on function public.claim_push(uuid) from anon, authenticated, public;
revoke execute on function public.drop_push_endpoint(uuid, text) from anon, authenticated, public;
grant execute on function public.init_push_keys(text, text) to service_role;
grant execute on function public.claim_push(uuid) to service_role;
grant execute on function public.drop_push_endpoint(uuid, text) to service_role;

-- ---------------------------------------------------------------- 3. rate limiting

create table if not exists public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.hit_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_hits integer;
begin
  v_start := to_timestamp(floor(extract(epoch from now()) / greatest(p_window_seconds, 1)) * greatest(p_window_seconds, 1));
  insert into public.rate_limits (bucket, window_start, hits)
  values (left(p_bucket, 200), v_start, 1)
  on conflict (bucket, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits <= p_limit;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
