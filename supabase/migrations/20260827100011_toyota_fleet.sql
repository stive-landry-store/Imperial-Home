-- Flotte Toyota Impérial Home (Corolla Vert, Avensis) + photos
-- Inclut le schéma véhicules si la migration 20260827100010_platform_features n'a pas encore été appliquée.

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

drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles for select using (status = 'published' or public.has_permission('properties'));
drop policy if exists vehicles_write on public.vehicles;
create policy vehicles_write on public.vehicles for all using (public.has_permission('properties')) with check (public.has_permission('properties'));

drop policy if exists vehicle_media_read on public.vehicle_media;
create policy vehicle_media_read on public.vehicle_media for select using (
  exists (select 1 from public.vehicles v where v.id = vehicle_id and (v.status = 'published' or public.has_permission('properties')))
);
drop policy if exists vehicle_media_write on public.vehicle_media;
create policy vehicle_media_write on public.vehicle_media for all using (public.has_permission('properties')) with check (public.has_permission('properties'));

drop policy if exists vehicle_unavail_read on public.vehicle_unavailability;
create policy vehicle_unavail_read on public.vehicle_unavailability for select using (public.is_staff() or true);
drop policy if exists vehicle_unavail_write on public.vehicle_unavailability;
create policy vehicle_unavail_write on public.vehicle_unavailability for all using (public.has_permission('properties')) with check (public.has_permission('properties'));

drop policy if exists vehicle_promo_read on public.vehicle_promo_codes;
create policy vehicle_promo_read on public.vehicle_promo_codes for select using (is_active or public.is_staff());
drop policy if exists vehicle_promo_write on public.vehicle_promo_codes;
create policy vehicle_promo_write on public.vehicle_promo_codes for all using (public.has_permission('promotions')) with check (public.has_permission('promotions'));

drop policy if exists vehicle_rentals_select on public.vehicle_rentals;
create policy vehicle_rentals_select on public.vehicle_rentals for select using (
  exists (select 1 from public.reservations r where r.id = reservation_id and (r.customer_id = auth.uid() or public.is_staff()))
);
drop policy if exists vehicle_rentals_insert on public.vehicle_rentals;
create policy vehicle_rentals_insert on public.vehicle_rentals for insert with check (
  exists (select 1 from public.reservations r where r.id = reservation_id and r.customer_id = auth.uid())
);

grant select on public.vehicles, public.vehicle_media, public.vehicle_unavailability, public.vehicle_promo_codes, public.vehicle_rentals to anon, authenticated;
grant all on public.vehicles, public.vehicle_media, public.vehicle_unavailability, public.vehicle_promo_codes to authenticated;

-- Données Toyota (remplace l'ancien seed démo Land Cruiser / Mercedes / Range Rover s'il existe)

delete from public.vehicle_media
where vehicle_id in (select id from public.vehicles where slug in (
  'toyota-land-cruiser', 'mercedes-e-class', 'range-rover-sport'
));

delete from public.vehicles
where slug in ('toyota-land-cruiser', 'mercedes-e-class', 'range-rover-sport');

insert into public.vehicles (
  slug, brand, model, description_fr, description_en,
  daily_rate_no_driver_xaf, daily_rate_with_driver_xaf, sort_order, status
)
values
  (
    'toyota-corolla-vert',
    'Toyota',
    'Corolla Vert',
    'Berline Toyota Corolla Vert — confortable pour la ville et les trajets Douala.',
    'Toyota Corolla Vert sedan — comfortable for city and Douala trips.',
    50000,
    60000,
    1,
    'published'
  ),
  (
    'toyota-avensis',
    'Toyota',
    'Avensis',
    'Toyota Avensis — spacieuse, idéale pour famille ou déplacements professionnels.',
    'Toyota Avensis — spacious, ideal for family or business travel.',
    35000,
    45000,
    2,
    'published'
  )
on conflict (slug) do update set
  brand = excluded.brand,
  model = excluded.model,
  description_fr = excluded.description_fr,
  description_en = excluded.description_en,
  daily_rate_no_driver_xaf = excluded.daily_rate_no_driver_xaf,
  daily_rate_with_driver_xaf = excluded.daily_rate_with_driver_xaf,
  sort_order = excluded.sort_order,
  status = excluded.status;

insert into public.vehicle_media (vehicle_id, url, media_type, sort_order)
select v.id, m.url, 'image', m.sort_order
from public.vehicles v
join (
  values
    ('toyota-corolla-vert', 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1600&q=80', 0),
    ('toyota-corolla-vert', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=80', 1),
    ('toyota-avensis', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1600&q=80', 0),
    ('toyota-avensis', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=80', 1)
) as m(slug, url, sort_order) on m.slug = v.slug
where not exists (
  select 1 from public.vehicle_media vm where vm.vehicle_id = v.id and vm.url = m.url
);
