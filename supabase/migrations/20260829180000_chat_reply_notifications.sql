-- The customer gets a notification for every reply from an administrator (one unread notification per customer, updated each time).
create or replace function public.on_admin_reply_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_name text;
  v_preview text;
begin
  if new.role <> 'admin' then
    return new;
  end if;
  select customer_id into v_customer from public.conversations where id = new.conversation_id;
  if v_customer is null then
    return new;
  end if;
  select coalesce(nullif(trim(full_name), ''), 'Imperial Home') into v_name from public.profiles where id = new.sender_id;
  v_preview := left(coalesce(nullif(trim(new.body), ''), 'Photo'), 140);

  delete from public.notifications
  where user_id = v_customer and read_at is null and link = '/account/chat' and title = 'Nouveau message';

  insert into public.notifications (user_id, title, body, link)
  values (v_customer, 'Nouveau message', coalesce(v_name, 'Imperial Home') || ' : ' || v_preview, '/account/chat');
  return new;
end;
$$;

revoke all on function public.on_admin_reply_notify() from public, anon, authenticated;

drop trigger if exists messages_notify_customer on public.messages;
create trigger messages_notify_customer
  after insert on public.messages
  for each row
  execute function public.on_admin_reply_notify();

notify pgrst, 'reload schema';
