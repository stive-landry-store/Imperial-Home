-- Live updates so bookings and admin edits appear on every client (mobile, Vercel, local).

do $$
declare
  t text;
begin
  foreach t in array array[
    'reservations',
    'properties',
    'property_images',
    'vehicles',
    'vehicle_media',
    'system_config',
    'promotions',
    'property_blocks'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end
$$;
