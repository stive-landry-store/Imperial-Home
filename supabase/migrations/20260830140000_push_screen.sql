-- Keep the phone delivery queued even if the network call fails, and let the open app
-- send whatever is still waiting (including one test the first time).

create or replace function public.on_notification_push()
returns trigger
language plpgsql
security definer
set search_path = public, net
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
    begin
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object('id', v_id),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 5000
      );
    exception when others then
      null;
    end;
  exception when others then
    null;
  end;
  return new;
end;
$$;

revoke all on function public.on_notification_push() from public, anon, authenticated;

create or replace function public.pending_pushes()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(id), '{}')
  from public.push_outbox
  where user_id = auth.uid()
    and claimed_at is null
    and created_at > now() - interval '1 day';
$$;

create or replace function public.push_ping()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;
  if not exists (select 1 from public.push_subscriptions where user_id = auth.uid()) then
    return null;
  end if;
  insert into public.push_outbox (user_id, title, body, link)
  values (auth.uid(), 'Imperial Home', 'Les notifications arrivent sur l’écran du téléphone.', '/account')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.pending_pushes() from public;
revoke all on function public.push_ping() from public;
grant execute on function public.pending_pushes() to authenticated;
grant execute on function public.push_ping() to authenticated;

notify pgrst, 'reload schema';
