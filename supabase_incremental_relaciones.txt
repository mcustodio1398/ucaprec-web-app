-- UCAPREC - Ajuste incremental posterior al reset inicial
-- Ejecutar si ya corriste supabase_reset_schema_ucaprec.sql antes de este cambio.
-- Permite guardar, editar y eliminar registros operativos desde el frontend.

drop policy if exists ucaprec_insert_expedientes on public.expedientes;
create policy ucaprec_insert_expedientes on public.expedientes
for insert to anon, authenticated
with check (true);

drop policy if exists ucaprec_insert_imputados on public.imputados;
create policy ucaprec_insert_imputados on public.imputados
for insert to anon, authenticated
with check (true);

drop policy if exists ucaprec_insert_victimas on public.victimas;
create policy ucaprec_insert_victimas on public.victimas
for insert to anon, authenticated
with check (true);

drop policy if exists ucaprec_insert_medidas on public.medidas_alertas_expediente;
create policy ucaprec_insert_medidas on public.medidas_alertas_expediente
for insert to anon, authenticated
with check (true);

drop policy if exists ucaprec_insert_documentos on public.documentos;
create policy ucaprec_insert_documentos on public.documentos
for insert to anon, authenticated
with check (true);

drop policy if exists ucaprec_update_expedientes on public.expedientes;
create policy ucaprec_update_expedientes on public.expedientes
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists ucaprec_update_imputados on public.imputados;
create policy ucaprec_update_imputados on public.imputados
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists ucaprec_update_victimas on public.victimas;
create policy ucaprec_update_victimas on public.victimas
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists ucaprec_update_medidas on public.medidas_alertas_expediente;
create policy ucaprec_update_medidas on public.medidas_alertas_expediente
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists ucaprec_update_documentos on public.documentos;
create policy ucaprec_update_documentos on public.documentos
for update to anon, authenticated
using (true)
with check (true);

drop policy if exists ucaprec_delete_expedientes on public.expedientes;
create policy ucaprec_delete_expedientes on public.expedientes
for delete to anon, authenticated
using (true);

drop policy if exists ucaprec_delete_imputados on public.imputados;
create policy ucaprec_delete_imputados on public.imputados
for delete to anon, authenticated
using (true);

drop policy if exists ucaprec_delete_victimas on public.victimas;
create policy ucaprec_delete_victimas on public.victimas
for delete to anon, authenticated
using (true);

drop policy if exists ucaprec_delete_medidas on public.medidas_alertas_expediente;
create policy ucaprec_delete_medidas on public.medidas_alertas_expediente
for delete to anon, authenticated
using (true);

drop policy if exists ucaprec_delete_documentos on public.documentos;
create policy ucaprec_delete_documentos on public.documentos
for delete to anon, authenticated
using (true);

grant insert, update, delete on public.expedientes to anon, authenticated;
grant insert, update, delete on public.imputados to anon, authenticated;
grant insert, update, delete on public.victimas to anon, authenticated;
grant insert, update, delete on public.medidas_alertas_expediente to anon, authenticated;
grant insert, update, delete on public.documentos to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists ucaprec_storage_read_documentos on storage.objects;
create policy ucaprec_storage_read_documentos on storage.objects
for select to anon, authenticated
using (bucket_id = 'documentos');

drop policy if exists ucaprec_storage_insert_documentos on storage.objects;
create policy ucaprec_storage_insert_documentos on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'documentos');

drop policy if exists ucaprec_storage_delete_documentos on storage.objects;
create policy ucaprec_storage_delete_documentos on storage.objects
for delete to anon, authenticated
using (bucket_id = 'documentos');
