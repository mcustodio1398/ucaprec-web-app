-- UCAPREC - Permisos personalizados por usuario
-- Ejecutar una sola vez en Supabase SQL Editor.
-- Habilita guardar la matriz editable de permisos desde Usuarios y Roles.

grant select, insert, update on public.configuracion_sistema to authenticated;

drop policy if exists ucaprec_admin_read_configuracion on public.configuracion_sistema;
create policy ucaprec_admin_read_configuracion on public.configuracion_sistema
for select to authenticated
using (true);

drop policy if exists ucaprec_admin_insert_configuracion on public.configuracion_sistema;
create policy ucaprec_admin_insert_configuracion on public.configuracion_sistema
for insert to authenticated
with check (
  exists (
    select 1
    from public.usuarios u
    where lower(u.email) = lower(auth.jwt() ->> 'email')
      and u.rol = 'Administrador'
      and u.estatus = 'Activo'
  )
);

drop policy if exists ucaprec_admin_update_configuracion on public.configuracion_sistema;
create policy ucaprec_admin_update_configuracion on public.configuracion_sistema
for update to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where lower(u.email) = lower(auth.jwt() ->> 'email')
      and u.rol = 'Administrador'
      and u.estatus = 'Activo'
  )
)
with check (
  exists (
    select 1
    from public.usuarios u
    where lower(u.email) = lower(auth.jwt() ->> 'email')
      and u.rol = 'Administrador'
      and u.estatus = 'Activo'
  )
);
