-- Políticas mínimas para pruebas UCAPREC.
-- Ejecutar en Supabase SQL Editor solo durante etapa de pruebas controladas.
-- Para producción final, reemplazar por Supabase Auth y políticas por rol institucional.

alter table if exists public.expedientes enable row level security;
alter table if exists public.imputados enable row level security;
alter table if exists public.victimas enable row level security;
alter table if exists public.medidas_alertas_expediente enable row level security;
alter table if exists public.documentos enable row level security;
alter table if exists public.usuarios enable row level security;
alter table if exists public.auditoria enable row level security;

drop policy if exists "ucaprec_read_expedientes" on public.expedientes;
create policy "ucaprec_read_expedientes" on public.expedientes for select to anon, authenticated using (true);

drop policy if exists "ucaprec_insert_expedientes" on public.expedientes;
create policy "ucaprec_insert_expedientes" on public.expedientes for insert to anon, authenticated with check (true);

drop policy if exists "ucaprec_read_imputados" on public.imputados;
create policy "ucaprec_read_imputados" on public.imputados for select to anon, authenticated using (true);

drop policy if exists "ucaprec_read_victimas" on public.victimas;
create policy "ucaprec_read_victimas" on public.victimas for select to anon, authenticated using (true);

drop policy if exists "ucaprec_read_medidas" on public.medidas_alertas_expediente;
create policy "ucaprec_read_medidas" on public.medidas_alertas_expediente for select to anon, authenticated using (true);

drop policy if exists "ucaprec_read_documentos" on public.documentos;
create policy "ucaprec_read_documentos" on public.documentos for select to anon, authenticated using (true);

drop policy if exists "ucaprec_read_usuarios" on public.usuarios;
create policy "ucaprec_read_usuarios" on public.usuarios for select to anon, authenticated using (true);

drop policy if exists "ucaprec_read_auditoria" on public.auditoria;
create policy "ucaprec_read_auditoria" on public.auditoria for select to anon, authenticated using (true);
