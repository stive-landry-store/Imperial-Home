-- Catch-up script: brings the database up to date with every feature (reviews, favorites, waitlist,
-- extras, cleaning, referral, Wi-Fi, super admin, activity journal, support chat, chat notifications). Safe to run even if some parts already exist.
-- Run it in ONE go in the Supabase SQL Editor. If anything fails, nothing is changed.


-- ===== 20260827100015_guest_experience.sql =====

-- Pricing detail, Mobile Money receipts, reviews, waitlist, favorites, extras, turnover, and iCal.

alter table public.properties
  add column if not exists cleaning_fee_xaf integer not null default 0,
  add column if not exists security_deposit_xaf integer not null default 0,
  add column if not exists weekly_discount_percent integer not null default 0,
  add column if not exists monthly_discount_percent integer not null default 0,
  add column if not exists guide_fr text,
  add column if not exists guide_en text,
  add column if not exists access_notes_fr text,
  add column if not exists access_notes_en text;

alter table public.properties add column if not exists ical_token uuid;
update public.properties set ical_token = gen_random_uuid() where ical_token is null;
alter table public.properties alter column ical_token set default gen_random_uuid();
create unique index if not exists properties_ical_token_idx on public.properties (ical_token);

do $$
begin
  alter table public.properties
    add constraint properties_fee_nonneg check (
      cleaning_fee_xaf >= 0
      and security_deposit_xaf >= 0
      and weekly_discount_percent between 0 and 80
      and monthly_discount_percent between 0 and 80
    );
exception
  when duplicate_object then null;
end $$;

alter table public.promotions add column if not exists code text;
create unique index if not exists promotions_code_idx on public.promotions (lower(code)) where code is not null and length(trim(code)) > 0;

alter table public.notifications add column if not exists kind text;
create unique index if not exists notifications_kind_uidx on public.notifications (kind) where kind is not null;

