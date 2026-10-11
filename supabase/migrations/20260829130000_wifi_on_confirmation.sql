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
