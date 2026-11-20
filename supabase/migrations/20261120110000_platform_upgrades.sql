-- Imperial Home — platform upgrades.
-- Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
--
--  1. Seasonal, weekend and long-stay pricing
--  2. Two-way iCal: import Airbnb / Booking calendars as blocks
--  3. Verified public reviews
--  4. Contactless check-in (access code, arrival guide, J-1 message) + e-mail / WhatsApp bookkeeping
--  5. Admin two-factor policy flag

-- =============================================================== 1. pricing

create table if not exists public.seasonal_rates (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade, -- null = every apartment
  label text not null default '',
  starts_on date not null,
  ends_on date not null,
  nightly_rate_xaf integer check (nightly_rate_xaf is null or nightly_rate_xaf > 0),
  adjust_percent integer not null default 0 check (adjust_percent between -90 and 300),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index if not exists seasonal_rates_lookup on public.seasonal_rates (property_id, starts_on, ends_on) where is_active;
alter table public.seasonal_rates enable row level security;

drop policy if exists seasonal_rates_read on public.seasonal_rates;
create policy seasonal_rates_read on public.seasonal_rates for select using (true);
drop policy if exists seasonal_rates_staff on public.seasonal_rates;
create policy seasonal_rates_staff on public.seasonal_rates for all
  using (public.is_staff()) with check (public.is_staff());
grant select on public.seasonal_rates to anon, authenticated;
grant insert, update, delete on public.seasonal_rates to authenticated;

alter table public.properties
  add column if not exists weekend_percent integer not null default 0 check (weekend_percent between -50 and 200);
alter table public.properties
  add column if not exists weekly_discount_percent integer not null default 0;
alter table public.properties
  add column if not exists monthly_discount_percent integer not null default 0;

-- Rate for one night: seasonal fixed rate (apartment first, then global), then % adjustments, then weekend.
create or replace function public.night_rate(p_property_id uuid, p_night date)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_base integer;
  v_weekend integer;
  v_season record;
  v_rate numeric;
begin
  select nightly_rate_xaf, coalesce(weekend_percent, 0) into v_base, v_weekend
  from public.properties where id = p_property_id;
  if v_base is null then
    return null;
  end if;

  select s.nightly_rate_xaf, s.adjust_percent into v_season
  from public.seasonal_rates s
  where s.is_active
    and p_night between s.starts_on and s.ends_on
    and (s.property_id = p_property_id or s.property_id is null)
  order by (s.property_id is null), s.starts_on desc
  limit 1;

  v_rate := coalesce(v_season.nightly_rate_xaf, v_base);
  v_rate := v_rate * (100 + coalesce(v_season.adjust_percent, 0)) / 100.0;
  -- Friday and Saturday nights.
  if extract(isodow from p_night) in (5, 6) then
    v_rate := v_rate * (100 + v_weekend) / 100.0;
  end if;
  return greatest(1, round(v_rate))::integer;
end;
$$;
grant execute on function public.night_rate(uuid, date) to anon, authenticated;

create or replace function public.price_stay(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_promo_code text default null,
  p_service_ids uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_rate integer;
  v_capacity integer;
  v_nights integer;
  v_base integer := 0;
  v_discount integer := 0;
  v_long integer := 0;
  v_long_pct integer := 0;
  v_services integer := 0;
  v_cleaning integer := 0;
  v_deposit integer := 0;
  v_weekly integer := 0;
  v_monthly integer := 0;
  v_name text := null;
  v_promo_id uuid := null;
  v_type public.discount_type;
  v_value numeric;
  v_nightly jsonb := '[]'::jsonb;
  v_day date;
  v_night integer;
begin
  select nightly_rate_xaf, capacity, coalesce(cleaning_fee_xaf, 0), coalesce(security_deposit_xaf, 0),
         coalesce(weekly_discount_percent, 0), coalesce(monthly_discount_percent, 0)
    into v_rate, v_capacity, v_cleaning, v_deposit, v_weekly, v_monthly
  from public.properties
  where id = p_property_id;
  if not found then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;

  v_nights := p_check_out - p_check_in;
  if v_nights < 1 then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  if p_guest_count < 1 or p_guest_count > v_capacity then
    raise exception 'Invalid guest count' using errcode = '22023';
  end if;

  v_day := p_check_in;
  while v_day < p_check_out loop
    v_night := public.night_rate(p_property_id, v_day);
    v_base := v_base + v_night;
    v_nightly := v_nightly || jsonb_build_object('date', v_day, 'rate', v_night);
    v_day := v_day + 1;
  end loop;

  -- Long stays: monthly from 28 nights, weekly from 7 nights.
  if v_nights >= 28 and v_monthly > 0 then
    v_long_pct := v_monthly;
  elsif v_nights >= 7 and v_weekly > 0 then
    v_long_pct := v_weekly;
  end if;
  v_long := floor(v_base * least(v_long_pct, 90) / 100.0)::integer;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select p.id, p.name, p.discount_type, p.discount_value
      into v_promo_id, v_name, v_type, v_value
    from public.promotions p
    where p.is_active
      and p.code is not null
      and lower(p.code) = lower(trim(p_promo_code))
      and current_date between p.starts_at and p.ends_at
      and (
        not exists (select 1 from public.promotion_properties pp where pp.promotion_id = p.id)
        or exists (
          select 1 from public.promotion_properties pp
          where pp.promotion_id = p.id and pp.property_id = p_property_id
        )
      );
    if v_promo_id is null then
      raise exception 'Invalid promo code' using errcode = 'P0001';
    end if;
    if v_type = 'percent' then
      v_discount := floor((v_base - v_long) * v_value / 100.0)::integer;
    else
      v_discount := least(v_value::integer, v_base - v_long);
    end if;
  end if;

  if to_regclass('public.stay_services') is not null then
    execute
      'select coalesce(sum(price_xaf), 0)::integer from public.stay_services where is_active and id = any($1)'
      into v_services
      using coalesce(p_service_ids, '{}'::uuid[]);
  end if;

  return jsonb_build_object(
    'nights', v_nights,
    'nightly_rate_xaf', round(v_base::numeric / v_nights)::integer,
    'base_nightly_rate_xaf', v_rate,
    'nightly', v_nightly,
    'base_amount_xaf', v_base,
    'discount_xaf', v_discount + v_long,
    'promo_discount_xaf', v_discount,
    'long_stay_discount_xaf', v_long,
    'long_stay_percent', v_long_pct,
    'cleaning_fee_xaf', v_cleaning,
    'deposit_xaf', v_deposit,
    'services_xaf', v_services,
    'total_amount_xaf', v_base - v_discount - v_long + v_cleaning + v_deposit + v_services,
    'promotion_name', v_name,
    'promotion_id', v_promo_id,
    'long_stay', v_long > 0,
    'capacity', v_capacity
  );
end;
$$;
grant execute on function public.price_stay(uuid, date, date, integer, text, uuid[]) to anon, authenticated;

-- =============================================================== 2. iCal import

create table if not exists public.external_calendars (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  source text not null default 'airbnb' check (char_length(source) between 2 and 40),
  url text not null check (url ~ '^https://'),
  is_active boolean not null default true,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (property_id, url)
);
alter table public.external_calendars enable row level security;
drop policy if exists external_calendars_staff on public.external_calendars;
create policy external_calendars_staff on public.external_calendars for all
  using (public.is_staff()) with check (public.is_staff());
grant select, insert, update, delete on public.external_calendars to authenticated;

alter table public.property_blocks add column if not exists source text;
alter table public.property_blocks add column if not exists external_uid text;
alter table public.property_blocks add column if not exists calendar_id uuid references public.external_calendars (id) on delete cascade;
create unique index if not exists property_blocks_external on public.property_blocks (calendar_id, external_uid) where calendar_id is not null;

-- Replaces every block imported from one calendar by the events just read (service role only).
create or replace function public.replace_external_blocks(p_calendar_id uuid, p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cal public.external_calendars%rowtype;
  v_count integer := 0;
  e jsonb;
begin
  select * into v_cal from public.external_calendars where id = p_calendar_id;
  if not found then
    raise exception 'Calendar not found';
  end if;
  delete from public.property_blocks where calendar_id = p_calendar_id;
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
    if (e ->> 'end')::date > (e ->> 'start')::date and (e ->> 'end')::date >= current_date then
      insert into public.property_blocks (property_id, start_date, end_date, block_type, reason, source, external_uid, calendar_id)
      values (
        v_cal.property_id,
        (e ->> 'start')::date,
        (e ->> 'end')::date,
        'blocked',
        left(coalesce(e ->> 'summary', v_cal.source), 200),
        v_cal.source,
        left(coalesce(e ->> 'uid', md5(e::text)), 300),
        p_calendar_id
      )
      on conflict do nothing;
      v_count := v_count + 1;
    end if;
  end loop;
  update public.external_calendars set last_synced_at = now(), last_error = null where id = p_calendar_id;
  return v_count;
end;
$$;
revoke all on function public.replace_external_blocks(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_external_blocks(uuid, jsonb) to service_role;

-- =============================================================== 3. verified public reviews

create or replace function public.public_reviews(p_limit integer default 60, p_property_id uuid default null)
returns table (
  id uuid,
  property_id uuid,
  property_name text,
  property_slug text,
  rating integer,
  body text,
  created_at timestamptz,
  guest_name text,
  stay_month date,
  verified boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rv.id,
    rv.property_id,
    p.name,
    p.slug,
    rv.rating,
    rv.body,
    rv.created_at,
    trim(split_part(coalesce(nullif(pr.full_name, ''), 'Client'), ' ', 1)
      || coalesce(' ' || left(nullif(split_part(pr.full_name, ' ', 2), ''), 1) || '.', '')),
    date_trunc('month', r.check_in)::date,
    r.status in ('confirmed', 'completed')
  from public.reviews rv
  join public.properties p on p.id = rv.property_id
  join public.reservations r on r.id = rv.reservation_id
  left join public.profiles pr on pr.id = rv.customer_id
  where rv.status = 'published'
    and (p_property_id is null or rv.property_id = p_property_id)
  order by rv.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;
grant execute on function public.public_reviews(integer, uuid) to anon, authenticated;

-- =============================================================== 4. contactless check-in + messages

alter table public.properties add column if not exists arrival_time text not null default '14:00';
alter table public.properties add column if not exists departure_time text not null default '11:00';
alter table public.reservations add column if not exists access_code text;
alter table public.reservations add column if not exists confirmation_email_sent_at timestamptz;
alter table public.reservations add column if not exists reminder_sent_at timestamptz;
alter table public.reservations add column if not exists whatsapp_sent_at timestamptz;

-- A 6-digit door / key-box code is created when the stay is confirmed (staff can change it).
create or replace function public.ensure_access_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and (new.access_code is null or length(new.access_code) = 0) then
    new.access_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists reservations_access_code on public.reservations;
create trigger reservations_access_code
  before insert or update of status on public.reservations
  for each row execute function public.ensure_access_code();

-- Guests only see their code and guide from the day before arrival until departure.
create or replace function public.my_arrival(p_reservation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_prop public.properties%rowtype;
  v_open boolean;
begin
  select * into v_res from public.reservations where id = p_reservation_id;
  if not found or (v_res.customer_id <> auth.uid() and not public.is_staff()) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into v_prop from public.properties where id = v_res.property_id;
  v_open := v_res.status = 'confirmed' and current_date between v_res.check_in - 1 and v_res.check_out;
  return jsonb_build_object(
    'open', v_open or public.is_staff(),
    'opens_on', v_res.check_in - 1,
    'access_code', case when v_open or public.is_staff() then v_res.access_code end,
    'arrival_time', v_prop.arrival_time,
    'departure_time', v_prop.departure_time,
    'guide_fr', case when v_open or public.is_staff() then v_prop.guide_fr end,
    'guide_en', case when v_open or public.is_staff() then v_prop.guide_en end,
    'access_notes_fr', case when v_open or public.is_staff() then v_prop.access_notes_fr end,
    'access_notes_en', case when v_open or public.is_staff() then v_prop.access_notes_en end,
    'latitude', v_prop.latitude,
    'longitude', v_prop.longitude
  );
end;
$$;
grant execute on function public.my_arrival(uuid) to authenticated;

-- Work list for the guest-messages job (service role): confirmations and J-1 reminders.
create or replace function public.due_guest_messages()
returns table (
  kind text,
  reservation_id uuid,
  public_code text,
  email text,
  phone text,
  full_name text,
  property_name text,
  check_in date,
  check_out date,
  total_amount_xaf integer,
  access_code text,
  arrival_time text,
  guide text
)
language sql
stable
security definer
set search_path = public
as $$
  select 'confirmed', r.id, r.public_code, pr.email, pr.phone, pr.full_name, p.name, r.check_in, r.check_out,
         r.total_amount_xaf, null, p.arrival_time, null
  from public.reservations r
  join public.properties p on p.id = r.property_id
  join public.profiles pr on pr.id = r.customer_id
  where r.status = 'confirmed' and r.confirmation_email_sent_at is null and r.check_out >= current_date
  union all
  select 'reminder', r.id, r.public_code, pr.email, pr.phone, pr.full_name, p.name, r.check_in, r.check_out,
         r.total_amount_xaf, r.access_code, p.arrival_time, coalesce(p.guide_fr, p.access_notes_fr)
  from public.reservations r
  join public.properties p on p.id = r.property_id
  join public.profiles pr on pr.id = r.customer_id
  where r.status = 'confirmed' and r.reminder_sent_at is null and r.check_in = current_date + 1;
$$;
revoke all on function public.due_guest_messages() from public, anon, authenticated;
grant execute on function public.due_guest_messages() to service_role;

-- =============================================================== 5. admin 2FA policy

insert into public.system_config (key, value)
values ('require_admin_mfa', 'false'::jsonb)
on conflict (key) do nothing;

-- Sensitive admin actions can check the session level with this helper.
create or replace function public.session_is_aal2()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
grant execute on function public.session_is_aal2() to authenticated;
