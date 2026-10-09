-- Certified admins, shared human assistance, and takeover notices.

create or replace function public.promote_user_to_admin(
  p_email text,
  p_title text default 'Administrateur'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if public.current_role() <> 'main_admin' then
    raise exception 'Only the main administrator can appoint admins';
  end if;

  select id into v_user_id
  from public.profiles
  where lower(trim(email)) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No account found for this email. Ask the person to register first.';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id and role = 'main_admin') then
    raise exception 'This user is already the main administrator';
  end if;

  update public.profiles set role = 'admin' where id = v_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (
    v_user_id,
    true,
    true,
    coalesce(nullif(trim(p_title), ''), 'Administrateur'),
    auth.uid()
  )
  on conflict (id) do update
    set is_active = true,
        is_verified = true,
        title = coalesce(nullif(trim(p_title), ''), admin_profiles.title);

  insert into public.admin_permissions (admin_id, permission)
  select v_user_id, perm
  from unnest(array[
    'properties', 'reservations', 'customers', 'promotions',
    'payments', 'documents', 'chat', 'administrators'
  ]) as perm
  on conflict do nothing;

  return v_user_id;
end;
$$;

create or replace function public.reactivate_admin(
  p_user_id uuid,
  p_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'main_admin' then
    raise exception 'Only the main administrator can reactivate admins';
  end if;

  update public.profiles set role = 'admin' where id = p_user_id;

  insert into public.admin_profiles (id, is_verified, is_active, title, created_by)
  values (
    p_user_id,
    true,
    true,
    coalesce(nullif(trim(p_title), ''), 'Administrateur'),
    auth.uid()
  )
  on conflict (id) do update
    set is_active = true,
        is_verified = true,
        title = coalesce(nullif(trim(p_title), ''), admin_profiles.title);

  insert into public.admin_permissions (admin_id, permission)
  select p_user_id, perm
  from unnest(array[
    'properties', 'reservations', 'customers', 'promotions',
    'payments', 'documents', 'chat', 'administrators'
  ]) as perm
  on conflict do nothing;
end;
$$;

update public.admin_profiles
set is_verified = true
where is_active = true;

insert into public.admin_profiles (id, is_verified, is_active, title)
select p.id, true, true, 'Administrateur'
from public.profiles p
where p.role in ('admin', 'main_admin')
on conflict (id) do update
  set is_verified = true,
      is_active = true;

insert into public.admin_permissions (admin_id, permission)
select a.id, 'chat'
from public.admin_profiles a
where a.is_active
on conflict do nothing;

create or replace function public.open_customer_conversation(p_customer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;

  if not exists (select 1 from public.profiles where id = p_customer_id) then
    raise exception 'Customer not found';
  end if;

  select id into v_id
  from public.conversations
  where customer_id = p_customer_id
    and status = 'open'
  order by created_at desc
  limit 1;

  if v_id is null then
    insert into public.conversations (customer_id, status, needs_human)
    values (p_customer_id, 'open', true)
    returning id into v_id;
  else
    update public.conversations
    set needs_human = true
    where id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.conversation_senders(p_conversation_id uuid)
returns table (id uuid, full_name text, is_verified boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,
         coalesce(nullif(trim(p.full_name), ''), p.email, 'Impérial Home'),
         coalesce(a.is_verified, p.role in ('admin', 'main_admin'))
  from public.profiles p
  left join public.admin_profiles a on a.id = p.id
  where (
      public.is_staff()
      or exists (
        select 1
        from public.conversations c
        where c.id = p_conversation_id
          and c.customer_id = auth.uid()
      )
    )
    and p.id in (
      select m.sender_id
      from public.messages m
      where m.conversation_id = p_conversation_id
        and m.sender_id is not null
      union
      select c.assigned_admin_id
      from public.conversations c
      where c.id = p_conversation_id
        and c.assigned_admin_id is not null
    );
$$;

create or replace function public.on_admin_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_prev uuid;
  v_name text;
begin
  if NEW.role <> 'admin' or NEW.sender_id is null then
    update public.conversations
    set last_message_at = now()
    where id = NEW.conversation_id;
    return NEW;
  end if;

  select customer_id, assigned_admin_id
  into v_customer, v_prev
  from public.conversations
  where id = NEW.conversation_id;

  update public.conversations
  set assigned_admin_id = NEW.sender_id,
      needs_human = true,
      last_message_at = now()
  where id = NEW.conversation_id;

  if v_prev is distinct from NEW.sender_id then
    select coalesce(nullif(trim(full_name), ''), email, 'Impérial Home')
    into v_name
    from public.profiles
    where id = NEW.sender_id;

    insert into public.notifications (user_id, title, body, link)
    values (
      v_customer,
      'Nouvelle assistance',
      coalesce(v_name, 'Impérial Home') || ' prend en charge votre demande.',
      '/account/chat'
    );

    insert into public.notifications (user_id, title, body, link)
    select p.id,
           'Assistance attribuée',
           coalesce(v_name, 'Impérial Home') || ' répond maintenant à ce client.',
           '/admin/chat'
    from public.profiles p
    where p.role in ('admin', 'main_admin')
      and p.id <> NEW.sender_id;

    insert into public.messages (conversation_id, sender_id, role, body)
    values (
      NEW.conversation_id,
      null,
      'system',
      '[[assigned]]' || coalesce(v_name, 'Impérial Home')
    );
  end if;

  return NEW;
end;
$$;

drop trigger if exists messages_assign_assistant on public.messages;
create trigger messages_assign_assistant
  after insert on public.messages
  for each row
  execute function public.on_admin_message();

create or replace function public.on_human_requested()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if NEW.needs_human
     and NEW.assigned_admin_id is null
     and (TG_OP = 'INSERT' or not coalesce(OLD.needs_human, false)) then
    select coalesce(nullif(trim(full_name), ''), email, 'Client')
    into v_name
    from public.profiles
    where id = NEW.customer_id;

    insert into public.notifications (user_id, title, body, link)
    select p.id,
           'Assistance demandée',
           coalesce(v_name, 'Client') || ' souhaite parler à un administrateur.',
           '/admin/chat'
    from public.profiles p
    where p.role in ('admin', 'main_admin');
  end if;
  return NEW;
end;
$$;

drop trigger if exists conversations_human_requested on public.conversations;
create trigger conversations_human_requested
  after insert or update of needs_human on public.conversations
  for each row
  execute function public.on_human_requested();

revoke all on function public.open_customer_conversation(uuid) from public, anon;
revoke all on function public.conversation_senders(uuid) from public, anon;
grant execute on function public.open_customer_conversation(uuid) to authenticated;
grant execute on function public.conversation_senders(uuid) to authenticated;

notify pgrst, 'reload schema';
