-- The brand is written "Imperial Home" (no accent). Fix texts already stored in the database.

do $$
declare
  r record;
begin
  for r in
    select c.table_name, c.column_name, c.data_type
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.is_generated = 'NEVER'
      and c.data_type in ('text', 'character varying', 'jsonb')
  loop
    if r.data_type = 'jsonb' then
      execute format(
        'update public.%I set %I = replace(replace(replace(%I::text, %L, %L), %L, %L), %L, %L)::jsonb where %I::text like %L or %I::text like %L or %I::text like %L',
        r.table_name, r.column_name, r.column_name,
        'Impérial', 'Imperial', 'IMPÉRIAL', 'IMPERIAL', 'impérial', 'imperial',
        r.column_name, '%Impérial%', r.column_name, '%IMPÉRIAL%', r.column_name, '%impérial%'
      );
    else
      execute format(
        'update public.%I set %I = replace(replace(replace(%I, %L, %L), %L, %L), %L, %L) where %I like %L or %I like %L or %I like %L',
        r.table_name, r.column_name, r.column_name,
        'Impérial', 'Imperial', 'IMPÉRIAL', 'IMPERIAL', 'impérial', 'imperial',
        r.column_name, '%Impérial%', r.column_name, '%IMPÉRIAL%', r.column_name, '%impérial%'
      );
    end if;
  end loop;

  for r in
    select pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        pg_get_functiondef(p.oid) like '%Impérial%'
        or pg_get_functiondef(p.oid) like '%IMPÉRIAL%'
        or pg_get_functiondef(p.oid) like '%impérial%'
      )
  loop
    execute replace(replace(replace(r.def, 'Impérial', 'Imperial'), 'IMPÉRIAL', 'IMPERIAL'), 'impérial', 'imperial');
  end loop;
end;
$$;
