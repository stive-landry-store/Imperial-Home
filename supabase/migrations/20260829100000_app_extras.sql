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
