-- The four default "add to the stay" options are turned off. Admins add or remove options from settings.
-- Every active administrator (not only the main admin) can manage them.

update public.stay_services
set is_active = false
where slug in ('airport', 'late-checkout', 'mid-clean', 'baby-bed');

drop policy if exists stay_services_write on public.stay_services;
create policy stay_services_write on public.stay_services for all
  using (public.is_staff())
  with check (public.is_staff());
