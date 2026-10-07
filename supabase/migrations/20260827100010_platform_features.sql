-- Auth repair, reservation cancel, vehicles, car promos

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

  if v_user.email is not null and lower(trim(v_user.email)) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(v_user.id);
    select * into v_profile from public.profiles where id = v_user.id;
  end if;

  return v_profile;
end;
$$;

grant execute on function public.ensure_profile() to authenticated;

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

  update public.vehicle_rentals
    set status = 'cancelled'
    where reservation_id = p_reservation_id;

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

grant execute on function public.cancel_reservation(uuid, text) to authenticated;

-- Vehicle fleet
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand text not null,
  model text not null,
  description_en text not null default '',
  description_fr text not null default '',
  daily_rate_no_driver_xaf integer not null check (daily_rate_no_driver_xaf >= 0),
  daily_rate_with_driver_xaf integer not null check (daily_rate_with_driver_xaf >= 0),
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_media (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  url text not null,
  storage_path text,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_unavailability (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text,
  check (end_date > start_date)
);

create table if not exists public.vehicle_promo_codes (
  code text primary key,
  discount_percent numeric(5, 2) not null default 5 check (discount_percent > 0 and discount_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.vehicle_promo_codes (code, discount_percent, is_active)
values ('IMPERIAL5', 5, true)
on conflict (code) do nothing;

create table if not exists public.vehicle_rentals (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  with_driver boolean not null default false,
  days integer not null check (days > 0),
  daily_rate_xaf integer not null check (daily_rate_xaf >= 0),
  discount_xaf integer not null default 0 check (discount_xaf >= 0),
  total_xaf integer not null check (total_xaf >= 0),
  promo_code text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (reservation_id)
);

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
    join public.reservations r on r.id = vr.reservation_id
    where vr.vehicle_id = p_vehicle_id
      and vr.status <> 'cancelled'
      and r.status in ('pending', 'payment_processing', 'confirmed')
      and daterange(r.check_in, r.check_out, '[)') && daterange(p_start, p_end, '[)')
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
    reservation_id, vehicle_id, with_driver, days, daily_rate_xaf, discount_xaf, total_xaf, promo_code, status
  ) values (
    p_reservation_id, p_vehicle_id, p_with_driver, v_days, v_rate, v_discount, v_total, nullif(trim(p_promo_code), ''), 'requested'
  )
  on conflict (reservation_id) do update
    set vehicle_id = excluded.vehicle_id,
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

grant execute on function public.check_vehicle_availability(uuid, date, date) to anon, authenticated;
grant execute on function public.add_vehicle_rental(uuid, uuid, boolean, text) to authenticated;

alter table public.vehicles enable row level security;
alter table public.vehicle_media enable row level security;
alter table public.vehicle_unavailability enable row level security;
alter table public.vehicle_promo_codes enable row level security;
alter table public.vehicle_rentals enable row level security;

create policy vehicles_public_read on public.vehicles for select using (status = 'published' or public.has_permission('properties'));
create policy vehicles_write on public.vehicles for all using (public.has_permission('properties')) with check (public.has_permission('properties'));

create policy vehicle_media_read on public.vehicle_media for select using (
  exists (select 1 from public.vehicles v where v.id = vehicle_id and (v.status = 'published' or public.has_permission('properties')))
);
create policy vehicle_media_write on public.vehicle_media for all using (public.has_permission('properties')) with check (public.has_permission('properties'));

create policy vehicle_unavail_read on public.vehicle_unavailability for select using (public.is_staff() or true);
create policy vehicle_unavail_write on public.vehicle_unavailability for all using (public.has_permission('properties')) with check (public.has_permission('properties'));

create policy vehicle_promo_read on public.vehicle_promo_codes for select using (is_active or public.is_staff());
create policy vehicle_promo_write on public.vehicle_promo_codes for all using (public.has_permission('promotions')) with check (public.has_permission('promotions'));

create policy vehicle_rentals_select on public.vehicle_rentals for select using (
  exists (select 1 from public.reservations r where r.id = reservation_id and (r.customer_id = auth.uid() or public.is_staff()))
);
create policy vehicle_rentals_insert on public.vehicle_rentals for insert with check (
  exists (select 1 from public.reservations r where r.id = reservation_id and r.customer_id = auth.uid())
);

grant select on public.vehicles, public.vehicle_media, public.vehicle_unavailability, public.vehicle_promo_codes, public.vehicle_rentals to anon, authenticated;
grant all on public.vehicles, public.vehicle_media, public.vehicle_unavailability, public.vehicle_promo_codes to authenticated;

insert into public.vehicles (slug, brand, model, description_fr, description_en, daily_rate_no_driver_xaf, daily_rate_with_driver_xaf, sort_order)
values
  ('toyota-land-cruiser', 'Toyota', 'Land Cruiser', 'SUV premium pour Douala et environs.', 'Premium SUV for Douala and surroundings.', 85000, 120000, 1),
  ('mercedes-e-class', 'Mercedes-Benz', 'Classe E', 'Berline exécutive avec chauffeur optionnel.', 'Executive sedan with optional chauffeur.', 95000, 135000, 2),
  ('range-rover-sport', 'Range Rover', 'Sport', 'Confort haut de gamme pour vos déplacements.', 'High-end comfort for your trips.', 110000, 155000, 3)
on conflict (slug) do nothing;
