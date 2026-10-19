-- Only the super administrator can wipe trial client activity.
-- Apartments, cars, prices, photos, promotions, and administrators stay.

create or replace function public.reset_client_statistics()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_table text;
  v_customers integer := 0;
  v_ids uuid[];
begin
  if public.actor_role() is distinct from 'super_admin' then
    raise exception 'Only the super administrator can reset statistics';
  end if;

  foreach v_table in array array[
    'message_attachments',
    'messages',
    'conversations',
    'housing_sheets',
    'reservation_services',
    'documents',
    'payments',
    'reviews',
    'turnover_tasks',
    'vehicle_rentals',
    'waitlist',
    'favorites',
    'notifications',
    'referral_rewards',
    'push_outbox',
    'activity_log',
    'audit_logs',
    'reservations'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I', v_table);
    end if;
  end loop;

  select coalesce(array_agg(p.id), '{}')
  into v_ids
  from public.profiles p
  where p.role = 'customer'
    and p.id is distinct from auth.uid()
    and lower(coalesce(p.email, '')) <> all (public.bootstrap_admin_emails());

  v_customers := coalesce(array_length(v_ids, 1), 0);

  if v_customers > 0 then
    update public.admin_profiles
    set created_by = null
    where created_by = any (v_ids);

    update public.property_blocks
    set created_by = null
    where created_by = any (v_ids);

    if to_regclass('storage.objects') is not null then
      delete from storage.objects
      where owner::text in (select x::text from unnest(v_ids) as x);
    end if;

    delete from auth.users
    where id = any (v_ids);
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, after_data)
  values (
    auth.uid(),
    'reset_client_statistics',
    'site',
    jsonb_build_object('customers_removed', v_customers)
  );

  return jsonb_build_object('ok', true, 'customers_removed', v_customers);
end;
$$;

revoke all on function public.reset_client_statistics() from public;
grant execute on function public.reset_client_statistics() to authenticated;
