-- UCAPREC - Reset completo de esquema Supabase
-- Fecha: 2026-06-19
--
-- ADVERTENCIA:
-- Este script elimina tablas/vistas existentes y borra los datos actuales.
-- Ejecutar solo si ya decidiste reconstruir la base desde cero.
--
-- Objetivo:
-- Crear un esquema limpio alineado con el frontend actual:
-- Dashboard, Expedientes, Imputados, Víctimas, Medidas/Alertas,
-- Documentos, Usuarios/Roles, Auditoría, Catálogos y Configuración.

begin;

-- 1) Extensiones
create extension if not exists pgcrypto;

-- 2) Eliminar vistas primero
drop view if exists public.vw_dashboard_kpis;
drop view if exists public.vw_expedientes_requieren_atencion;

-- 3) Eliminar tablas dependientes
drop table if exists public.auditoria cascade;
drop table if exists public.documentos cascade;
drop table if exists public.medidas_alertas_expediente cascade;
drop table if exists public.victimas cascade;
drop table if exists public.imputados cascade;
drop table if exists public.expedientes cascade;
drop table if exists public.usuarios cascade;
drop table if exists public.roles cascade;
drop table if exists public.configuracion_sistema cascade;

-- Catálogos visibles en la app/Supabase
drop table if exists public.catalogo_centros_penitenciarios cascade;
drop table if exists public.catalogo_decisiones cascade;
drop table if exists public.catalogo_estados_imputado cascade;
drop table if exists public.catalogo_estados_judiciales cascade;
drop table if exists public.catalogo_estados_registro cascade;
drop table if exists public.catalogo_infracciones cascade;
drop table if exists public.catalogo_jurisdicciones cascade;
drop table if exists public.catalogo_nacionalidades cascade;
drop table if exists public.catalogo_quien_interpone cascade;
drop table if exists public.catalogo_sexos cascade;
drop table if exists public.catalogo_tipos_expediente cascade;
drop table if exists public.provincias cascade;
drop table if exists public.municipios cascade;
drop table if exists public.sectores cascade;
drop table if exists public.notificaciones cascade;

