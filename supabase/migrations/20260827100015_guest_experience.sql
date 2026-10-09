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
      'Un séjour s''est libéré pour ' || coalesce(v_name, 'Impérial Home')
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
