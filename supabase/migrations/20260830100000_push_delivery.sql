-- Phone / desktop push: every row inserted in public.notifications is also sent to the user's devices
-- (system notification bar), even when the app is closed. Delivery is done by the Vercel function /api/push,
-- called from the database with pg_net. No secret lives in the repository: the VAPID key pair is generated
-- once by the function itself and stored in public.push_config (not readable by the app roles).

do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then
  raise notice 'pg_net could not be enabled automatically (%): enable it in Database > Extensions', sqlerrm;
end $$;

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create table if not exists public.push_config (
  id boolean primary key default true check (id),
  public_key text,
  private_key text,
  endpoint text not null default 'https://imperial-home.vercel.app/api/push'
);
insert into public.push_config (id) values (true) on conflict do nothing;
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from anon, authenticated;

create or replace function public.push_public_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public_key from public.push_config where id;
$$;

create or replace function public.init_push_keys(p_public text, p_private text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.push_config set public_key = p_public, private_key = p_private
  where id and public_key is null and private_key is null and length(p_public) > 40 and length(p_private) > 20;
  return (select public_key from public.push_config where id);
end;
$$;

create or replace function public.register_push(p_endpoint text, p_subscription jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, subscription)
  values (p_endpoint, auth.uid(), p_subscription)
  on conflict (endpoint) do update set user_id = auth.uid(), subscription = excluded.subscription;
end;
$$;

create or replace function public.unregister_push(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

create or replace function public.claim_push(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.push_outbox;
  v_cfg public.push_config;
  v_subs jsonb;
begin
  update public.push_outbox set claimed_at = now()
  where id = p_id and claimed_at is null and created_at > now() - interval '10 minutes'
  returning * into v_row;
  if v_row.id is null then
    return null;
  end if;
  select * into v_cfg from public.push_config where id;
  if v_cfg.public_key is null or v_cfg.private_key is null then
    return null;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'subscription', subscription)), '[]'::jsonb)
  into v_subs from public.push_subscriptions where user_id = v_row.user_id;
  return jsonb_build_object(
    'title', v_row.title,
    'body', coalesce(v_row.body, ''),
    'link', coalesce(v_row.link, '/'),
    'publicKey', v_cfg.public_key,
    'privateKey', v_cfg.private_key,
    'subscriptions', v_subs
  );
end;
$$;

create or replace function public.drop_push_endpoint(p_id uuid, p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and user_id = (select user_id from public.push_outbox where id = p_id and created_at > now() - interval '1 hour');
$$;

revoke all on function public.push_public_key() from public;
revoke all on function public.init_push_keys(text, text) from public;
revoke all on function public.register_push(text, jsonb) from public;
revoke all on function public.unregister_push(text) from public;
revoke all on function public.claim_push(uuid) from public;
revoke all on function public.drop_push_endpoint(uuid, text) from public;
grant execute on function public.push_public_key() to anon, authenticated;
grant execute on function public.init_push_keys(text, text) to anon, authenticated;
grant execute on function public.register_push(text, jsonb) to authenticated;
grant execute on function public.unregister_push(text) to authenticated;
grant execute on function public.claim_push(uuid) to anon, authenticated;
grant execute on function public.drop_push_endpoint(uuid, text) to anon, authenticated;

create or replace function public.on_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_url text;
begin
  begin
    if not exists (select 1 from public.push_subscriptions where user_id = new.user_id) then
      return new;
    end if;
    select endpoint into v_url from public.push_config where id;
    if v_url is null then
      return new;
    end if;
    delete from public.push_outbox where created_at < now() - interval '1 day';
    insert into public.push_outbox (user_id, title, body, link)
    values (new.user_id, new.title, new.body, new.link)
    returning id into v_id;
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('id', v_id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

revoke all on function public.on_notification_push() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  after insert on public.notifications
  for each row
  execute function public.on_notification_push();

notify pgrst, 'reload schema';
