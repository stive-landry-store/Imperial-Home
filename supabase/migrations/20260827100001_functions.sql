-- Helpers, booking RPCs, payment events, audit, profile bootstrap

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger properties_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger reservations_updated_at before update on public.reservations
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

create or replace function public.bootstrap_admin_emails()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select array_agg(lower(trim(e)))
      from public.system_config c,
           lateral jsonb_array_elements_text(c.value) as e
      where c.key = 'bootstrap_admin_emails'
        and jsonb_typeof(c.value) = 'array'
    ),
    (
      select array_agg(lower(trim(x))) filter (where length(trim(x)) > 0)
      from public.system_config c,
           lateral unnest(string_to_array(c.value #>> '{}', ',')) as x
      where c.key = 'bootstrap_admin_email'
    ),
    '{}'::text[]
  );
$$;

create or replace function public.grant_bootstrap_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.user_role;
  v_role public.user_role;
begin
  select role into v_current from public.profiles where id = p_user_id;
  if v_current = 'main_admin' then
    v_role := 'main_admin';
  elsif exists (select 1 from public.profiles where role = 'main_admin') then
    v_role := 'admin';
  else
    v_role := 'main_admin';
  end if;

  update public.profiles
    set role = v_role
    where id = p_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title)
  values (
    p_user_id,
    true,
    true,
    case when v_role = 'main_admin' then 'Main Administrator' else 'Administrator' end
  )
  on conflict (id) do update
    set is_active = true,
        is_verified = true;

  insert into public.admin_permissions (admin_id, permission)
  select p_user_id, perm
  from unnest(array[
    'properties','reservations','customers','promotions',
    'payments','documents','chat','administrators'
  ]) as perm
  on conflict do nothing;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_phone text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_phone := new.raw_user_meta_data ->> 'phone';

  insert into public.profiles (id, email, full_name, phone, role)
  values (new.id, new.email, v_name, v_phone, 'customer');

  if new.email is not null and lower(new.email) = any(public.bootstrap_admin_emails()) then
    perform public.grant_bootstrap_admin(new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

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
      and p.role in ('admin', 'main_admin')
      and coalesce(a.is_active, p.role = 'main_admin')
  )
$$;

create or replace function public.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_role() = 'main_admin'
    or exists (
      select 1
      from public.admin_profiles a
      join public.admin_permissions ap on ap.admin_id = a.id
      where a.id = auth.uid()
        and a.is_active
        and ap.permission = p_key
    )
$$;

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_before jsonb default null,
  p_after jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after);
end;
$$;

create or replace function public.config_text(p_key text, p_default text default null)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select value #>> '{}' from public.system_config where key = p_key), p_default)
$$;

create or replace function public.expire_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.reservations
    set status = 'expired'
    where status in ('pending', 'payment_processing')
      and hold_expires_at is not null
      and hold_expires_at < now()
    returning id
  )
  update public.payments p
  set status = 'cancelled', failure_reason = 'Reservation hold expired'
  from expired e
  where p.reservation_id = e.id
    and p.status in ('pending', 'processing');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.check_availability(
  p_property_id uuid,
  p_check_in date,
  p_check_out date
) returns boolean
language sql
stable
security invoker
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
security invoker
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

create or replace function public.best_promotion(
  p_property_id uuid,
  p_base integer
) returns public.promotions
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.promotions p
  join public.promotion_properties pp on pp.promotion_id = p.id
  where pp.property_id = p_property_id
    and p.is_active
    and current_date between p.starts_at and p.ends_at
  order by
    case
      when p.discount_type = 'percent' then (p_base * p.discount_value / 100.0)
      else p.discount_value
    end desc,
    p.created_at
  limit 1
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
declare
  v_user uuid := auth.uid();
  v_property public.properties%rowtype;
  v_promo public.promotions%rowtype;
  v_nights integer;
  v_discount integer := 0;
  v_base integer;
  v_total integer;
  v_hold_minutes integer;
  v_res public.reservations%rowtype;
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

  select * into v_property
  from public.properties
  where id = p_property_id
  for update;

  if not found or v_property.status <> 'published' then
    raise exception 'Property is not available' using errcode = 'P0001';
  end if;
  if p_guest_count < 1 or p_guest_count > v_property.capacity then
    raise exception 'Invalid guest count' using errcode = '22023';
  end if;
  if not public.check_availability(p_property_id, p_check_in, p_check_out) then
    raise exception 'Dates are not available' using errcode = 'P0001';
  end if;

  v_nights := p_check_out - p_check_in;
  v_base := v_property.nightly_rate_xaf * v_nights;
  select * into v_promo from public.best_promotion(p_property_id, v_base);

  if v_promo.id is not null then
    if v_promo.discount_type = 'percent' then
      v_discount := floor(v_base * v_promo.discount_value / 100.0)::integer;
    else
      v_discount := least(v_promo.discount_value::integer, v_base);
    end if;
  end if;

  v_total := v_base - v_discount;
  v_hold_minutes := coalesce(public.config_text('hold_minutes', '30')::integer, 30);

  insert into public.reservations (
    public_code, property_id, customer_id, check_in, check_out, guest_count,
    base_amount_xaf, discount_xaf, total_amount_xaf, promotion_id, status, hold_expires_at
  ) values (
    'IH-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    p_property_id, v_user, p_check_in, p_check_out, p_guest_count,
    v_base, v_discount, v_total, v_promo.id, 'pending', now() + make_interval(mins => v_hold_minutes)
  )
  returning * into v_res;

  insert into public.payments (reservation_id, amount_xaf, status, idempotency_key)
  values (v_res.id, v_total, 'pending', v_res.id::text);

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

