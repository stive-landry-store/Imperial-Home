-- Activity journal: who connected, when, and what they did. Readable by the super admin only.

create table if not exists public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  kind text not null,
  entity text,
  op text,
  entity_id text,
  path text,
  details jsonb not null default '{}'::jsonb,
  device text,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_user_idx on public.activity_log (user_id, created_at desc);
create index if not exists activity_log_kind_idx on public.activity_log (kind, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists activity_log_super_select on public.activity_log;
create policy activity_log_super_select on public.activity_log
  for select using (public.actor_role() = 'super_admin');

revoke all on public.activity_log from public, anon, authenticated;
grant select on public.activity_log to authenticated;

-- Connections and page views sent by the app.
create or replace function public.log_activity(
  p_kind text,
  p_path text default null,
  p_details jsonb default '{}'::jsonb,
  p_session text default null,
  p_device text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_email text;
  v_role text;
begin
  if v_uid is null then
    return;
  end if;
  if p_kind not in ('login', 'logout', 'open', 'page') then
    return;
  end if;
  select full_name, email, role::text into v_name, v_email, v_role from public.profiles where id = v_uid;
  insert into public.activity_log (user_id, user_name, user_email, user_role, kind, path, details, device, session_id)
  values (
    v_uid, v_name, v_email, v_role, p_kind,
    left(p_path, 300),
    coalesce(p_details, '{}'::jsonb),
    left(p_device, 200),
    left(p_session, 80)
  );
end;
$$;

revoke all on function public.log_activity(text, text, jsonb, text, text) from public, anon;
grant execute on function public.log_activity(text, text, jsonb, text, text) to authenticated;

-- Actions on the data (reservations, properties, payments...) are written by the database itself.
create or replace function public.log_row_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
  v_old jsonb;
  v_changed text[];
  v_det jsonb := '{}'::jsonb;
  v_name text;
  v_email text;
  v_role text;
begin
  if v_uid is null then
    return null;
  end if;
  begin
    if tg_op = 'DELETE' then
      v_row := to_jsonb(old);
    else
      v_row := to_jsonb(new);
    end if;

    if tg_op = 'UPDATE' then
      v_old := to_jsonb(old);
      select coalesce(array_agg(e.key order by e.key), '{}'::text[])
        into v_changed
      from jsonb_each(v_row) e
      where e.value is distinct from (v_old -> e.key)
        and e.key not in ('updated_at');
      if coalesce(array_length(v_changed, 1), 0) = 0 then
        return null;
      end if;
      v_det := jsonb_build_object('changed', to_jsonb(v_changed));
      if 'status' = any (v_changed) then
        v_det := v_det || jsonb_build_object('status_from', v_old -> 'status', 'status_to', v_row -> 'status');
      end if;
      if tg_table_name = 'profiles' and 'role' = any (v_changed) then
        v_det := v_det || jsonb_build_object('role_from', v_old -> 'role', 'role_to', v_row -> 'role');
      end if;
    elsif v_row ? 'status' then
      v_det := jsonb_build_object('status', v_row -> 'status');
    end if;

    select full_name, email, role::text into v_name, v_email, v_role from public.profiles where id = v_uid;

    insert into public.activity_log (user_id, user_name, user_email, user_role, kind, entity, op, entity_id, details)
    values (
      v_uid, v_name, v_email, v_role, 'action', tg_table_name, lower(tg_op),
      coalesce(v_row ->> 'id', v_row ->> 'key'),
      v_det
    );
  exception when others then
    null;
  end;
  return null;
end;
$$;

revoke all on function public.log_row_activity() from public, anon, authenticated;

do $$
declare
  t text;
  v_ops text;
begin
  foreach t in array array[
    'reservations', 'properties', 'payments', 'documents', 'promotions', 'reviews',
    'messages', 'admin_profiles', 'admin_permissions', 'profiles', 'vehicles',
    'vehicle_rentals', 'turnover_tasks', 'housing_sheets', 'system_config'
  ]
  loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    v_ops := case t
      when 'messages' then 'insert'
      when 'profiles' then 'insert or update'
      else 'insert or update or delete'
    end;
    execute format('drop trigger if exists activity_log_%I on public.%I', t, t);
    execute format(
      'create trigger activity_log_%I after %s on public.%I for each row execute function public.log_row_activity()',
      t, v_ops, t
    );
  end loop;
end;
$$;

-- One line per person: last connection, last seen, counters. Super admin only.
create or replace function public.activity_users()
returns table (
  user_id uuid,
  user_name text,
  user_email text,
  user_role text,
  last_login timestamptz,
  last_seen timestamptz,
  logins bigint,
  events bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.actor_role() is distinct from 'super_admin' then
    raise exception 'Reserved for the super administrator' using errcode = '42501';
  end if;
  return query
  select
    l.user_id,
    (array_agg(l.user_name order by l.created_at desc))[1],
    (array_agg(l.user_email order by l.created_at desc))[1],
    (array_agg(l.user_role order by l.created_at desc))[1],
    max(l.created_at) filter (where l.kind in ('login', 'open')),
    max(l.created_at),
    count(*) filter (where l.kind in ('login', 'open')),
    count(*)
  from public.activity_log l
  where l.user_id is not null
  group by l.user_id
  order by max(l.created_at) desc;
end;
$$;

revoke all on function public.activity_users() from public, anon;
grant execute on function public.activity_users() to authenticated;

notify pgrst, 'reload schema';
