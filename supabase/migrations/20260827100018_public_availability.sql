-- Guests cannot read other people's reservations under RLS, so the public
-- calendar and quote must use definer functions that return only dates.

create or replace function public.check_availability(
  p_property_id uuid,
  p_check_in date,
  p_check_out date
) returns boolean
language sql
stable
security definer
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
security definer
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

notify pgrst, 'reload schema';