create or replace function public.apply_payment_event(
  p_reservation_id uuid,
  p_status public.payment_status,
  p_provider text default null,
  p_provider_reference text default null,
  p_external_id text default null,
  p_amount_xaf integer default null,
  p_failure_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_pay public.payments%rowtype;
  v_new_res public.reservation_status;
begin
  perform public.expire_holds();

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'Reservation not found' using errcode = 'P0002';
  end if;

  select * into v_pay
  from public.payments
  where reservation_id = p_reservation_id
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;

  if v_pay.status = 'successful' and p_status = 'successful' then
    return jsonb_build_object('ok', true, 'idempotent', true, 'reservation_id', v_res.id);
  end if;

  if p_amount_xaf is not null and p_amount_xaf <> v_pay.amount_xaf then
    raise exception 'Payment amount mismatch' using errcode = '22023';
  end if;

  if p_status = 'successful' then
    if v_res.status not in ('pending', 'payment_processing') then
      raise exception 'Reservation cannot be confirmed in its current state' using errcode = 'P0001';
    end if;
    v_new_res := 'confirmed';
  elsif p_status in ('failed', 'cancelled') then
    v_new_res := case when p_status = 'cancelled' then 'cancelled' else 'cancelled' end;
    if p_status = 'failed' then
      v_new_res := 'cancelled';
    end if;
  elsif p_status = 'processing' then
    v_new_res := 'payment_processing';
  elsif p_status = 'refunded' then
    v_new_res := 'cancelled';
  else
    v_new_res := v_res.status;
  end if;

  update public.payments
  set
    status = p_status,
    provider = coalesce(p_provider, provider),
    provider_reference = coalesce(p_provider_reference, provider_reference),
    external_id = coalesce(p_external_id, external_id),
    failure_reason = p_failure_reason,
    confirmed_by = case when p_status = 'successful' then auth.uid() else confirmed_by end,
    confirmed_at = case when p_status = 'successful' then now() else confirmed_at end
  where id = v_pay.id
  returning * into v_pay;

  update public.reservations
  set status = v_new_res
  where id = v_res.id
  returning * into v_res;

  if p_status = 'successful' then
    insert into public.notifications (user_id, title, body, link)
    values (
      v_res.customer_id,
      'Booking confirmed',
      'Reservation ' || v_res.public_code || ' is confirmed.',
      '/account/reservations/' || v_res.id::text
    );
  end if;

  perform public.write_audit(
    'apply_payment_event',
    'payment',
    v_pay.id,
    null,
    jsonb_build_object('payment', to_jsonb(v_pay), 'reservation', to_jsonb(v_res))
  );

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_res.id,
    'reservation_status', v_res.status,
    'payment_status', v_pay.status,
    'generate_documents', p_status = 'successful'
  );
end;
$$;

create or replace function public.confirm_payment(p_reservation_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('payments') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return public.apply_payment_event(
    p_reservation_id,
    'successful',
    'manual',
    p_note,
    null,
    null,
    null
  );
end;
$$;

create or replace function public.reject_payment(p_reservation_id uuid, p_reason text default 'Rejected by administrator')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission('payments') then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return public.apply_payment_event(
    p_reservation_id,
    'failed',
    'manual',
    null,
    null,
    null,
    p_reason
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
  v_property public.properties%rowtype;
  v_promo public.promotions%rowtype;
  v_nights integer;
  v_base integer;
  v_discount integer := 0;
  v_available boolean;
begin
  select * into v_property from public.properties where id = p_property_id;
  if not found then
    raise exception 'Property not found';
  end if;
  v_nights := p_check_out - p_check_in;
  if v_nights < 1 then
    raise exception 'Invalid date range';
  end if;
  v_base := v_property.nightly_rate_xaf * v_nights;
  select * into v_promo from public.best_promotion(p_property_id, v_base);
  if v_promo.id is not null then
    if v_promo.discount_type = 'percent' then
      v_discount := floor(v_base * v_promo.discount_value / 100.0)::integer;
    else
      v_discount := least(v_promo.discount_value::integer, v_base);
    end if;
  end if;
  v_available := public.check_availability(p_property_id, p_check_in, p_check_out)
    and p_guest_count between 1 and v_property.capacity
    and v_property.status = 'published';
  return jsonb_build_object(
    'available', v_available,
    'nights', v_nights,
    'nightly_rate_xaf', v_property.nightly_rate_xaf,
    'base_amount_xaf', v_base,
    'discount_xaf', v_discount,
    'total_amount_xaf', v_base - v_discount,
    'promotion_name', v_promo.name,
    'capacity', v_property.capacity
  );
end;
$$;

grant execute on function public.check_availability(uuid, date, date) to anon, authenticated;
grant execute on function public.get_unavailable_ranges(uuid) to anon, authenticated;
grant execute on function public.quote_stay(uuid, date, date, integer) to anon, authenticated;
grant execute on function public.create_booking(uuid, date, date, integer) to authenticated;
grant execute on function public.confirm_payment(uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.expire_holds() to authenticated, service_role;
grant execute on function public.apply_payment_event(uuid, public.payment_status, text, text, text, integer, text) to service_role;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.current_role() to authenticated;