-- 4) Tablas base
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  es_administracion boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  usuario text not null unique,
  email text not null unique,
  rol text not null references public.roles(nombre),
  estatus text not null default 'Activo',
  ultimo_acceso timestamptz,
  casos_asignados integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expedientes (
  id uuid primary key default gen_random_uuid(),
  numero_expediente text not null unique,
  numero_sentencia text,
  tipo_expediente text,
  jurisdiccion text,
  localidad_jurisdiccion text,
  fecha_recepcion date,
  fecha_decision date,
  decision text,
  quien_interpone text,
  estado_registro text not null default 'En Revisión',
  asignado_a text,
  creado_por text,
  provincia text,
  municipio text,
  sector text,
  direccion text,
  delito_principal text,
  tipos_penales text,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.imputados (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references public.expedientes(id) on delete cascade,
  numero_expediente text,
  tipo_persona text default 'Persona Física',
  nombre_completo text not null,
  documento text,
  edad integer,
  sexo text,
  nacionalidad text,
  estado_imputado text,
  estado_judicial text,
  centro_penitenciario text,
  pena text,
  pena_impuesta numeric,
  pena_privativa numeric,
  pena_suspendida numeric,
  indemnizacion numeric,
  garantia numeric,
  multa numeric,
  decomiso text,
  alerta_roja boolean not null default false,
  alerta_migratoria boolean not null default false,
  orden_arresto boolean not null default false,
  subido_a_pn boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.victimas (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references public.expedientes(id) on delete cascade,
  numero_expediente text,
  tipo_persona text default 'Persona Física',
  nombre_completo text not null,
  imputado_relacionado text,
  delito text,
  fecha_registro date default current_date,
  created_at timestamptz not null default now()
);

create table public.medidas_alertas_expediente (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references public.expedientes(id) on delete cascade,
  imputado_id uuid references public.imputados(id) on delete set null,
  numero_expediente text,
  tipo_medida text not null,
  imputado text,
  delito text,
  activada_por text,
  fecha_activacion date default current_date,
  activa boolean not null default true,
  observacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references public.expedientes(id) on delete cascade,
  numero_expediente text,
  nombre_archivo text not null,
  tipo_archivo text,
  peso text,
  imputado text,
  descripcion text,
  subido_por text,
  fecha_subida timestamptz not null default now(),
  version integer not null default 1,
  ruta_storage text,
  created_at timestamptz not null default now()
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario text,
  accion text not null,
  modulo text,
  entidad text,
  detalle text,
  ip text,
  tipo text default 'info',
  fecha timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'info',
  mensaje text not null,
  numero_expediente text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.configuracion_sistema (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

-- 5) Catálogos genéricos
create table public.catalogo_tipos_expediente (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_decisiones (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_quien_interpone (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_estados_registro (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_estados_imputado (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_estados_judiciales (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_sexos (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_nacionalidades (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_jurisdicciones (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_infracciones (id serial primary key, nombre text not null unique, activo boolean default true);
create table public.catalogo_centros_penitenciarios (id serial primary key, nombre text not null unique, activo boolean default true);

create table public.provincias (
  id serial primary key,
  nombre text not null unique
);

create table public.municipios (
  id serial primary key,
  provincia_id integer references public.provincias(id) on delete cascade,
  nombre text not null,
  unique(provincia_id, nombre)
);

create table public.sectores (
  id serial primary key,
  municipio_id integer references public.municipios(id) on delete cascade,
  nombre text not null,
  unique(municipio_id, nombre)
);

-- 6) Índices
create index idx_expedientes_numero on public.expedientes(numero_expediente);
create index idx_expedientes_sentencia on public.expedientes(numero_sentencia);
create index idx_expedientes_estado_registro on public.expedientes(estado_registro);
create index idx_imputados_numero_expediente on public.imputados(numero_expediente);
create index idx_victimas_numero_expediente on public.victimas(numero_expediente);
create index idx_medidas_numero_expediente on public.medidas_alertas_expediente(numero_expediente);
create index idx_documentos_numero_expediente on public.documentos(numero_expediente);
create index idx_auditoria_fecha on public.auditoria(fecha desc);

-- 7) Datos mínimos para login/roles/catálogos
insert into public.roles (nombre, descripcion, es_administracion) values
  ('Administrador', 'Acceso completo al sistema', true),
  ('Supervisor', 'Supervisión operativa sin administración técnica', false),
  ('Analista', 'Gestión operativa de expedientes', false)
on conflict (nombre) do nothing;

insert into public.usuarios (nombre_completo, usuario, email, rol, estatus) values
  ('Michael Custodio', 'michael.custodio', 'michael.custodio@pgr.gob.do', 'Administrador', 'Activo'),
  ('Supervisor UCAPREC', 'supervisor.ucaprec', 'supervisor.ucaprec@pgr.gob.do', 'Supervisor', 'Activo'),
  ('Analista UCAPREC', 'analista.ucaprec', 'analista.ucaprec@pgr.gob.do', 'Analista', 'Activo')
on conflict (usuario) do nothing;

insert into public.catalogo_estados_registro (nombre) values ('En Revisión'), ('Verificado'), ('Requiere Atención') on conflict do nothing;
insert into public.catalogo_estados_imputado (nombre) values ('Prófugo'), ('Rebeldía'), ('Recluido'), ('Absuelto') on conflict do nothing;
insert into public.catalogo_estados_judiciales (nombre) values ('Condenado'), ('Procesado'), ('Absuelto') on conflict do nothing;
insert into public.catalogo_tipos_expediente (nombre) values ('Sentencia'), ('Resolución'), ('Recurso de Casación') on conflict do nothing;
insert into public.catalogo_decisiones (nombre) values ('Acoge'), ('Rechaza'), ('Declara inadmisible'), ('Confirma'), ('Revoca') on conflict do nothing;
insert into public.catalogo_quien_interpone (nombre) values ('Ministerio Público'), ('Imputado'), ('Víctima'), ('Defensa Técnica') on conflict do nothing;
insert into public.catalogo_sexos (nombre) values ('Hombre'), ('Mujer'), ('Persona Jurídica'), ('No especificado') on conflict do nothing;
insert into public.catalogo_nacionalidades (nombre) values ('Dominicano/a'), ('Haitiano/a'), ('Venezolano/a'), ('Colombiano/a'), ('No especificada') on conflict do nothing;
insert into public.catalogo_jurisdicciones (nombre) values ('Distrito Nacional'), ('Santiago'), ('San Cristóbal'), ('La Vega'), ('Puerto Plata') on conflict do nothing;
insert into public.catalogo_infracciones (nombre) values ('Lavado de Activos'), ('Fraude Fiscal'), ('Homicidio'), ('Tráfico de Drogas'), ('Estafa'), ('Robo Agravado') on conflict do nothing;
insert into public.catalogo_centros_penitenciarios (nombre) values ('N/A'), ('CCR Najayo Hombres'), ('CCR Najayo Mujeres'), ('La Victoria'), ('Rafey Hombres'), ('Rafey Mujeres') on conflict do nothing;

-- 8) Vistas consumidas por el frontend
create or replace view public.vw_dashboard_kpis as
select
  count(e.id)::integer as expedientes_totales,
  count(i.id)::integer as imputados_totales,
  count(i.id) filter (where i.estado_imputado = 'Prófugo')::integer as profugos_activos,
  count(i.id) filter (where i.estado_imputado = 'Rebeldía')::integer as en_rebeldia,
  count(e.id) filter (where e.estado_registro = 'En Revisión')::integer as expedientes_en_revision,
  count(i.id) filter (where i.alerta_roja is true)::integer as alertas_rojas,
  count(i.id) filter (where i.alerta_migratoria is true)::integer as alertas_migratorias,
  count(i.id) filter (where i.orden_arresto is true)::integer as ordenes_arresto,
  count(i.id) filter (where i.subido_a_pn is true)::integer as subidos_a_pn
from public.expedientes e
left join public.imputados i on i.expediente_id = e.id;

create or replace view public.vw_expedientes_requieren_atencion as
select *
from public.expedientes
where estado_registro in ('En Revisión', 'Requiere Atención');

-- 9) RLS temporal para pruebas del frontend actual
alter table public.roles enable row level security;
alter table public.usuarios enable row level security;
alter table public.expedientes enable row level security;
alter table public.imputados enable row level security;
alter table public.victimas enable row level security;
alter table public.medidas_alertas_expediente enable row level security;
alter table public.documentos enable row level security;
alter table public.auditoria enable row level security;
alter table public.notificaciones enable row level security;
alter table public.configuracion_sistema enable row level security;

-- Catálogos
alter table public.catalogo_tipos_expediente enable row level security;
alter table public.catalogo_decisiones enable row level security;
alter table public.catalogo_quien_interpone enable row level security;
alter table public.catalogo_estados_registro enable row level security;
alter table public.catalogo_estados_imputado enable row level security;
alter table public.catalogo_estados_judiciales enable row level security;
alter table public.catalogo_sexos enable row level security;
alter table public.catalogo_nacionalidades enable row level security;
alter table public.catalogo_jurisdicciones enable row level security;
alter table public.catalogo_infracciones enable row level security;
alter table public.catalogo_centros_penitenciarios enable row level security;
alter table public.provincias enable row level security;
alter table public.municipios enable row level security;
alter table public.sectores enable row level security;

-- Políticas genéricas de prueba: lectura pública con publishable key y escritura básica donde la app la necesita.
do $$
declare
  t text;
begin
  foreach t in array array[
    'roles','usuarios','expedientes','imputados','victimas','medidas_alertas_expediente',
    'documentos','auditoria','notificaciones','configuracion_sistema',
    'catalogo_tipos_expediente','catalogo_decisiones','catalogo_quien_interpone',
    'catalogo_estados_registro','catalogo_estados_imputado','catalogo_estados_judiciales',
    'catalogo_sexos','catalogo_nacionalidades','catalogo_jurisdicciones',
    'catalogo_infracciones','catalogo_centros_penitenciarios','provincias','municipios','sectores'
  ]
  loop
    execute format('drop policy if exists ucaprec_read_%I on public.%I', t, t);
    execute format('create policy ucaprec_read_%I on public.%I for select to anon, authenticated using (true)', t, t);
  end loop;
end $$;

drop policy if exists ucaprec_insert_expedientes on public.expedientes;
create policy ucaprec_insert_expedientes on public.expedientes
for insert to anon, authenticated
with check (true);

drop policy if exists ucaprec_update_expedientes on public.expedientes;
create policy ucaprec_update_expedientes on public.expedientes
for update to anon, authenticated
using (true)
with check (true);

-- Permisos explícitos para rol anon/authenticated sobre tablas y vistas.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update on public.expedientes to anon, authenticated;
grant select on public.vw_dashboard_kpis to anon, authenticated;
grant select on public.vw_expedientes_requieren_atencion to anon, authenticated;

commit;
