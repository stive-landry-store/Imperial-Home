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
