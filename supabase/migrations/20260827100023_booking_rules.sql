-- The nightly rate is the price. A discount exists only when the guest enters a promo code.
-- A reservation stays pending until an administrator accepts it, and any administrator can cancel it afterwards.

alter table public.promotions add column if not exists code text;
create unique index if not exists promotions_code_idx
  on public.promotions (lower(code))
  where code is not null and length(trim(code)) > 0;

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
