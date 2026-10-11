-- Titles shown on profiles follow the role: "Super administrateur" and "Main admin".
update public.admin_profiles a
set title = case p.role when 'super_admin' then 'Super administrateur' else 'Main admin' end
from public.profiles p
where p.id = a.id and p.role in ('super_admin', 'main_admin');

do $$
declare
  v_def text;
  v_sig regprocedure;
begin
  foreach v_sig in array array[
    'public.grant_bootstrap_admin(uuid)'::regprocedure,
    'public.promote_user_to_main_admin(text,text)'::regprocedure
  ]
  loop
    v_def := pg_get_functiondef(v_sig);
    v_def := replace(v_def, 'Super Administrateur', 'Super administrateur');
    v_def := replace(v_def, 'Administrateur principal', 'Main admin');
    execute v_def;
  end loop;
end;
$$;

revoke all on function public.grant_bootstrap_admin(uuid) from public, anon, authenticated;
grant execute on function public.promote_user_to_main_admin(text, text) to authenticated;

notify pgrst, 'reload schema';
