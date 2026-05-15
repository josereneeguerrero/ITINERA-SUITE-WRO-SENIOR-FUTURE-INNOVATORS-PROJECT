-- Dev / SQL Editor: promueve al perfil del usuario más reciente en auth.users.
-- Cuidado si tenés varias cuentas: solo el último signup será admin.
-- Alternativa: update public.profiles set role = 'admin' where id = '<uuid>';

update public.profiles p
set role = 'admin'
where p.id = (
  select u.id from auth.users u
  order by u.created_at desc
  limit 1
)
returning p.id, p.display_name, p.role;
