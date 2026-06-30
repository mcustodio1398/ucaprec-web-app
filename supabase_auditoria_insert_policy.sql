-- UCAPREC - Permitir registro de eventos de auditoria desde la app.
-- Ejecutar en Supabase SQL Editor si el modulo Auditoria no refleja las acciones del sistema.

grant insert on public.auditoria to authenticated;

drop policy if exists ucaprec_insert_auditoria on public.auditoria;
create policy ucaprec_insert_auditoria on public.auditoria
for insert to authenticated
with check (true);
