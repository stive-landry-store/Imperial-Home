-- Admin "Valider" must confirm even after the 30-minute hold, notify the guest, and leave the calendar reserved.

create or replace function public.staff_can_decide_reservations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff()
    and (
      public.current_role() = 'main_admin'
      or public.has_permission('reservations')
      or public.has_permission('payments')
    );
$$;

create or replace function public.notify_reservation_guest(
  p_customer_id uuid,
  p_reservation_id uuid,
  p_public_code text,
  p_confirmed boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv uuid;
  v_title text;
  v_body text;
begin
  if p_confirmed then
    v_title := 'Réservation validée';
    v_body := 'Votre réservation ' || p_public_code || ' a été validée par Impérial Home. Les dates sont confirmées.';
  else
    v_title := 'Réservation refusée';
    v_body := 'Votre réservation ' || p_public_code || ' n''a pas été validée. Les dates sont de nouveau disponibles.';
  end if;

  insert into public.notifications (user_id, title, body, link)
  values (
    p_customer_id,
    v_title,
    v_body,
    '/account/reservations/' || p_reservation_id::text
  );

  select id into v_conv
  from public.conversations
  where customer_id = p_customer_id
    and (reservation_id = p_reservation_id or reservation_id is null)
  order by last_message_at desc nulls last, created_at desc
  limit 1;

  if v_conv is null then
    insert into public.conversations (customer_id, reservation_id, status, last_message_at)
    values (p_customer_id, p_reservation_id, 'open', now())
    returning id into v_conv;
  else
    update public.conversations
    set last_message_at = now(),
        reservation_id = coalesce(reservation_id, p_reservation_id)
    where id = v_conv;
  end if;

  insert into public.messages (conversation_id, sender_id, role, body)
  values (v_conv, auth.uid(), 'system', v_body);
exception
  when others then
    raise log 'notify_reservation_guest failed: %', sqlerrm;
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
  -- Expire other holds, never the reservation the admin is deciding on.
  update public.reservations
  set status = 'expired'
  where status in ('pending', 'payment_processing')
    and hold_expires_at is not null
    and hold_expires_at < now()
    and id <> p_reservation_id;

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
    insert into public.payments (reservation_id, amount_xaf, status, idempotency_key)
    values (v_res.id, v_res.total_amount_xaf, 'pending', v_res.id::text)
    returning * into v_pay;
  end if;

  if v_pay.status = 'successful' and p_status = 'successful' then
    if v_res.status <> 'confirmed' then
      update public.reservations
      set status = 'confirmed', hold_expires_at = null
      where id = v_res.id
      returning * into v_res;
      begin
        perform public.notify_reservation_guest(v_res.customer_id, v_res.id, v_res.public_code, true);
      exception
        when others then null;
      end;
    end if;
    return jsonb_build_object('ok', true, 'idempotent', true, 'reservation_id', v_res.id, 'reservation_status', v_res.status);
  end if;

  if p_amount_xaf is not null and p_amount_xaf <> v_pay.amount_xaf then
    raise exception 'Payment amount mismatch' using errcode = '22023';
  end if;

  if p_status = 'successful' then
    if v_res.status not in ('pending', 'payment_processing', 'expired') then
      raise exception 'Reservation cannot be confirmed in its current state' using errcode = 'P0001';
    end if;
    if v_res.status = 'expired' and exists (
      select 1 from public.reservations r
      where r.property_id = v_res.property_id
        and r.id <> v_res.id
        and r.status in ('pending', 'payment_processing', 'confirmed')
        and daterange(r.check_in, r.check_out, '[)') && daterange(v_res.check_in, v_res.check_out, '[)')
    ) then
      raise exception 'Dates are no longer available' using errcode = 'P0001';
    end if;
    v_new_res := 'confirmed';
  elsif p_status in ('failed', 'cancelled', 'refunded') then
    v_new_res := 'cancelled';
  elsif p_status = 'processing' then
    v_new_res := 'payment_processing';
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
  set status = v_new_res,
      hold_expires_at = case when v_new_res = 'confirmed' then null else hold_expires_at end
  where id = v_res.id
  returning * into v_res;

  begin
    if p_status = 'successful' then
      perform public.notify_reservation_guest(v_res.customer_id, v_res.id, v_res.public_code, true);
    elsif p_status in ('failed', 'cancelled') then
      perform public.notify_reservation_guest(v_res.customer_id, v_res.id, v_res.public_code, false);
    end if;
  exception
    when others then null;
  end;

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
  if not public.staff_can_decide_reservations() then
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
  if not public.staff_can_decide_reservations() then
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

grant execute on function public.staff_can_decide_reservations() to authenticated;
grant execute on function public.confirm_payment(uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
revoke all on function public.notify_reservation_guest(uuid, uuid, text, boolean) from public, anon, authenticated;

do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.notifications';
  exception
    when duplicate_object then null;
  end;
  begin
    execute 'alter publication supabase_realtime add table public.messages';
  exception
    when duplicate_object then null;
  end;
end
$$;
