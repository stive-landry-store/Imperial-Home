-- Homepage hero background image (editable in admin settings)

drop policy if exists config_public_read on public.system_config;
create policy config_public_read on public.system_config
  for select using (
    key in (
      'phone', 'whatsapp', 'email', 'payment_instructions_en',
      'payment_instructions_fr', 'hold_minutes', 'brand_name', 'city',
      'home_fiche_image_url', 'home_hero_image_url'
    )
    or public.is_staff()
  );

drop policy if exists config_staff_insert on public.system_config;
create policy config_staff_insert on public.system_config
  for insert with check (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url', 'home_hero_image_url'
    )
  );

drop policy if exists config_staff_update on public.system_config;
create policy config_staff_update on public.system_config
  for update using (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url', 'home_hero_image_url'
    )
  )
  with check (
    public.is_staff()
    and key in (
      'phone', 'whatsapp', 'email',
      'payment_instructions_en', 'payment_instructions_fr',
      'home_fiche_image_url', 'home_hero_image_url'
    )
  );
