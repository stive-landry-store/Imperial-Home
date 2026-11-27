-- Imperial Home — maximum security pass (applied after 20261120100000_security_hardening).
-- Conçu par stive landry store (NYAMI TCHOUPE STIVE LANDRY).
--
-- 1. Payment confirmation by webhook is server-only: nobody can mark a stay paid from the browser.
-- 2. Visitors who are not signed in can no longer call staff, account or maintenance functions.
-- 3. Audit log entries can only be written by the database itself.
-- 4. Uploads: size limits and an explicit list of safe file types per bucket (no SVG, no HTML).

-- ---------------------------------------------------------------- 1. payments (service role only)

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'apply_payment_event'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- 2. no anonymous access to private functions

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        -- staff & admin
        'promote_user_to_admin', 'promote_user_to_main_admin', 'deactivate_admin', 'reactivate_admin',
        'confirm_payment', 'reject_payment', 'schedule_cleaning', 'set_vehicle_rental_status',
        -- signed-in customers only
        'add_vehicle_rental', 'cancel_reservation', 'submit_payment_receipt', 'guest_wifi',
        'register_push', 'unregister_push', 'push_ping', 'pending_pushes', 'release_push',
        'my_referral_code', 'my_referral_count', 'claim_referral',
        -- maintenance jobs
        'dispatch_stay_reminders', 'expire_holds',
        -- push delivery secrets
        'init_push_keys', 'claim_push', 'drop_push_endpoint'
      )
  loop
    -- Keep signed-in users and the server working even where access came only through PUBLIC.
    execute format('grant execute on function %s to authenticated, service_role', f);
    execute format('revoke execute on function %s from public, anon', f);
  end loop;
end $$;

-- Push delivery secrets stay with the server only (repeated here in case the earlier pass was skipped).
do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('init_push_keys', 'claim_push', 'drop_push_endpoint', 'release_push')
  loop
    execute format('revoke execute on function %s from authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- 3. audit log written by the database only

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'write_audit'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ---------------------------------------------------------------- 4. uploads: size and type limits

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif']
where id in ('profile-media', 'review-photos', 'chat-attachments');

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
where id = 'payment-receipts';

update storage.buckets
set file_size_limit = 20971520,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'documents';

update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/avif',
      'video/mp4', 'video/quicktime', 'video/webm'
    ]
where id = 'property-images';

notify pgrst, 'reload schema';
