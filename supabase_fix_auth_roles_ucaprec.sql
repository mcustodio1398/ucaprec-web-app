-- UCAPREC - Correccion de roles Auth + sincronizacion de usuarios visibles
-- Ejecutar si el login funciona, pero el modulo Usuarios/Roles solo muestra el usuario local.

begin;

-- 1) Asegurar app_metadata en Supabase Auth.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'Administrador',
  'username', 'michael.custodio',
  'name', 'Michael Custodio',
  'initials', 'MC'
)
where lower(email) = 'michael.custodio@pgr.gob.do';

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'role', 'Analista',
  'username', 'analista.ucaprec',
  'name', 'Analista UCAPREC',
  'initials', 'AU'
)
where lower(email) = 'analista.ucaprec@pgr.gob.do';

-- 2) Hacer los helpers RLS tolerantes al correo institucional del administrador.
create or replace function public.ucaprec_user_role()
returns text
language sql
stable
as $$
  select case
    when lower(coalesce(auth.jwt() ->> 'email', '')) = 'michael.custodio@pgr.gob.do'
      then 'Administrador'
    else coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '')
  end;
$$;

create or replace function public.ucaprec_is_admin()
returns boolean
language sql
stable
as $$
  select public.ucaprec_user_role() = 'Administrador';
$$;

create or replace function public.ucaprec_can_operate()
returns boolean
language sql
stable
as $$
  select public.ucaprec_user_role() in ('Administrador', 'Supervisor', 'Analista');
$$;

create or replace function public.ucaprec_can_delete()
returns boolean
language sql
stable
as $$
  select public.ucaprec_user_role() = 'Administrador';
$$;

-- 3) Sincronizar la tabla que usa el modulo Usuarios/Roles.
insert into public.usuarios (nombre_completo, usuario, email, rol, estatus)
values
  ('Michael Custodio', 'michael.custodio', 'michael.custodio@pgr.gob.do', 'Administrador', 'Activo'),
  ('Analista UCAPREC', 'analista.ucaprec', 'analista.ucaprec@pgr.gob.do', 'Analista', 'Activo')
on conflict (usuario) do update set
  nombre_completo = excluded.nombre_completo,
  email = excluded.email,
  rol = excluded.rol,
  estatus = excluded.estatus,
  updated_at = now();

commit;
