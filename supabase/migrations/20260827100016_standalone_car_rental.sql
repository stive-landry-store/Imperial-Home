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
      'Votre location ' || v_code || ' (' || v_vehicle.brand || ' ' || v_vehicle.model || ') est enregistrée. Impérial Home la confirme.',
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
