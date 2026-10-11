-- A customer message reaches an available administrator or super administrator.
-- First message: the conversation is flagged "needs a human" and every staff member is notified (existing trigger).
-- Next messages: the assigned admin is notified, otherwise the staff members who are online (last 10 minutes), otherwise all staff.

create or replace function public.on_customer_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv public.conversations%rowtype;
  v_name text;
  v_preview text;
  v_online boolean := false;
begin
  if new.role <> 'customer' then
    return new;
  end if;

  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  select coalesce(nullif(trim(full_name), ''), email, 'Client') into v_name from public.profiles where id = v_conv.customer_id;
  v_preview := left(coalesce(nullif(trim(new.body), ''), 'Photo'), 120);

  update public.conversations set last_message_at = now() where id = v_conv.id;

  if v_conv.assigned_admin_id is not null then
    insert into public.notifications (user_id, title, body, link)
    values (v_conv.assigned_admin_id, coalesce(v_name, 'Client'), v_preview, '/admin/chat');
    return new;
  end if;

  if not v_conv.needs_human then
    update public.conversations set needs_human = true where id = v_conv.id;
    return new;
  end if;

  if to_regclass('public.activity_log') is not null then
    select exists (
      select 1 from public.activity_log l
      join public.profiles p on p.id = l.user_id
      where p.role in ('admin', 'main_admin', 'super_admin')
        and l.created_at > now() - interval '10 minutes'
    ) into v_online;
  end if;

  insert into public.notifications (user_id, title, body, link)
  select p.id, coalesce(v_name, 'Client'), v_preview, '/admin/chat'
  from public.profiles p
  left join public.admin_profiles a on a.id = p.id
  where p.role in ('admin', 'main_admin', 'super_admin')
    and coalesce(a.is_active, true)
    and (
      p.role in ('main_admin', 'super_admin')
      or exists (select 1 from public.admin_permissions ap where ap.admin_id = p.id and ap.permission::text = 'chat')
    )
    and (
      not v_online
      or exists (
        select 1 from public.activity_log l
        where l.user_id = p.id and l.created_at > now() - interval '10 minutes'
      )
    );

  return new;
end;
$$;

revoke all on function public.on_customer_message() from public, anon, authenticated;

drop trigger if exists messages_notify_staff on public.messages;
create trigger messages_notify_staff
  after insert on public.messages
  for each row
  execute function public.on_customer_message();

notify pgrst, 'reload schema';
