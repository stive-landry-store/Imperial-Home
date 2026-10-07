alter table public.profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.system_config enable row level security;
alter table public.amenities enable row level security;
alter table public.properties enable row level security;
alter table public.property_welcome_secrets enable row level security;
alter table public.property_images enable row level security;
alter table public.property_amenities enable row level security;
alter table public.property_blocks enable row level security;
alter table public.promotions enable row level security;
alter table public.promotion_properties enable row level security;
alter table public.reservations enable row level security;
alter table public.payments enable row level security;
alter table public.documents enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_role());
create policy profiles_update_admins on public.profiles
  for update using (public.has_permission('administrators') or public.has_permission('customers'));

-- Admin
create policy admin_profiles_select on public.admin_profiles
  for select using (id = auth.uid() or public.is_staff());
create policy admin_profiles_all on public.admin_profiles
  for all using (public.has_permission('administrators'))
  with check (public.has_permission('administrators'));
create policy admin_permissions_select on public.admin_permissions
  for select using (admin_id = auth.uid() or public.is_staff());
create policy admin_permissions_all on public.admin_permissions
  for all using (public.has_permission('administrators'))
  with check (public.has_permission('administrators'));

-- Public catalogue
create policy config_public_read on public.system_config
  for select using (
    key in (
      'phone', 'whatsapp', 'email', 'payment_instructions_en',
      'payment_instructions_fr', 'hold_minutes', 'brand_name', 'city'
    )
    or public.is_staff()
  );
create policy config_admin_write on public.system_config
  for all using (public.current_role() = 'main_admin')
  with check (public.current_role() = 'main_admin');

create policy amenities_read on public.amenities for select using (true);
create policy amenities_write on public.amenities
  for all using (public.has_permission('properties'))
  with check (public.has_permission('properties'));

create policy properties_public_read on public.properties
  for select using (status = 'published' or public.has_permission('properties'));
create policy properties_write on public.properties
  for all using (public.has_permission('properties'))
  with check (public.has_permission('properties'));

create policy images_read on public.property_images
  for select using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and (p.status = 'published' or public.has_permission('properties'))
    )
  );
create policy images_write on public.property_images
  for all using (public.has_permission('properties'))
  with check (public.has_permission('properties'));

create policy property_amenities_read on public.property_amenities for select using (true);
create policy property_amenities_write on public.property_amenities
  for all using (public.has_permission('properties'))
  with check (public.has_permission('properties'));

create policy blocks_read on public.property_blocks
  for select using (true);
create policy blocks_write on public.property_blocks
  for all using (public.has_permission('properties') or public.has_permission('reservations'))
  with check (public.has_permission('properties') or public.has_permission('reservations'));

create policy promotions_read on public.promotions
  for select using (
    (is_active and current_date between starts_at and ends_at)
    or public.has_permission('promotions')
  );
create policy promotions_write on public.promotions
  for all using (public.has_permission('promotions'))
  with check (public.has_permission('promotions'));
create policy promotion_properties_read on public.promotion_properties for select using (true);
create policy promotion_properties_write on public.promotion_properties
  for all using (public.has_permission('promotions'))
  with check (public.has_permission('promotions'));

-- Secrets: confirmed guests + staff
create policy welcome_secrets_read on public.property_welcome_secrets
  for select using (
    public.has_permission('properties')
    or public.has_permission('documents')
    or exists (
      select 1 from public.reservations r
      where r.property_id = property_welcome_secrets.property_id
        and r.customer_id = auth.uid()
        and r.status in ('confirmed', 'completed')
    )
  );
create policy welcome_secrets_write on public.property_welcome_secrets
  for all using (public.has_permission('properties'))
  with check (public.has_permission('properties'));

-- Reservations & payments
create policy reservations_select on public.reservations
  for select using (customer_id = auth.uid() or public.has_permission('reservations'));
create policy reservations_update_staff on public.reservations
  for update using (public.has_permission('reservations'));

create policy payments_select on public.payments
  for select using (
    public.has_permission('payments')
    or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
    )
  );

create policy documents_select on public.documents
  for select using (
    public.has_permission('documents')
    or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.customer_id = auth.uid()
        and r.status in ('confirmed', 'completed')
    )
  );
create policy documents_write on public.documents
  for all using (public.has_permission('documents') or public.has_permission('payments'))
  with check (public.has_permission('documents') or public.has_permission('payments'));

-- Chat
create policy conversations_select on public.conversations
  for select using (customer_id = auth.uid() or public.has_permission('chat'));
create policy conversations_insert on public.conversations
  for insert with check (customer_id = auth.uid());
create policy conversations_update on public.conversations
  for update using (customer_id = auth.uid() or public.has_permission('chat'));

create policy messages_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or public.has_permission('chat'))
    )
  );
create policy messages_insert on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          (c.customer_id = auth.uid() and role = 'customer')
          or (public.has_permission('chat') and role in ('admin', 'system'))
        )
    )
  );

create policy attachments_select on public.message_attachments
  for select using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id
        and (c.customer_id = auth.uid() or public.has_permission('chat'))
    )
  );
create policy attachments_insert on public.message_attachments
  for insert with check (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id
        and (c.customer_id = auth.uid() or public.has_permission('chat'))
    )
  );

create policy audit_select on public.audit_logs
  for select using (public.current_role() = 'main_admin' or public.has_permission('administrators'));

create policy notifications_select on public.notifications
  for select using (user_id = auth.uid() or public.is_staff());
create policy notifications_update on public.notifications
  for update using (user_id = auth.uid());

-- Storage
insert into storage.buckets (id, name, public)
values
  ('property-images', 'property-images', true),
  ('chat-attachments', 'chat-attachments', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

create policy storage_property_images_read on storage.objects
  for select using (bucket_id = 'property-images');
create policy storage_property_images_write on storage.objects
  for all using (bucket_id = 'property-images' and public.has_permission('properties'))
  with check (bucket_id = 'property-images' and public.has_permission('properties'));

create policy storage_chat_read on storage.objects
  for select using (
    bucket_id = 'chat-attachments'
    and (
      public.has_permission('chat')
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
create policy storage_chat_write on storage.objects
  for insert with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_docs_read on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.has_permission('documents')
      or public.has_permission('payments')
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
create policy storage_docs_write on storage.objects
  for all using (
    bucket_id = 'documents'
    and (public.has_permission('documents') or public.has_permission('payments'))
  )
  with check (
    bucket_id = 'documents'
    and (public.has_permission('documents') or public.has_permission('payments'))
  );
