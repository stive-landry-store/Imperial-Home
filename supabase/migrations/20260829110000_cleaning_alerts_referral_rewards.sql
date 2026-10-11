-- Cleaning visits announced to guests (message + notification), admin alerts for new bookings,
-- and 10 % referral reward codes that reuse the existing promotion codes.

alter table public.turnover_tasks add column if not exists scheduled_time time;
alter table public.turnover_tasks add column if not exists notified_at timestamptz;

create or replace function public.schedule_cleaning(
  p_reservation_id uuid,
  p_date date,
  p_time time,
  p_note text default null,
  p_task_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
  v_prop text;
  v_conv uuid;
  v_text text;
  v_when text;
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id;
  if not found then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;
  select name into v_prop from public.properties where id = v_res.property_id;

  if p_task_id is not null then
    update public.turnover_tasks
    set due_on = p_date, scheduled_time = p_time, notified_at = now()
    where id = p_task_id and reservation_id = p_reservation_id;
  else
    insert into public.turnover_tasks (reservation_id, property_id, title, due_on, scheduled_time, notified_at)
    values (p_reservation_id, v_res.property_id, 'Passage du service de nettoyage', p_date, p_time, now());
  end if;

  v_when := to_char(p_date, 'DD/MM/YYYY') || ' à ' || to_char(p_time, 'HH24"h"MI');
  v_text := 'Le service de nettoyage passera dans ' || coalesce(v_prop, 'votre logement') || ' le ' || v_when || '.'
    || case when p_note is not null and length(trim(p_note)) > 0 then ' ' || trim(p_note) else '' end;

  insert into public.notifications (user_id, title, body, link)
  values (v_res.customer_id, 'Passage du service de nettoyage', v_text, '/account/reservations/' || v_res.id::text);

  select id into v_conv
  from public.conversations
  where customer_id = v_res.customer_id
  order by last_message_at desc nulls last, created_at desc
  limit 1;
  if v_conv is null then
    insert into public.conversations (customer_id, property_id, reservation_id, status)
    values (v_res.customer_id, v_res.property_id, v_res.id, 'open')
    returning id into v_conv;
  end if;
  insert into public.messages (conversation_id, sender_id, role, body)
  values (v_conv, auth.uid(), 'admin', v_text);

  perform public.write_audit('schedule_cleaning', 'reservation', v_res.id, null,
    jsonb_build_object('date', p_date, 'time', p_time, 'note', p_note));

  return jsonb_build_object('ok', true, 'message', v_text);
end;
$$;

grant execute on function public.schedule_cleaning(uuid, date, time, text, uuid) to authenticated;

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
  where p.role in ('admin', 'main_admin');
  return new;
end;
$$;

drop trigger if exists reservations_notify_admins on public.reservations;
create trigger reservations_notify_admins
  after insert on public.reservations
  for each row execute function public.notify_admins_new_reservation();

create table if not exists public.referral_rewards (
  referred_id uuid primary key references public.profiles (id) on delete cascade,
  referrer_code text,
  friend_code text,
  created_at timestamptz not null default now()
);
alter table public.referral_rewards enable row level security;

create or replace function public.make_referral_code(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  v_code := 'AMI' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into public.promotions (name, discount_type, discount_value, starts_at, ends_at, is_active, code)
  values (p_name, 'percent', 10, current_date, current_date + 90, true, v_code);
  return v_code;
end;
$$;

create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer uuid;
  v_friend_code text;
begin
  if auth.uid() is null or p_code is null or char_length(p_code) < 6 then
    return false;
  end if;
  select id into referrer
  from public.profiles
  where id::text like lower(p_code) || '%'
  limit 1;
  if referrer is null or referrer = auth.uid() then
    return false;
  end if;
  update public.profiles
  set referred_by = referrer
  where id = auth.uid() and referred_by is null;
  if not found then
    return false;
  end if;

  v_friend_code := public.make_referral_code('Parrainage - bienvenue');
  insert into public.referral_rewards (referred_id, friend_code)
  values (auth.uid(), v_friend_code)
  on conflict (referred_id) do nothing;
  insert into public.notifications (user_id, title, body, link)
  values (
    auth.uid(),
    'Bienvenue chez Impérial Home',
    'Votre ami vous offre 10 % sur votre premier séjour. Code promo : ' || v_friend_code || ' (valable 90 jours).',
    '/properties'
  );
  return true;
end;
$$;

create or replace function public.reward_referrer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer uuid;
  v_code text;
  v_done boolean;
begin
  if new.status <> 'confirmed' or old.status = 'confirmed' then
    return new;
  end if;
  select referred_by into v_referrer from public.profiles where id = new.customer_id;
  if v_referrer is null then
    return new;
  end if;
  select referrer_code is not null into v_done from public.referral_rewards where referred_id = new.customer_id;
  if coalesce(v_done, false) then
    return new;
  end if;
  v_code := public.make_referral_code('Parrainage - parrain');
  insert into public.referral_rewards (referred_id, referrer_code)
  values (new.customer_id, v_code)
  on conflict (referred_id) do update set referrer_code = excluded.referrer_code;
  insert into public.notifications (user_id, title, body, link)
  values (
    v_referrer,
    'Merci pour votre parrainage',
    'Votre ami a réservé. Voici 10 % pour votre prochain séjour. Code promo : ' || v_code || ' (valable 90 jours).',
    '/properties'
  );
  return new;
end;
$$;

drop trigger if exists reservations_reward_referrer on public.reservations;
create trigger reservations_reward_referrer
  after update of status on public.reservations
  for each row execute function public.reward_referrer();
