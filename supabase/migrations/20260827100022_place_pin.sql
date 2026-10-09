-- Guests can read the Imperial Home pin. Only the main admin can move it.

drop policy if exists config_public_read on public.system_config;
create policy config_public_read on public.system_config
  for select using (
    key in (
      'phone', 'whatsapp', 'email', 'payment_instructions_en',
      'payment_instructions_fr', 'hold_minutes', 'brand_name', 'city',
      'home_fiche_image_url', 'home_hero_image_url',
      'place_address', 'place_latitude', 'place_longitude'
    )
    or public.is_staff()
  );

insert into public.system_config (key, value)
values
  ('place_address', to_jsonb('Impérial Home, Carrefour Conquête'::text)),
  ('place_latitude', to_jsonb('4.0689'::text)),
  ('place_longitude', to_jsonb('9.7568'::text))
on conflict (key) do nothing;