create table if not exists public.stay_services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_fr text not null,
  price_xaf integer not null check (price_xaf >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.stay_services (slug, name_en, name_fr, price_xaf, sort_order)
values
  ('airport', 'Airport transfer', 'Transfert aéroport', 15000, 1),
  ('late-checkout', 'Late checkout', 'Départ tardif', 10000, 2),
  ('mid-clean', 'Mid-stay housekeeping', 'Ménage en cours de séjour', 8000, 3),
  ('baby-bed', 'Baby bed', 'Lit bébé', 5000, 4)
on conflict (slug) do nothing;

create table if not exists public.reservation_services (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  service_id uuid not null references public.stay_services (id),
  price_xaf integer not null check (price_xaf >= 0),
  unique (reservation_id, service_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  reservation_id uuid not null unique references public.reservations (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text not null check (char_length(trim(body)) between 8 and 800),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  customer_id uuid references public.profiles (id) on delete set null,
  full_name text not null default '',
  email text not null check (char_length(email) between 5 and 160),
  phone text,
  check_in date not null,
  check_out date not null,
  guest_count integer not null default 1 check (guest_count > 0),
  created_at timestamptz not null default now(),
  constraint waitlist_dates_check check (check_out > check_in)
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.turnover_tasks (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  title text not null,
  due_on date not null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reviews_property_idx on public.reviews (property_id, created_at desc);
create index if not exists waitlist_property_idx on public.waitlist (property_id, check_in);
create index if not exists turnover_due_idx on public.turnover_tasks (done_at, due_on);

alter table public.stay_services enable row level security;
alter table public.reservation_services enable row level security;
alter table public.reviews enable row level security;
alter table public.waitlist enable row level security;
alter table public.favorites enable row level security;
alter table public.turnover_tasks enable row level security;

drop policy if exists stay_services_read on public.stay_services;
create policy stay_services_read on public.stay_services for select using (is_active or public.is_staff());
drop policy if exists stay_services_write on public.stay_services;
create policy stay_services_write on public.stay_services for all
  using (public.has_permission('properties'))
  with check (public.has_permission('properties'));

drop policy if exists reservation_services_read on public.reservation_services;
create policy reservation_services_read on public.reservation_services for select using (
  public.is_staff()
  or exists (
    select 1 from public.reservations r
    where r.id = reservation_id and r.customer_id = auth.uid()
  )
);

drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (
  status = 'published' or customer_id = auth.uid() or public.is_staff()
);
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (
  status = 'published'
  and customer_id = auth.uid()
  and exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and r.customer_id = auth.uid()
      and r.property_id = property_id
      and r.status in ('confirmed', 'completed')
      and r.check_out <= current_date
  )
);
drop policy if exists reviews_staff_update on public.reviews;
create policy reviews_staff_update on public.reviews for update
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists waitlist_insert on public.waitlist;
create policy waitlist_insert on public.waitlist for insert with check (
  (customer_id is null or customer_id = auth.uid())
  and check_out > check_in
);
drop policy if exists waitlist_read on public.waitlist;
create policy waitlist_read on public.waitlist for select using (
  public.is_staff() or customer_id = auth.uid()
);

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists turnover_staff on public.turnover_tasks;
create policy turnover_staff on public.turnover_tasks for all
  using (public.is_staff())
  with check (public.is_staff());

insert into storage.buckets (id, name, public)
values ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

drop policy if exists storage_receipts_insert on storage.objects;
create policy storage_receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_receipts_select on storage.objects;
create policy storage_receipts_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
    )
  );

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
  v_property public.properties%rowtype;
  v_promo public.promotions%rowtype;
  v_nights integer;
  v_base integer;
  v_promo_discount integer := 0;
  v_long integer := 0;
  v_discount integer := 0;
  v_services integer := 0;
  v_cleaning integer := 0;
  v_deposit integer := 0;
  v_long_stay boolean := false;
  v_name text := null;
  v_promo_id uuid := null;
begin
  select * into v_property from public.properties where id = p_property_id;
  if not found then
    raise exception 'Property not found' using errcode = 'P0002';
  end if;

  v_nights := p_check_out - p_check_in;
  if v_nights < 1 then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  if p_guest_count < 1 or p_guest_count > v_property.capacity then
    raise exception 'Invalid guest count' using errcode = '22023';
  end if;

  v_base := v_property.nightly_rate_xaf * v_nights;
  v_cleaning := v_property.cleaning_fee_xaf;
  v_deposit := v_property.security_deposit_xaf;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo
    from public.promotions p
    where p.is_active
      and lower(p.code) = lower(trim(p_promo_code))
      and current_date between p.starts_at and p.ends_at
      and (
        not exists (select 1 from public.promotion_properties pp where pp.promotion_id = p.id)
        or exists (
          select 1 from public.promotion_properties pp
          where pp.promotion_id = p.id and pp.property_id = p_property_id
        )
      );
    if not found then
      raise exception 'Invalid promo code' using errcode = 'P0001';
    end if;
  else
    select * into v_promo from public.best_promotion(p_property_id, v_base);
  end if;

  if v_promo.id is not null then
    if v_promo.discount_type = 'percent' then
      v_promo_discount := floor(v_base * v_promo.discount_value / 100.0)::integer;
    else
      v_promo_discount := least(v_promo.discount_value::integer, v_base);
    end if;
    v_name := v_promo.name;
    v_promo_id := v_promo.id;
  end if;

  if v_nights >= 30 and v_property.monthly_discount_percent > 0 then
    v_long := floor(v_base * v_property.monthly_discount_percent / 100.0)::integer;
  elsif v_nights >= 7 and v_property.weekly_discount_percent > 0 then
    v_long := floor(v_base * v_property.weekly_discount_percent / 100.0)::integer;
  end if;

  if v_long > v_promo_discount then
    v_discount := v_long;
    v_long_stay := true;
    v_name := null;
    v_promo_id := null;
  else
    v_discount := v_promo_discount;
  end if;

  select coalesce(sum(s.price_xaf), 0)::integer into v_services
  from public.stay_services s
  where s.is_active and s.id = any(coalesce(p_service_ids, '{}'::uuid[]));

  return jsonb_build_object(
    'nights', v_nights,
    'nightly_rate_xaf', v_property.nightly_rate_xaf,
    'base_amount_xaf', v_base,
    'discount_xaf', v_discount,
    'cleaning_fee_xaf', v_cleaning,
    'deposit_xaf', v_deposit,
    'services_xaf', v_services,
    'total_amount_xaf', v_base - v_discount + v_cleaning + v_deposit + v_services,
    'promotion_name', v_name,
    'promotion_id', v_promo_id,
    'long_stay', v_long_stay,
    'capacity', v_property.capacity
  );
end;
$$;

drop function if exists public.quote_stay(uuid, date, date, integer);

create or replace function public.quote_stay(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_promo_code text default null,
  p_service_ids uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_price jsonb;
  v_available boolean;
  v_status public.property_status;
begin
  v_price := public.price_stay(p_property_id, p_check_in, p_check_out, p_guest_count, p_promo_code, p_service_ids);
  select status into v_status from public.properties where id = p_property_id;
  v_available := public.check_availability(p_property_id, p_check_in, p_check_out)
    and v_status = 'published';
  return v_price || jsonb_build_object('available', v_available);
end;
$$;

drop function if exists public.create_booking(uuid, date, date, integer);

create or replace function public.create_booking(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_promo_code text default null,
  p_service_ids uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_property public.properties%rowtype;
  v_price jsonb;
  v_hold_minutes integer;
  v_res public.reservations%rowtype;
  v_total integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  perform public.expire_holds();

  if p_check_out <= p_check_in then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  if p_check_in < current_date then
    raise exception 'Check-in cannot be in the past' using errcode = '22023';
  end if;

  select * into v_property from public.properties where id = p_property_id for update;
  if not found or v_property.status <> 'published' then
    raise exception 'Property is not available' using errcode = 'P0001';
  end if;
  if not public.check_availability(p_property_id, p_check_in, p_check_out) then
    raise exception 'Dates are not available' using errcode = 'P0001';
  end if;

  v_price := public.price_stay(p_property_id, p_check_in, p_check_out, p_guest_count, p_promo_code, p_service_ids);
  v_total := (v_price ->> 'total_amount_xaf')::integer;
  v_hold_minutes := coalesce(public.config_text('hold_minutes', '30')::integer, 30);

  insert into public.reservations (
    public_code, property_id, customer_id, check_in, check_out, guest_count,
    base_amount_xaf, discount_xaf, total_amount_xaf, promotion_id, status, hold_expires_at
  ) values (
    'IH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_property_id, v_user, p_check_in, p_check_out, p_guest_count,
    (v_price ->> 'base_amount_xaf')::integer,
    (v_price ->> 'discount_xaf')::integer,
    v_total,
    nullif(v_price ->> 'promotion_id', '')::uuid,
    'pending',
    now() + make_interval(mins => v_hold_minutes)
  )
  returning * into v_res;

  insert into public.reservation_services (reservation_id, service_id, price_xaf)
  select v_res.id, s.id, s.price_xaf
  from public.stay_services s
  where s.is_active and s.id = any(coalesce(p_service_ids, '{}'::uuid[]));

  insert into public.payments (reservation_id, amount_xaf, status, idempotency_key)
  values (v_res.id, v_total, 'pending', v_res.id::text);

  insert into public.notifications (user_id, title, body, link, kind)
  select
    v_user,
    'Réservation reçue',
    'Votre réservation ' || v_res.public_code || ' est enregistrée. Réglez '
      || v_total || ' XAF avant la fin du délai pour confirmer le séjour.',
    '/account/reservations/' || v_res.id::text,
    'booking:' || v_res.id::text
  where not exists (
    select 1 from public.notifications n where n.kind = 'booking:' || v_res.id::text
  );

  perform public.write_audit('create_booking', 'reservation', v_res.id, null, to_jsonb(v_res));

  return jsonb_build_object(
    'id', v_res.id,
    'public_code', v_res.public_code,
    'status', v_res.status,
    'total_amount_xaf', v_res.total_amount_xaf,
    'hold_expires_at', v_res.hold_expires_at
  );
exception
  when exclusion_violation then
    raise exception 'Dates are not available' using errcode = 'P0001';
end;
$$;

create or replace function public.submit_payment_receipt(
  p_reservation_id uuid,
  p_provider text,
  p_phone text,
  p_path text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_pay public.payments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_provider not in ('mtn_momo', 'orange_money') then
    raise exception 'Unsupported provider' using errcode = '22023';
  end if;
  if p_path is null or p_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid receipt' using errcode = '42501';
  end if;
  if p_phone is null or length(regexp_replace(p_phone, '\D', '', 'g')) < 8 then
    raise exception 'Invalid phone' using errcode = '22023';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found or v_res.customer_id <> auth.uid() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if v_res.status not in ('pending', 'payment_processing') then
    raise exception 'Reservation cannot accept a receipt' using errcode = 'P0001';
  end if;

  select * into v_pay
  from public.payments
  where reservation_id = p_reservation_id
  order by created_at desc
  limit 1
  for update;

  if not found then
    insert into public.payments (reservation_id, amount_xaf, status, idempotency_key)
    values (v_res.id, v_res.total_amount_xaf, 'pending', v_res.id::text)
    returning * into v_pay;
  end if;

  update public.payments
  set
    status = 'processing',
    provider = p_provider,
    provider_reference = v_res.public_code,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'payer_phone', p_phone,
      'receipt_path', p_path
    )
  where id = v_pay.id
  returning * into v_pay;

  update public.reservations
  set status = 'payment_processing'
  where id = v_res.id;

  insert into public.notifications (user_id, title, body, link, kind)
  select
    v_res.customer_id,
    'Paiement en vérification',
    'Nous avons reçu le reçu de ' || v_res.public_code || '. Le séjour est confirmé dès validation, et vous serez notifié.',
    '/account/reservations/' || v_res.id::text,
    'receipt:' || v_res.id::text
  where not exists (
    select 1 from public.notifications n where n.kind = 'receipt:' || v_res.id::text
  );

  return jsonb_build_object('ok', true, 'payment_status', v_pay.status, 'reservation_status', 'payment_processing');
end;
$$;

create or replace function public.dispatch_stay_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  insert into public.notifications (user_id, title, body, link, kind)
  select
    r.customer_id,
    'Arrivée demain',
    'Votre séjour ' || r.public_code || ' commence le ' || r.check_in::text
      || '. Retrouvez l’accès et le guide dans votre réservation.',
    '/account/reservations/' || r.id::text,
    'checkin:' || r.id::text
  from public.reservations r
  where r.status = 'confirmed'
    and r.check_in = current_date + 1
    and not exists (
      select 1 from public.notifications n where n.kind = 'checkin:' || r.id::text
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.ical_feed(p_token uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prop public.properties%rowtype;
  v_body text := '';
  r record;
begin
  select * into v_prop from public.properties where ical_token = p_token;
  if not found then
    raise exception 'Not found' using errcode = 'P0002';
  end if;

  for r in
    select public_code, check_in, check_out
    from public.reservations
    where property_id = v_prop.id
      and status in ('pending', 'payment_processing', 'confirmed')
  loop
    v_body := v_body
      || 'BEGIN:VEVENT' || E'\r\n'
      || 'UID:' || r.public_code || '@imperial.home' || E'\r\n'
      || 'DTSTART;VALUE=DATE:' || to_char(r.check_in, 'YYYYMMDD') || E'\r\n'
      || 'DTEND;VALUE=DATE:' || to_char(r.check_out, 'YYYYMMDD') || E'\r\n'
      || 'SUMMARY:Imperial Home — ' || replace(v_prop.name, E'\n', ' ') || E'\r\n'
      || 'END:VEVENT' || E'\r\n';
  end loop;

  return 'BEGIN:VCALENDAR' || E'\r\n'
    || 'VERSION:2.0' || E'\r\n'
    || 'PRODID:-//Imperial Home//Calendar//FR' || E'\r\n'
    || 'X-WR-CALNAME:Imperial Home ' || replace(v_prop.name, E'\n', ' ') || E'\r\n'
    || v_body
    || 'END:VCALENDAR' || E'\r\n';
end;
$$;

create or replace function public.on_reservation_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' then
    insert into public.turnover_tasks (reservation_id, property_id, title, due_on)
    select new.id, new.property_id, t.title, new.check_out
    from (values ('Ménage complet'), ('Linge et contrôle'), ('Prêt pour la prochaine arrivée')) as t(title)
    where not exists (
      select 1 from public.turnover_tasks x where x.reservation_id = new.id
    );
  end if;

  if new.status in ('cancelled', 'expired')
     and old.status in ('pending', 'payment_processing', 'confirmed') then
    select name, slug into v_name, v_slug from public.properties where id = new.property_id;
    insert into public.notifications (user_id, title, body, link, kind)
    select
      w.customer_id,
      'Dates disponibles',
      'Un séjour s''est libéré pour ' || coalesce(v_name, 'Imperial Home')
        || ' (' || new.check_in::text || ' → ' || new.check_out::text || ').',
      '/properties/' || coalesce(v_slug, ''),
      'waitlist:' || w.id::text || ':' || new.id::text
    from public.waitlist w
    where w.customer_id is not null
      and w.property_id = new.property_id
      and daterange(w.check_in, w.check_out, '[)') && daterange(new.check_in, new.check_out, '[)')
      and not exists (
        select 1 from public.notifications n
        where n.kind = 'waitlist:' || w.id::text || ':' || new.id::text
      );
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_status_extras on public.reservations;
create trigger reservations_status_extras
after update of status on public.reservations
for each row
execute function public.on_reservation_status();

grant execute on function public.price_stay(uuid, date, date, integer, text, uuid[]) to anon, authenticated;
grant execute on function public.quote_stay(uuid, date, date, integer, text, uuid[]) to anon, authenticated;
grant execute on function public.create_booking(uuid, date, date, integer, text, uuid[]) to authenticated;
grant execute on function public.submit_payment_receipt(uuid, text, text, text) to authenticated;
grant execute on function public.dispatch_stay_reminders() to anon, authenticated;
grant execute on function public.ical_feed(uuid) to anon, authenticated;


-- ===== 20260827100016_standalone_car_rental.sql =====

-- A car can be booked on its own. Dates live on the rental, not only on an apartment stay.
-- PostgreSQL unique allows several NULL reservation_id values, so the existing unique stays.

alter table public.vehicle_rentals alter column reservation_id drop not null;

alter table public.vehicle_rentals
  add column if not exists customer_id uuid references public.profiles (id),
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists public_code text;

update public.vehicle_rentals vr
set
  customer_id = r.customer_id,
  start_date = r.check_in,
  end_date = r.check_out
from public.reservations r
where vr.reservation_id = r.id
  and vr.start_date is null;

create unique index if not exists vehicle_rentals_public_code_uidx
  on public.vehicle_rentals (public_code)
  where public_code is not null;

create index if not exists vehicle_rentals_vehicle_dates_idx
  on public.vehicle_rentals (vehicle_id, start_date, end_date)
  where status <> 'cancelled';

create or replace function public.check_vehicle_availability(
  p_vehicle_id uuid,
  p_start date,
  p_end date
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
    from public.vehicle_unavailability u
    where u.vehicle_id = p_vehicle_id
      and daterange(u.start_date, u.end_date, '[)') && daterange(p_start, p_end, '[)')
  )
  and not exists (
    select 1
    from public.vehicle_rentals vr
    left join public.reservations r on r.id = vr.reservation_id
    where vr.vehicle_id = p_vehicle_id
      and vr.status <> 'cancelled'
      and vr.start_date is not null
      and vr.end_date is not null
      and daterange(vr.start_date, vr.end_date, '[)') && daterange(p_start, p_end, '[)')
      and (
        vr.reservation_id is null
        or r.status in ('pending', 'payment_processing', 'confirmed')
      )
  );
$$;

create or replace function public.add_vehicle_rental(
  p_reservation_id uuid,
  p_vehicle_id uuid,
  p_with_driver boolean,
  p_promo_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_days integer;
  v_rate integer;
  v_base integer;
  v_discount integer := 0;
  v_total integer;
  v_promo public.vehicle_promo_codes%rowtype;
begin
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_res.customer_id <> auth.uid() and not public.has_permission('reservations') then
    raise exception 'Not allowed';
  end if;
  if v_res.status not in ('pending', 'payment_processing', 'confirmed') then
    raise exception 'Reservation is not active';
  end if;

  select * into v_vehicle from public.vehicles where id = p_vehicle_id and status = 'published';
  if not found then raise exception 'Vehicle not available'; end if;

  v_days := greatest(1, v_res.check_out - v_res.check_in);
  if not public.check_vehicle_availability(p_vehicle_id, v_res.check_in, v_res.check_out) then
    raise exception 'Vehicle is not available for these dates';
  end if;

  v_rate := case when p_with_driver then v_vehicle.daily_rate_with_driver_xaf else v_vehicle.daily_rate_no_driver_xaf end;
  v_base := v_rate * v_days;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from public.vehicle_promo_codes
    where upper(code) = upper(trim(p_promo_code)) and is_active;
    if found then
      v_discount := floor(v_base * v_promo.discount_percent / 100.0)::integer;
    end if;
  end if;

  v_total := v_base - v_discount;

  insert into public.vehicle_rentals (
    reservation_id, customer_id, start_date, end_date, vehicle_id, with_driver,
    days, daily_rate_xaf, discount_xaf, total_xaf, promo_code, status
  ) values (
    p_reservation_id, v_res.customer_id, v_res.check_in, v_res.check_out, p_vehicle_id, p_with_driver,
    v_days, v_rate, v_discount, v_total, nullif(trim(coalesce(p_promo_code, '')), ''), 'requested'
  )
  on conflict (reservation_id) do update
    set vehicle_id = excluded.vehicle_id,
        customer_id = excluded.customer_id,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        with_driver = excluded.with_driver,
        days = excluded.days,
        daily_rate_xaf = excluded.daily_rate_xaf,
        discount_xaf = excluded.discount_xaf,
        total_xaf = excluded.total_xaf,
        promo_code = excluded.promo_code,
        status = 'requested';

  return jsonb_build_object(
    'reservation_id', p_reservation_id,
    'vehicle_id', p_vehicle_id,
    'days', v_days,
    'total_xaf', v_total,
    'discount_xaf', v_discount
  );
end;
$$;

create or replace function public.book_vehicle(
  p_vehicle_id uuid,
  p_start date,
  p_end date,
  p_with_driver boolean default false,
  p_promo_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_vehicle public.vehicles%rowtype;
  v_days integer;
  v_rate integer;
  v_base integer;
  v_discount integer := 0;
  v_total integer;
  v_promo public.vehicle_promo_codes%rowtype;
  v_code text;
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_end <= p_start then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  if p_start < current_date then
    raise exception 'Start date cannot be in the past' using errcode = '22023';
  end if;

  select * into v_vehicle from public.vehicles where id = p_vehicle_id and status = 'published';
  if not found then
    raise exception 'Vehicle not available' using errcode = 'P0001';
  end if;
  if not public.check_vehicle_availability(p_vehicle_id, p_start, p_end) then
    raise exception 'Vehicle is not available for these dates' using errcode = 'P0001';
  end if;

  v_days := p_end - p_start;
  v_rate := case when p_with_driver then v_vehicle.daily_rate_with_driver_xaf else v_vehicle.daily_rate_no_driver_xaf end;
  v_base := v_rate * v_days;

  if p_promo_code is not null and length(trim(p_promo_code)) > 0 then
    select * into v_promo from public.vehicle_promo_codes
    where upper(code) = upper(trim(p_promo_code)) and is_active;
    if found then
      v_discount := floor(v_base * v_promo.discount_percent / 100.0)::integer;
    end if;
  end if;

  v_total := v_base - v_discount;
  v_code := 'VH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.vehicle_rentals (
    public_code, customer_id, start_date, end_date, vehicle_id, with_driver,
    days, daily_rate_xaf, discount_xaf, total_xaf, promo_code, status
  ) values (
    v_code, v_user, p_start, p_end, p_vehicle_id, p_with_driver,
    v_days, v_rate, v_discount, v_total, nullif(trim(coalesce(p_promo_code, '')), ''), 'requested'
  )
  returning id into v_id;

  begin
    insert into public.notifications (user_id, title, body, link)
    values (
      v_user,
      'Voiture demandée',
      'Votre location ' || v_code || ' (' || v_vehicle.brand || ' ' || v_vehicle.model || ') est enregistrée. Imperial Home la confirme.',
      '/account'
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'id', v_id,
    'public_code', v_code,
    'days', v_days,
    'total_xaf', v_total,
    'discount_xaf', v_discount,
    'status', 'requested'
  );
end;
$$;

create or replace function public.set_vehicle_rental_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.vehicle_rentals%rowtype;
begin
  if not public.is_staff() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_status not in ('requested', 'confirmed', 'cancelled') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  update public.vehicle_rentals
  set status = p_status
  where id = p_id
  returning * into v_row;

  if not found then
    raise exception 'Not found' using errcode = 'P0002';
  end if;

  if v_row.customer_id is not null and p_status = 'confirmed' then
    begin
      insert into public.notifications (user_id, title, body, link)
      values (
        v_row.customer_id,
        'Voiture confirmée',
        'Votre location ' || coalesce(v_row.public_code, '') || ' est confirmée.',
        '/account'
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;

drop policy if exists vehicle_rentals_select on public.vehicle_rentals;
create policy vehicle_rentals_select on public.vehicle_rentals for select using (
  customer_id = auth.uid()
  or public.is_staff()
  or exists (
    select 1 from public.reservations r
    where r.id = reservation_id and (r.customer_id = auth.uid() or public.is_staff())
  )
);

grant execute on function public.check_vehicle_availability(uuid, date, date) to anon, authenticated;
grant execute on function public.add_vehicle_rental(uuid, uuid, boolean, text) to authenticated;
grant execute on function public.book_vehicle(uuid, date, date, boolean, text) to authenticated;
grant execute on function public.set_vehicle_rental_status(uuid, text) to authenticated;


-- ===== 20260827100017_profile_cover_and_wifi.sql =====

alter table public.profiles add column if not exists cover_url text;

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do nothing;

drop policy if exists profile_media_read on storage.objects;
drop policy if exists profile_media_insert on storage.objects;
drop policy if exists profile_media_update on storage.objects;
drop policy if exists profile_media_delete on storage.objects;

create policy profile_media_read on storage.objects
  for select using (bucket_id = 'profile-media');

create policy profile_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy profile_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy profile_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

update public.property_welcome_secrets
set wifi_name = 'Imperial Home',
    wifi_password = 'ML237Roi',
    updated_at = now();

insert into public.property_welcome_secrets (property_id, wifi_name, wifi_password)
select p.id, 'Imperial Home', 'ML237Roi'
from public.properties p
where not exists (
  select 1 from public.property_welcome_secrets s where s.property_id = p.id
);

update public.housing_sheets hs
set wifi_name = '',
    wifi_password = ''
from public.reservations r
where hs.reservation_id = r.id
  and r.status not in ('confirmed', 'completed');

create or replace function public.guard_housing_wifi()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  stay_status text;
begin
  select status into stay_status
  from public.reservations
  where id = new.reservation_id;

  if stay_status is null or stay_status not in ('confirmed', 'completed') then
    new.wifi_name := '';
    new.wifi_password := '';
  end if;

  return new;
end;
$$;

drop trigger if exists housing_sheets_guard_wifi on public.housing_sheets;
create trigger housing_sheets_guard_wifi
before insert or update on public.housing_sheets
for each row execute function public.guard_housing_wifi();

revoke all on function public.guard_housing_wifi() from public;
grant execute on function public.guard_housing_wifi() to authenticated;

notify pgrst, 'reload schema';


-- ===== 20260827100018_public_availability.sql =====

-- Guests cannot read other people's reservations under RLS, so the public
-- calendar and quote must use definer functions that return only dates.

create or replace function public.check_availability(
  p_property_id uuid,
  p_check_in date,
  p_check_out date
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_check_out > p_check_in
    and exists (
      select 1 from public.properties
      where id = p_property_id and status = 'published'
    )
    and not exists (
      select 1 from public.reservations r
      where r.property_id = p_property_id
        and r.status in ('pending', 'payment_processing', 'confirmed')
        and daterange(r.check_in, r.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
    )
    and not exists (
      select 1 from public.property_blocks b
      where b.property_id = p_property_id
        and daterange(b.start_date, b.end_date, '[)') && daterange(p_check_in, p_check_out, '[)')
    )
$$;

create or replace function public.get_unavailable_ranges(p_property_id uuid)
returns table (start_date date, end_date date, kind text)
language sql
stable
security definer
set search_path = public
as $$
  select r.check_in, r.check_out, 'reservation'::text
  from public.reservations r
  where r.property_id = p_property_id
    and r.status in ('pending', 'payment_processing', 'confirmed')
  union all
  select b.start_date, b.end_date, b.block_type::text
  from public.property_blocks b
  where b.property_id = p_property_id
$$;

notify pgrst, 'reload schema';


-- ===== 20260827100019_assistant_handoff.sql =====

-- Certified admins, shared human assistance, and takeover notices.

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
    true,
    true,
    coalesce(nullif(trim(p_title), ''), 'Administrateur'),
    auth.uid()
  )
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
    true,
    true,
    coalesce(nullif(trim(p_title), ''), 'Administrateur'),
    auth.uid()
  )
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

update public.admin_profiles
set is_verified = true
where is_active = true;

insert into public.admin_profiles (id, is_verified, is_active, title)
select p.id, true, true, 'Administrateur'
from public.profiles p
where p.role in ('admin', 'main_admin')
on conflict (id) do update
  set is_verified = true,
      is_active = true;

insert into public.admin_permissions (admin_id, permission)
select a.id, 'chat'
from public.admin_profiles a
where a.is_active
on conflict do nothing;

create or replace function public.open_customer_conversation(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;

  if not exists (select 1 from public.profiles where id = p_customer_id) then
    raise exception 'Customer not found';
  end if;

  select id into v_id
  from public.conversations
  where customer_id = p_customer_id
    and status = 'open'
  order by created_at desc
  limit 1;

  if v_id is null then
    insert into public.conversations (customer_id, status, needs_human)
    values (p_customer_id, 'open', true)
    returning id into v_id;
  else
    update public.conversations
    set needs_human = true
    where id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.conversation_senders(p_conversation_id uuid)
returns table (id uuid, full_name text, is_verified boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         coalesce(nullif(trim(p.full_name), ''), p.email, 'Imperial Home'),
         coalesce(a.is_verified, p.role in ('admin', 'main_admin'))
  from public.profiles p
  left join public.admin_profiles a on a.id = p.id
  where (
      public.is_staff()
      or exists (
        select 1
        from public.conversations c
        where c.id = p_conversation_id
          and c.customer_id = auth.uid()
      )
    )
    and p.id in (
      select m.sender_id
      from public.messages m
      where m.conversation_id = p_conversation_id
        and m.sender_id is not null
      union
      select c.assigned_admin_id
      from public.conversations c
      where c.id = p_conversation_id
        and c.assigned_admin_id is not null
    );
$$;

create or replace function public.on_admin_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_prev uuid;
  v_name text;
begin
  if NEW.role <> 'admin' or NEW.sender_id is null then
    update public.conversations
    set last_message_at = now()
    where id = NEW.conversation_id;
    return NEW;
  end if;

  select customer_id, assigned_admin_id
  into v_customer, v_prev
  from public.conversations
  where id = NEW.conversation_id;

  update public.conversations
  set assigned_admin_id = NEW.sender_id,
      needs_human = true,
      last_message_at = now()
  where id = NEW.conversation_id;

  if v_prev is distinct from NEW.sender_id then
    select coalesce(nullif(trim(full_name), ''), email, 'Imperial Home')
    into v_name
    from public.profiles
    where id = NEW.sender_id;

    insert into public.notifications (user_id, title, body, link)
    values (
      v_customer,
      'Nouvelle assistance',
      coalesce(v_name, 'Imperial Home') || ' prend en charge votre demande.',
      '/account/chat'
    );

    insert into public.notifications (user_id, title, body, link)
    select p.id,
           'Assistance attribuée',
           coalesce(v_name, 'Imperial Home') || ' répond maintenant à ce client.',
           '/admin/chat'
    from public.profiles p
    where p.role in ('admin', 'main_admin')
      and p.id <> NEW.sender_id;

    insert into public.messages (conversation_id, sender_id, role, body)
    values (
      NEW.conversation_id,
      null,
      'system',
      '[[assigned]]' || coalesce(v_name, 'Imperial Home')
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists messages_assign_assistant on public.messages;
create trigger messages_assign_assistant
  after insert on public.messages
  for each row
  execute function public.on_admin_message();

create or replace function public.on_human_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if NEW.needs_human
     and NEW.assigned_admin_id is null
     and (TG_OP = 'INSERT' or not coalesce(OLD.needs_human, false)) then
    select coalesce(nullif(trim(full_name), ''), email, 'Client')
    into v_name
    from public.profiles
    where id = NEW.customer_id;

    insert into public.notifications (user_id, title, body, link)
    select p.id,
           'Assistance demandée',
           coalesce(v_name, 'Client') || ' souhaite parler à un administrateur.',
           '/admin/chat'
    from public.profiles p
    where p.role in ('admin', 'main_admin');
  end if;
  return NEW;
end;
$$;

drop trigger if exists conversations_human_requested on public.conversations;
create trigger conversations_human_requested
  after insert or update of needs_human on public.conversations
  for each row
  execute function public.on_human_requested();

revoke all on function public.open_customer_conversation(uuid) from public, anon;
revoke all on function public.conversation_senders(uuid) from public, anon;
grant execute on function public.open_customer_conversation(uuid) to authenticated;
grant execute on function public.conversation_senders(uuid) to authenticated;

notify pgrst, 'reload schema';


-- ===== 20260827100020_place_conquete.sql =====

update public.properties
set
  address = 'Imperial Home, Carrefour Conquête',
  neighborhood = 'Carrefour Conquête',
  city = 'Douala',
  latitude = 4.0689,
  longitude = 9.7568,
  recommendations_en = 'Shops and the main road are a few minutes from Carrefour Conquête.',
  recommendations_fr = 'Les boutiques et la route principale sont à quelques minutes du Carrefour Conquête.';


-- ===== 20260827100021_publish_home_hero.sql =====

-- The chosen homepage photo must be readable by visitors.
-- The live policy had dropped home_hero_image_url, so the site
-- fell back to a stock photo that looked like it kept changing.

drop policy if exists config_public_read on public.system_config;
create policy config_public_read on public.system_config
  for select using (
    key in (
      'phone', 'whatsapp', 'email', 'payment_instructions_en',
      'payment_instructions_fr', 'hold_minutes', 'brand_name', 'city',
      'home_fiche_image_url', 'home_hero_image_url'
    )
    or public.is_staff()
  );

drop policy if exists config_staff_insert on public.system_config;
create policy config_staff_insert on public.system_config
  for insert with check (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url', 'home_hero_image_url'
    )
  );

drop policy if exists config_staff_update on public.system_config;
create policy config_staff_update on public.system_config
  for update using (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url', 'home_hero_image_url'
    )
  )
  with check (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url', 'home_hero_image_url'
    )
  );


-- ===== 20260827100022_place_pin.sql =====

-- Guests can read the Imperial Home pin. Only the main admin can move it.

drop policy if exists config_public_read on public.system_config;
create policy config_public_read on public.system_config
  for select using (
    key in (
      'phone', 'whatsapp', 'email', 'payment_instructions_en',
      'payment_instructions_fr', 'hold_minutes', 'brand_name', 'city',
      'home_fiche_image_url', 'home_hero_image_url',
      'place_address', 'place_latitude', 'place_longitude'
    )
    or public.is_staff()
  );

insert into public.system_config (key, value)
values
  ('place_address', to_jsonb('Imperial Home, Carrefour Conquête'::text)),
  ('place_latitude', to_jsonb('4.0689'::text)),
  ('place_longitude', to_jsonb('9.7568'::text))
on conflict (key) do nothing;


-- ===== 20260827100023_booking_rules.sql =====

-- The nightly rate is the price. A discount exists only when the guest enters a promo code.
-- A reservation stays pending until an administrator accepts it, and any administrator can cancel it afterwards.

alter table public.promotions add column if not exists code text;
create unique index if not exists promotions_code_idx
  on public.promotions (lower(code))
  where code is not null and length(trim(code)) > 0;

drop function if exists public.price_stay(uuid, date, date, integer, text, uuid[]);
drop function if exists public.quote_stay(uuid, date, date, integer, text, uuid[]);
drop function if exists public.create_booking(uuid, date, date, integer, text, uuid[]);

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
  v_base integer;
  v_discount integer := 0;
  v_services integer := 0;
  v_cleaning integer := 0;
  v_deposit integer := 0;
  v_name text := null;
  v_promo_id uuid := null;
  v_type public.discount_type;
  v_value numeric;
begin
  select nightly_rate_xaf, capacity into v_rate, v_capacity
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

  v_base := v_rate * v_nights;

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
      v_discount := floor(v_base * v_value / 100.0)::integer;
    else
      v_discount := least(v_value::integer, v_base);
    end if;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'properties' and column_name = 'cleaning_fee_xaf'
  ) then
    execute 'select cleaning_fee_xaf, security_deposit_xaf from public.properties where id = $1'
      into v_cleaning, v_deposit
      using p_property_id;
  end if;

  if to_regclass('public.stay_services') is not null then
    execute
      'select coalesce(sum(price_xaf), 0)::integer from public.stay_services where is_active and id = any($1)'
      into v_services
      using coalesce(p_service_ids, '{}'::uuid[]);
  end if;

  return jsonb_build_object(
    'nights', v_nights,
    'nightly_rate_xaf', v_rate,
    'base_amount_xaf', v_base,
    'discount_xaf', v_discount,
    'cleaning_fee_xaf', v_cleaning,
    'deposit_xaf', v_deposit,
    'services_xaf', v_services,
    'total_amount_xaf', v_base - v_discount + v_cleaning + v_deposit + v_services,
    'promotion_name', v_name,
    'promotion_id', v_promo_id,
    'long_stay', false,
    'capacity', v_capacity
  );
end;
$$;

create or replace function public.quote_stay(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_price jsonb;
  v_available boolean;
  v_status public.property_status;
begin
  v_price := public.price_stay(p_property_id, p_check_in, p_check_out, p_guest_count, null, '{}'::uuid[]);
  select status into v_status from public.properties where id = p_property_id;
  v_available := public.check_availability(p_property_id, p_check_in, p_check_out)
    and v_status = 'published';
  return v_price || jsonb_build_object('available', v_available);
end;
$$;

create or replace function public.quote_stay(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_promo_code text,
  p_service_ids uuid[]
) returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_price jsonb;
  v_available boolean;
  v_status public.property_status;
begin
  v_price := public.price_stay(p_property_id, p_check_in, p_check_out, p_guest_count, p_promo_code, p_service_ids);
  select status into v_status from public.properties where id = p_property_id;
  v_available := public.check_availability(p_property_id, p_check_in, p_check_out)
    and v_status = 'published';
  return v_price || jsonb_build_object('available', v_available);
end;
$$;

create or replace function public.create_booking(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_booking(p_property_id, p_check_in, p_check_out, p_guest_count, null, '{}'::uuid[]);
end;
$$;

create or replace function public.create_booking(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guest_count integer,
  p_promo_code text,
  p_service_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_property public.properties%rowtype;
  v_price jsonb;
  v_res public.reservations%rowtype;
  v_total integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  perform public.expire_holds();

  if p_check_out <= p_check_in then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;
  if p_check_in < current_date then
    raise exception 'Check-in cannot be in the past' using errcode = '22023';
  end if;

  select * into v_property from public.properties where id = p_property_id for update;
  if not found or v_property.status <> 'published' then
    raise exception 'Property is not available' using errcode = 'P0001';
  end if;
  if not public.check_availability(p_property_id, p_check_in, p_check_out) then
    raise exception 'Dates are not available' using errcode = 'P0001';
  end if;

  v_price := public.price_stay(p_property_id, p_check_in, p_check_out, p_guest_count, p_promo_code, p_service_ids);
  v_total := (v_price ->> 'total_amount_xaf')::integer;

  insert into public.reservations (
    public_code, property_id, customer_id, check_in, check_out, guest_count,
    base_amount_xaf, discount_xaf, total_amount_xaf, promotion_id, status, hold_expires_at
  ) values (
    'IH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_property_id, v_user, p_check_in, p_check_out, p_guest_count,
    (v_price ->> 'base_amount_xaf')::integer,
    (v_price ->> 'discount_xaf')::integer,
    v_total,
    nullif(v_price ->> 'promotion_id', '')::uuid,
    'pending',
    null
  )
  returning * into v_res;

  if to_regclass('public.reservation_services') is not null then
    execute
      'insert into public.reservation_services (reservation_id, service_id, price_xaf)
       select $1, s.id, s.price_xaf
       from public.stay_services s
       where s.is_active and s.id = any($2)'
      using v_res.id, coalesce(p_service_ids, '{}'::uuid[]);
  end if;

  insert into public.payments (reservation_id, amount_xaf, status, idempotency_key)
  values (v_res.id, v_total, 'pending', v_res.id::text);

  insert into public.notifications (user_id, title, body, link)
  values (
    v_user,
    'Réservation enregistrée',
    'Votre réservation ' || v_res.public_code || ' est enregistrée. Un administrateur doit l’accepter.',
    '/account/reservations/' || v_res.id::text
  );

  perform public.write_audit('create_booking', 'reservation', v_res.id, null, to_jsonb(v_res));

  return jsonb_build_object(
    'id', v_res.id,
    'public_code', v_res.public_code,
    'status', v_res.status,
    'total_amount_xaf', v_res.total_amount_xaf,
    'hold_expires_at', v_res.hold_expires_at
  );
exception
  when exclusion_violation then
    raise exception 'Dates are not available' using errcode = 'P0001';
end;
$$;

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
begin
  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'Reservation not found';
  end if;

  if not (
    v_res.customer_id = auth.uid()
    or public.is_staff()
    or public.has_permission('reservations')
    or public.current_role() = 'main_admin'
  ) then
    raise exception 'Not allowed to cancel this reservation';
  end if;

  if v_res.status in ('cancelled', 'completed') then
    raise exception 'Reservation cannot be cancelled';
  end if;

  update public.reservations
    set status = 'cancelled',
        updated_at = now()
    where id = p_reservation_id;

  update public.payments
    set status = 'cancelled',
        failure_reason = coalesce(p_reason, failure_reason),
        updated_at = now()
    where reservation_id = p_reservation_id;

  if to_regclass('public.vehicle_rentals') is not null then
    update public.vehicle_rentals
      set status = 'cancelled'
      where reservation_id = p_reservation_id;
  end if;

  perform public.write_audit(
    'cancel_reservation',
    'reservation',
    p_reservation_id,
    to_jsonb(v_res),
    jsonb_build_object('status', 'cancelled', 'reason', p_reason)
  );

  return jsonb_build_object('id', p_reservation_id, 'status', 'cancelled');
end;
$$;

grant execute on function public.price_stay(uuid, date, date, integer, text, uuid[]) to anon, authenticated;
grant execute on function public.quote_stay(uuid, date, date, integer) to anon, authenticated;
grant execute on function public.quote_stay(uuid, date, date, integer, text, uuid[]) to anon, authenticated;
grant execute on function public.create_booking(uuid, date, date, integer) to authenticated;
grant execute on function public.create_booking(uuid, date, date, integer, text, uuid[]) to authenticated;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;

update public.reservations
set hold_expires_at = null
where status in ('pending', 'payment_processing');

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'properties' and column_name = 'weekly_discount_percent'
  ) then
    update public.properties
    set weekly_discount_percent = 0,
        monthly_discount_percent = 0
    where weekly_discount_percent <> 0
       or monthly_discount_percent <> 0;
  end if;
end $$;


-- ===== 20260828100000_push_subscriptions.sql =====

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_own_select" on public.push_subscriptions;
create policy "push_own_select" on public.push_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "push_own_insert" on public.push_subscriptions;
create policy "push_own_insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
drop policy if exists "push_own_update" on public.push_subscriptions;
create policy "push_own_update" on public.push_subscriptions for update using (auth.uid() = user_id);
drop policy if exists "push_own_delete" on public.push_subscriptions;
create policy "push_own_delete" on public.push_subscriptions for delete using (auth.uid() = user_id);


-- ===== 20260829100000_app_extras.sql =====

-- Review photos, property video tour, guest-visible cleaning status, friend referrals.

alter table public.reviews add column if not exists photos text[] not null default '{}';
alter table public.properties add column if not exists video_url text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles (id) on delete set null;

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

drop policy if exists storage_review_photos_read on storage.objects;
create policy storage_review_photos_read on storage.objects
  for select using (bucket_id = 'review-photos');

drop policy if exists storage_review_photos_insert on storage.objects;
create policy storage_review_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists turnover_guest_read on public.turnover_tasks;
create policy turnover_guest_read on public.turnover_tasks for select using (
  exists (
    select 1 from public.reservations r
    where r.id = reservation_id and r.customer_id = auth.uid()
  )
);

create or replace function public.my_referral_code()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select upper(substr(auth.uid()::text, 1, 8));
$$;

create or replace function public.claim_referral(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer uuid;
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
  return found;
end;
$$;

create or replace function public.my_referral_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.profiles where referred_by = auth.uid();
$$;

grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.my_referral_count() to authenticated;


-- ===== 20260829110000_cleaning_alerts_referral_rewards.sql =====

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
    'Bienvenue chez Imperial Home',
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


-- ===== 20260829120000_brand_without_accent.sql =====

-- The brand is written "Imperial Home" (no accent). Fix texts already stored in the database.

do $$
declare
  r record;
begin
  for r in
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.is_generated = 'NEVER'
      and c.data_type in ('text', 'character varying', 'jsonb')
  loop
    if r.data_type = 'jsonb' then
      execute format(
        'update public.%I set %I = replace(replace(replace(%I::text, %L, %L), %L, %L), %L, %L)::jsonb where %I::text like %L or %I::text like %L or %I::text like %L',
        r.table_name, r.column_name, r.column_name,
        'Impérial', 'Imperial', 'IMPÉRIAL', 'IMPERIAL', 'impérial', 'imperial',
        r.column_name, '%Impérial%', r.column_name, '%IMPÉRIAL%', r.column_name, '%impérial%'
      );
    else
      execute format(
        'update public.%I set %I = replace(replace(replace(%I, %L, %L), %L, %L), %L, %L) where %I like %L or %I like %L or %I like %L',
        r.table_name, r.column_name, r.column_name,
        'Impérial', 'Imperial', 'IMPÉRIAL', 'IMPERIAL', 'impérial', 'imperial',
        r.column_name, '%Impérial%', r.column_name, '%IMPÉRIAL%', r.column_name, '%impérial%'
      );
    end if;
  end loop;

  for r in
    select pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        pg_get_functiondef(p.oid) like '%Impérial%'
        or pg_get_functiondef(p.oid) like '%IMPÉRIAL%'
        or pg_get_functiondef(p.oid) like '%impérial%'
      )
  loop
    execute replace(replace(replace(r.def, 'Impérial', 'Imperial'), 'IMPÉRIAL', 'IMPERIAL'), 'impérial', 'imperial');
  end loop;
end;
$$;


-- ===== 20260829130000_wifi_on_confirmation.sql =====

-- Wi-Fi name and password are written on the housing sheet as soon as a reservation is approved.

insert into public.property_welcome_secrets (property_id, wifi_name, wifi_password)
select p.id, 'Imperial Home', 'ML237Roi'
from public.properties p
on conflict (property_id) do update
set wifi_name = 'Imperial Home', wifi_password = 'ML237Roi', updated_at = now();

create or replace function public.guard_housing_wifi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_property uuid;
  v_name text;
  v_password text;
begin
  select status, property_id into v_status, v_property
  from public.reservations
  where id = new.reservation_id;

  if v_status is null or v_status not in ('confirmed', 'completed') then
    new.wifi_name := '';
    new.wifi_password := '';
    return new;
  end if;

  select wifi_name, wifi_password into v_name, v_password
  from public.property_welcome_secrets
  where property_id = v_property;

  if coalesce(trim(new.wifi_name), '') = '' then
    new.wifi_name := coalesce(nullif(trim(v_name), ''), 'Imperial Home');
  end if;
  if coalesce(trim(new.wifi_password), '') = '' then
    new.wifi_password := coalesce(nullif(trim(v_password), ''), 'ML237Roi');
  end if;
  return new;
end;
$$;

create or replace function public.guest_wifi(p_reservation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_res public.reservations;
  v_name text;
  v_password text;
begin
  select * into v_res from public.reservations where id = p_reservation_id;
  if not found or v_res.status not in ('confirmed', 'completed') then
    return null;
  end if;
  if v_res.customer_id is distinct from auth.uid() and not public.is_staff() then
    return null;
  end if;
  select wifi_name, wifi_password into v_name, v_password
  from public.property_welcome_secrets
  where property_id = v_res.property_id;
  return jsonb_build_object(
    'wifi_name', coalesce(nullif(trim(v_name), ''), 'Imperial Home'),
    'wifi_password', coalesce(nullif(trim(v_password), ''), 'ML237Roi')
  );
end;
$$;

grant execute on function public.guest_wifi(uuid) to authenticated;

create or replace function public.fill_housing_sheet_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_time_in text;
  v_time_out text;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then
    return new;
  end if;

  select * into v_profile from public.profiles where id = new.customer_id;
  select left(check_in_time::text, 5), left(check_out_time::text, 5)
  into v_time_in, v_time_out
  from public.properties where id = new.property_id;

  insert into public.housing_sheets (
    reservation_id, guest_name, guest_phone, arrival_date, arrival_time, departure_date, departure_time
  )
  values (
    new.id,
    coalesce(v_profile.full_name, ''),
    coalesce(v_profile.phone, ''),
    new.check_in,
    v_time_in,
    new.check_out,
    v_time_out
  )
  on conflict (reservation_id) do update
  set wifi_name = public.housing_sheets.wifi_name,
      updated_at = now();

  insert into public.notifications (user_id, title, body, link, kind)
  values (
    new.customer_id,
    'Wi-Fi disponible sur votre fiche logement',
    'Votre réservation est validée. Le nom du Wi-Fi et le mot de passe sont écrits sur votre fiche logement.',
    '/account/reservations/' || new.id::text || '/fiche',
    'wifi:' || new.id::text
  )
  on conflict (kind) where kind is not null do nothing;

  return new;
end;
$$;

drop trigger if exists reservations_fill_housing_sheet on public.reservations;
create trigger reservations_fill_housing_sheet
  after insert or update of status on public.reservations
  for each row execute function public.fill_housing_sheet_on_approval();

-- Reservations approved before this change get the Wi-Fi too.
update public.housing_sheets hs
set updated_at = now()
from public.reservations r
where hs.reservation_id = r.id
  and r.status in ('confirmed', 'completed');

insert into public.housing_sheets (reservation_id, guest_name, guest_phone, arrival_date, departure_date)
select r.id, coalesce(p.full_name, ''), coalesce(p.phone, ''), r.check_in, r.check_out
from public.reservations r
left join public.profiles p on p.id = r.customer_id
where r.status in ('confirmed', 'completed')
  and not exists (select 1 from public.housing_sheets h where h.reservation_id = r.id);

notify pgrst, 'reload schema';


-- ===== 20260829140001_super_admin_hierarchy.sql =====

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


-- ===== 20260829160000_activity_log.sql =====

-- Activity journal: who connected, when, and what they did. Readable by the super admin only.

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  kind text not null,
  entity text,
  op text,
  entity_id text,
  path text,
  details jsonb not null default '{}'::jsonb,
  device text,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_user_idx on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_kind_idx on public.activity_log (kind, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_super_select on public.activity_log;
create policy activity_log_super_select on public.activity_log
  for select using (public.actor_role() = 'super_admin');

revoke all on public.activity_log from public, anon, authenticated;
grant select on public.activity_log to authenticated;

-- Connections and page views sent by the app.
create or replace function public.log_activity(
  p_kind text,
  p_path text default null,
  p_details jsonb default '{}'::jsonb,
  p_session text default null,
  p_device text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_email text;
  v_role text;
begin
  if v_uid is null then
    return;
  end if;
  if p_kind not in ('login', 'logout', 'open', 'page') then
    return;
  end if;
  select full_name, email, role::text into v_name, v_email, v_role from public.profiles where id = v_uid;
  insert into public.activity_log (user_id, user_name, user_email, user_role, kind, path, details, device, session_id)
  values (
    v_uid, v_name, v_email, v_role, p_kind,
    left(p_path, 300),
    coalesce(p_details, '{}'::jsonb),
    left(p_device, 200),
    left(p_session, 80)
  );
end;
$$;

revoke all on function public.log_activity(text, text, jsonb, text, text) from public, anon;
grant execute on function public.log_activity(text, text, jsonb, text, text) to authenticated;

-- Actions on the data (reservations, properties, payments...) are written by the database itself.
create or replace function public.log_row_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
  v_old jsonb;
  v_changed text[];
  v_det jsonb := '{}'::jsonb;
  v_name text;
  v_email text;
  v_role text;
begin
  if v_uid is null then
    return null;
  end if;
  begin
    if tg_op = 'DELETE' then
      v_row := to_jsonb(old);
    else
      v_row := to_jsonb(new);
    end if;

    if tg_op = 'UPDATE' then
      v_old := to_jsonb(old);
      select coalesce(array_agg(e.key order by e.key), '{}'::text[])
        into v_changed
      from jsonb_each(v_row) e
      where e.value is distinct from (v_old -> e.key)
        and e.key not in ('updated_at');
      if coalesce(array_length(v_changed, 1), 0) = 0 then
        return null;
      end if;
      v_det := jsonb_build_object('changed', to_jsonb(v_changed));
      if 'status' = any (v_changed) then
        v_det := v_det || jsonb_build_object('status_from', v_old -> 'status', 'status_to', v_row -> 'status');
      end if;
      if tg_table_name = 'profiles' and 'role' = any (v_changed) then
        v_det := v_det || jsonb_build_object('role_from', v_old -> 'role', 'role_to', v_row -> 'role');
      end if;
    elsif v_row ? 'status' then
      v_det := jsonb_build_object('status', v_row -> 'status');
    end if;

    select full_name, email, role::text into v_name, v_email, v_role from public.profiles where id = v_uid;

    insert into public.activity_log (user_id, user_name, user_email, user_role, kind, entity, op, entity_id, details)
    values (
      v_uid, v_name, v_email, v_role, 'action', tg_table_name, lower(tg_op),
      coalesce(v_row ->> 'id', v_row ->> 'key'),
      v_det
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;

revoke all on function public.log_row_activity() from public, anon, authenticated;

do $$
declare
  t text;
  v_ops text;
begin
  foreach t in array array[
    'reservations', 'properties', 'payments', 'documents', 'promotions', 'reviews',
    'messages', 'admin_profiles', 'admin_permissions', 'profiles', 'vehicles',
    'vehicle_rentals', 'turnover_tasks', 'housing_sheets', 'system_config'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    v_ops := case t
      when 'messages' then 'insert'
      when 'profiles' then 'insert or update'
      else 'insert or update or delete'
    end;
    execute format('drop trigger if exists activity_log_%I on public.%I', t, t);
    execute format(
      'create trigger activity_log_%I after %s on public.%I for each row execute function public.log_row_activity()',
      t, v_ops, t
    );
  end loop;
end;
$$;

-- One line per person: last connection, last seen, counters. Super admin only.
create or replace function public.activity_users()
returns table (
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  last_login timestamptz,
  last_seen timestamptz,
  logins bigint,
  events bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.actor_role() is distinct from 'super_admin' then
    raise exception 'Reserved for the super administrator' using errcode = '42501';
  end if;
  return query
  select
    l.user_id,
    (array_agg(l.user_name order by l.created_at desc))[1],
    (array_agg(l.user_email order by l.created_at desc))[1],
    (array_agg(l.user_role order by l.created_at desc))[1],
    max(l.created_at) filter (where l.kind in ('login', 'open')),
    max(l.created_at),
    count(*) filter (where l.kind in ('login', 'open')),
    count(*)
  from public.activity_log l
  where l.user_id is not null
  group by l.user_id
  order by max(l.created_at) desc;
end;
$$;

revoke all on function public.activity_users() from public, anon;
grant execute on function public.activity_users() to authenticated;

notify pgrst, 'reload schema';


-- ===== 20260829170000_support_chat_routing.sql =====

-- A customer message reaches an available administrator or super administrator.
-- First message: the conversation is flagged "needs a human" and every staff member is notified (existing trigger).
-- Next messages: the assigned admin is notified, otherwise the staff members who are online (last 10 minutes), otherwise all staff.

create or replace function public.on_customer_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations%rowtype;
  v_name text;
  v_preview text;
  v_online boolean := false;
begin
  if new.role <> 'customer' then
    return new;
  end if;

  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  select coalesce(nullif(trim(full_name), ''), email, 'Client') into v_name from public.profiles where id = v_conv.customer_id;
  v_preview := left(coalesce(nullif(trim(new.body), ''), 'Photo'), 120);

  update public.conversations set last_message_at = now() where id = v_conv.id;

  if v_conv.assigned_admin_id is not null then
    insert into public.notifications (user_id, title, body, link)
    values (v_conv.assigned_admin_id, coalesce(v_name, 'Client'), v_preview, '/admin/chat');
    return new;
  end if;

  if not v_conv.needs_human then
    update public.conversations set needs_human = true where id = v_conv.id;
    return new;
  end if;

  if to_regclass('public.activity_log') is not null then
    select exists (
      select 1 from public.activity_log l
      join public.profiles p on p.id = l.user_id
      where p.role in ('admin', 'main_admin', 'super_admin')
        and l.created_at > now() - interval '10 minutes'
    ) into v_online;
  end if;

  insert into public.notifications (user_id, title, body, link)
  select p.id, coalesce(v_name, 'Client'), v_preview, '/admin/chat'
  from public.profiles p
  left join public.admin_profiles a on a.id = p.id
  where p.role in ('admin', 'main_admin', 'super_admin')
    and coalesce(a.is_active, true)
    and (
      p.role in ('main_admin', 'super_admin')
      or exists (select 1 from public.admin_permissions ap where ap.admin_id = p.id and ap.permission::text = 'chat')
    )
    and (
      not v_online
      or exists (
        select 1 from public.activity_log l
        where l.user_id = p.id and l.created_at > now() - interval '10 minutes'
      )
    );

  return new;
end;
$$;

revoke all on function public.on_customer_message() from public, anon, authenticated;

drop trigger if exists messages_notify_staff on public.messages;
create trigger messages_notify_staff
  after insert on public.messages
  for each row
  execute function public.on_customer_message();

notify pgrst, 'reload schema';


-- ===== 20260829180000_chat_reply_notifications.sql =====

-- The customer gets a notification for every reply from an administrator (one unread notification per customer, updated each time).
create or replace function public.on_admin_reply_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_name text;
  v_preview text;
begin
  if new.role <> 'admin' then
    return new;
  end if;
  select customer_id into v_customer from public.conversations where id = new.conversation_id;
  if v_customer is null then
    return new;
  end if;
  select coalesce(nullif(trim(full_name), ''), 'Imperial Home') into v_name from public.profiles where id = new.sender_id;
  v_preview := left(coalesce(nullif(trim(new.body), ''), 'Photo'), 140);

  delete from public.notifications
  where user_id = v_customer and read_at is null and link = '/account/chat' and title = 'Nouveau message';

  insert into public.notifications (user_id, title, body, link)
  values (v_customer, 'Nouveau message', coalesce(v_name, 'Imperial Home') || ' : ' || v_preview, '/account/chat');
  return new;
end;
$$;

revoke all on function public.on_admin_reply_notify() from public, anon, authenticated;

drop trigger if exists messages_notify_customer on public.messages;
create trigger messages_notify_customer
  after insert on public.messages
  for each row
  execute function public.on_admin_reply_notify();

notify pgrst, 'reload schema';
