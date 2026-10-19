-- Every administrator can open a scanned reservation and see if it is paid.
-- Editing a reservation still requires the reservations permission.

drop policy if exists reservations_select_staff on public.reservations;
create policy reservations_select_staff on public.reservations
  for select using (public.is_staff());

drop policy if exists payments_select_staff on public.payments;
create policy payments_select_staff on public.payments
  for select using (public.is_staff());
