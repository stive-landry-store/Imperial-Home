-- Lock-screen delivery for the owner (super admin) and every administrator.
-- The phone can finish a send itself when the database network call does not.

alter table public.notifications add column if not exists push_job uuid;

create or replace function public.notify_admins_new_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from public.properties where id = new.property_id;
  insert into public.notifications (user_id, title, body, link)
  select p.id,
         'Nouvelle réservation',
         new.public_code || ' · ' || coalesce(v_name, '') || ' · ' || new.check_in::text || ' → ' || new.check_out::text,
         '/admin/reservations/' || new.id::text
  from public.profiles p
  where p.role in ('admin', 'main_admin', 'super_admin');
  return new;
end;
$$;

create or replace function public.on_human_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if new.needs_human
     and new.assigned_admin_id is null
     and (tg_op = 'INSERT' or not coalesce(old.needs_human, false)) then
    select coalesce(nullif(trim(full_name), ''), email, 'Client')
    into v_name
    from public.profiles
    where id = new.customer_id;

    insert into public.notifications (user_id, title, body, link)
    select p.id,
           'Assistance demandée',
           coalesce(v_name, 'Client') || ' souhaite parler à un administrateur.',
           '/admin/chat'
    from public.profiles p
    where p.role in ('admin', 'main_admin', 'super_admin');
  end if;
  return new;
end;
$$;

create or replace function public.notify_admins_payment_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if new.status::text <> 'processing' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'processing' then
    return new;
  end if;
  select public_code into v_code from public.reservations where id = new.reservation_id;
  insert into public.notifications (user_id, title, body, link)
  select p.id,
         'Paiement à vérifier',
         coalesce(v_code, 'Réservation') || ' · un reçu vient d’arriver.',
         '/admin/reservations/' || new.reservation_id::text
  from public.profiles p
  where p.role in ('admin', 'main_admin', 'super_admin');
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists payments_notify_admins on public.payments;
create trigger payments_notify_admins
  after insert or update of status on public.payments
  for each row
  execute function public.notify_admins_payment_receipt();

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
    delete from public.push_outbox where created_at < now() - interval '1 day';
    insert into public.push_outbox (user_id, title, body, link)
    values (new.user_id, new.title, new.body, new.link)
    returning id into v_id;
    new.push_job := v_id;
    if v_url is not null then
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
    end if;
  exception when others then
    null;
  end;
  return new;
end;
$$;

revoke all on function public.on_notification_push() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
  before insert on public.notifications
  for each row
  execute function public.on_notification_push();

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

create or replace function public.release_push(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_outbox
  set claimed_at = null
  where id = p_id
    and created_at > now() - interval '1 day';
$$;

revoke all on function public.pending_pushes() from public;
revoke all on function public.push_ping() from public;
revoke all on function public.release_push(uuid) from public;
grant execute on function public.pending_pushes() to authenticated;
grant execute on function public.push_ping() to authenticated;
grant execute on function public.release_push(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
