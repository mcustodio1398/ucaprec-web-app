-- UCAPREC - Endurecimiento de seguridad para produccion
-- IMPORTANTE:
-- Ejecutar este script solo despues de migrar el login a Supabase Auth.
-- El login temporal del frontend no crea una sesion authenticated real; si ejecutas
-- este script antes de migrar Auth, la app dejara de leer/escribir datos.

begin;

-- 1) Revocar acceso anonimo directo a datos operativos.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on schema public from anon;

-- 2) Permitir uso del schema solo a usuarios autenticados.
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 3) Grants explicitos por tabla.
grant select, insert, update, delete on public.expedientes to authenticated;
grant select, insert, update, delete on public.imputados to authenticated;
grant select, insert, update, delete on public.victimas to authenticated;
grant select, insert, update, delete on public.medidas_alertas_expediente to authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
grant select on public.roles to authenticated;
grant select on public.usuarios to authenticated;
grant select on public.auditoria to authenticated;
grant select on public.notificaciones to authenticated;
grant select on public.configuracion_sistema to authenticated;

-- 4) Helpers de rol basados en Supabase Auth app_metadata.role.
-- En Supabase Auth, configurar app_metadata.role con:
-- Administrador, Supervisor o Analista.
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

-- 5) Reemplazar politicas abiertas en tablas operativas.
drop policy if exists ucaprec_insert_expedientes on public.expedientes;
drop policy if exists ucaprec_update_expedientes on public.expedientes;
drop policy if exists ucaprec_delete_expedientes on public.expedientes;
drop policy if exists ucaprec_read_expedientes on public.expedientes;

create policy ucaprec_read_expedientes on public.expedientes
for select to authenticated
using (public.ucaprec_can_operate());

create policy ucaprec_insert_expedientes on public.expedientes
for insert to authenticated
with check (public.ucaprec_can_operate());

create policy ucaprec_update_expedientes on public.expedientes
for update to authenticated
using (public.ucaprec_can_operate())
with check (public.ucaprec_can_operate());

create policy ucaprec_delete_expedientes on public.expedientes
for delete to authenticated
using (public.ucaprec_can_delete());

drop policy if exists ucaprec_insert_imputados on public.imputados;
drop policy if exists ucaprec_update_imputados on public.imputados;
drop policy if exists ucaprec_delete_imputados on public.imputados;
drop policy if exists ucaprec_read_imputados on public.imputados;

create policy ucaprec_read_imputados on public.imputados
for select to authenticated
using (public.ucaprec_can_operate());

create policy ucaprec_insert_imputados on public.imputados
for insert to authenticated
with check (public.ucaprec_can_operate());

create policy ucaprec_update_imputados on public.imputados
for update to authenticated
using (public.ucaprec_can_operate())
with check (public.ucaprec_can_operate());

create policy ucaprec_delete_imputados on public.imputados
for delete to authenticated
using (public.ucaprec_can_delete());

drop policy if exists ucaprec_insert_victimas on public.victimas;
drop policy if exists ucaprec_update_victimas on public.victimas;
drop policy if exists ucaprec_delete_victimas on public.victimas;
drop policy if exists ucaprec_read_victimas on public.victimas;

create policy ucaprec_read_victimas on public.victimas
for select to authenticated
using (public.ucaprec_can_operate());

create policy ucaprec_insert_victimas on public.victimas
for insert to authenticated
with check (public.ucaprec_can_operate());

create policy ucaprec_update_victimas on public.victimas
for update to authenticated
using (public.ucaprec_can_operate())
with check (public.ucaprec_can_operate());

create policy ucaprec_delete_victimas on public.victimas
for delete to authenticated
using (public.ucaprec_can_delete());

drop policy if exists ucaprec_insert_medidas on public.medidas_alertas_expediente;
drop policy if exists ucaprec_update_medidas on public.medidas_alertas_expediente;
drop policy if exists ucaprec_delete_medidas on public.medidas_alertas_expediente;
drop policy if exists ucaprec_read_medidas_alertas_expediente on public.medidas_alertas_expediente;

create policy ucaprec_read_medidas_alertas_expediente on public.medidas_alertas_expediente
for select to authenticated
using (public.ucaprec_can_operate());

create policy ucaprec_insert_medidas on public.medidas_alertas_expediente
for insert to authenticated
with check (public.ucaprec_can_operate());

create policy ucaprec_update_medidas on public.medidas_alertas_expediente
for update to authenticated
using (public.ucaprec_can_operate())
with check (public.ucaprec_can_operate());

create policy ucaprec_delete_medidas on public.medidas_alertas_expediente
for delete to authenticated
using (public.ucaprec_can_delete());

drop policy if exists ucaprec_insert_documentos on public.documentos;
drop policy if exists ucaprec_update_documentos on public.documentos;
drop policy if exists ucaprec_delete_documentos on public.documentos;
drop policy if exists ucaprec_read_documentos on public.documentos;

create policy ucaprec_read_documentos on public.documentos
for select to authenticated
using (public.ucaprec_can_operate());

create policy ucaprec_insert_documentos on public.documentos
for insert to authenticated
with check (public.ucaprec_can_operate());

create policy ucaprec_update_documentos on public.documentos
for update to authenticated
using (public.ucaprec_can_operate())
with check (public.ucaprec_can_operate());

create policy ucaprec_delete_documentos on public.documentos
for delete to authenticated
using (public.ucaprec_can_delete());

-- 6) Administracion: solo Administrador.
drop policy if exists ucaprec_read_usuarios on public.usuarios;
create policy ucaprec_read_usuarios on public.usuarios
for select to authenticated
using (public.ucaprec_is_admin());

drop policy if exists ucaprec_read_roles on public.roles;
create policy ucaprec_read_roles on public.roles
for select to authenticated
using (public.ucaprec_is_admin());

drop policy if exists ucaprec_read_auditoria on public.auditoria;
create policy ucaprec_read_auditoria on public.auditoria
for select to authenticated
using (public.ucaprec_is_admin());

-- 7) Storage privado: solo usuarios autenticados operativos.
drop policy if exists ucaprec_storage_read_documentos on storage.objects;
create policy ucaprec_storage_read_documentos on storage.objects
for select to authenticated
using (bucket_id = 'documentos' and public.ucaprec_can_operate());

drop policy if exists ucaprec_storage_insert_documentos on storage.objects;
create policy ucaprec_storage_insert_documentos on storage.objects
for insert to authenticated
with check (bucket_id = 'documentos' and public.ucaprec_can_operate());

drop policy if exists ucaprec_storage_delete_documentos on storage.objects;
create policy ucaprec_storage_delete_documentos on storage.objects
for delete to authenticated
using (bucket_id = 'documentos' and public.ucaprec_can_delete());

commit;
