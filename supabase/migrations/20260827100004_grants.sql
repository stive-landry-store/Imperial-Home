grant usage on schema public to anon, authenticated, service_role;

grant select on
  public.amenities,
  public.properties,
  public.property_images,
  public.property_amenities,
  public.property_blocks,
  public.promotions,
  public.promotion_properties,
  public.system_config
to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select on public.admin_profiles, public.admin_permissions to authenticated;
grant insert, update, delete on public.admin_profiles, public.admin_permissions to authenticated;

grant select, insert, update, delete on
  public.properties,
  public.property_images,
  public.property_amenities,
  public.property_blocks,
  public.property_welcome_secrets,
  public.promotions,
  public.promotion_properties,
  public.amenities
to authenticated;

grant select, insert, update on
  public.reservations,
  public.payments,
  public.documents,
  public.conversations,
  public.messages,
  public.message_attachments,
  public.notifications
to authenticated;

grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;
grant select, insert, update, delete on public.system_config to authenticated;

grant usage, select on all sequences in schema public to authenticated, service_role;
