create table if not exists public.housing_sheets (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid unique references public.reservations (id) on delete cascade,
  guest_name text not null default '',
  guest_phone text not null default '',
  guest_cni text not null default '',
  arrival_date date,
  arrival_time text,
  departure_date date,
  departure_time text,
  wifi_name text not null default '',
  wifi_password text not null default '',
  guest_sign_name text not null default '',
  guest_signature text,
  reception_sign_name text not null default '',
  reception_signature text,
  receptionist_name text not null default '',
  reception_phone text not null default '674092263',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists cni text;

alter table public.housing_sheets enable row level security;

create policy housing_sheets_select on public.housing_sheets
  for select using (
    public.has_permission('documents')
    or public.has_permission('reservations')
    or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
    )
  );

create policy housing_sheets_write on public.housing_sheets
  for all using (
    public.has_permission('documents')
    or public.has_permission('reservations')
    or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
    )
  )
  with check (
    public.has_permission('documents')
    or public.has_permission('reservations')
    or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
    )
  );

grant select, insert, update on public.housing_sheets to authenticated;
