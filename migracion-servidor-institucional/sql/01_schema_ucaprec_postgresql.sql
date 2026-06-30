-- UCAPREC - Esquema PostgreSQL institucional
-- Objetivo: reemplazar Supabase con una base PostgreSQL propia.
-- Ejecutar con un usuario administrador de PostgreSQL.

begin;

create extension if not exists pgcrypto;

create schema if not exists ucaprec;

set search_path to ucaprec, public;

drop view if exists vw_dashboard_kpis;
drop view if exists vw_expedientes_requieren_atencion;

drop table if exists auditoria cascade;
drop table if exists documentos cascade;
drop table if exists medidas_alertas_expediente cascade;
drop table if exists victimas cascade;
drop table if exists imputados cascade;
drop table if exists expedientes cascade;
drop table if exists user_permissions cascade;
drop table if exists permissions cascade;
drop table if exists usuarios cascade;
drop table if exists roles cascade;
drop table if exists configuracion_sistema cascade;
drop table if exists notificaciones cascade;
drop table if exists catalogo_centros_penitenciarios cascade;
drop table if exists catalogo_decisiones cascade;
drop table if exists catalogo_estados_imputado cascade;
drop table if exists catalogo_estados_judiciales cascade;
drop table if exists catalogo_estados_registro cascade;
drop table if exists catalogo_infracciones cascade;
drop table if exists catalogo_jurisdicciones cascade;
drop table if exists catalogo_nacionalidades cascade;
drop table if exists catalogo_quien_interpone cascade;
drop table if exists catalogo_sexos cascade;
drop table if exists catalogo_tipos_expediente cascade;
drop table if exists provincias cascade;
drop table if exists municipios cascade;
drop table if exists sectores cascade;

create table roles (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  es_administracion boolean not null default false,
  created_at timestamptz not null default now()
);

create table usuarios (
  id uuid primary key default gen_random_uuid(),
  nombre_completo text not null,
  usuario text not null unique,
  email text not null unique,
  password_hash text not null,
  rol text not null references roles(nombre),
  estatus text not null default 'Activo',
  ultimo_acceso timestamptz,
  debe_cambiar_password boolean not null default true,
  casos_asignados integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table permissions (
  id text primary key,
  modulo text not null,
  accion text not null,
  descripcion text
);

create table user_permissions (
  usuario_id uuid not null references usuarios(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  permitido boolean not null,
  updated_at timestamptz not null default now(),
  primary key (usuario_id, permission_id)
);

create table expedientes (
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

create table imputados (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade,
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

create table victimas (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade,
  numero_expediente text,
  tipo_persona text default 'Persona Física',
  nombre_completo text not null,
  imputado_relacionado text,
  delito text,
  fecha_registro date default current_date,
  created_at timestamptz not null default now()
);

create table medidas_alertas_expediente (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade,
  imputado_id uuid references imputados(id) on delete set null,
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

create table documentos (
  id uuid primary key default gen_random_uuid(),
  expediente_id uuid references expedientes(id) on delete cascade,
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
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  unique (numero_expediente, nombre_archivo)
);

create table auditoria (
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

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'info',
  mensaje text not null,
  numero_expediente text,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create table configuracion_sistema (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

create table catalogo_tipos_expediente (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_decisiones (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_quien_interpone (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_estados_registro (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_estados_imputado (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_estados_judiciales (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_sexos (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_nacionalidades (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_jurisdicciones (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_infracciones (id serial primary key, nombre text not null unique, activo boolean default true);
create table catalogo_centros_penitenciarios (id serial primary key, nombre text not null unique, activo boolean default true);

create table provincias (
  id serial primary key,
  nombre text not null unique
);

create table municipios (
  id serial primary key,
  provincia_id integer references provincias(id) on delete cascade,
  nombre text not null,
  unique(provincia_id, nombre)
);

create table sectores (
  id serial primary key,
  municipio_id integer references municipios(id) on delete cascade,
  nombre text not null,
  unique(municipio_id, nombre)
);

create index idx_expedientes_numero on expedientes(numero_expediente);
create index idx_expedientes_estado_registro on expedientes(estado_registro);
create index idx_expedientes_asignado on expedientes(asignado_a);
create index idx_imputados_numero_expediente on imputados(numero_expediente);
create index idx_victimas_numero_expediente on victimas(numero_expediente);
create index idx_medidas_numero_expediente on medidas_alertas_expediente(numero_expediente);
create index idx_documentos_numero_expediente on documentos(numero_expediente);
create index idx_auditoria_fecha on auditoria(fecha desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_usuarios_updated_at before update on usuarios for each row execute function set_updated_at();
create trigger trg_expedientes_updated_at before update on expedientes for each row execute function set_updated_at();
create trigger trg_imputados_updated_at before update on imputados for each row execute function set_updated_at();
create trigger trg_medidas_updated_at before update on medidas_alertas_expediente for each row execute function set_updated_at();

create or replace view vw_dashboard_kpis as
select
  count(distinct e.id)::integer as expedientes_totales,
  count(i.id)::integer as imputados_totales,
  count(i.id) filter (where i.estado_imputado = 'Prófugo')::integer as profugos_activos,
  count(i.id) filter (where i.estado_imputado = 'Rebeldía')::integer as en_rebeldia,
  count(distinct e.id) filter (where e.estado_registro = 'En Revisión')::integer as expedientes_en_revision,
  count(i.id) filter (where i.alerta_roja is true)::integer as alertas_rojas,
  count(i.id) filter (where i.alerta_migratoria is true)::integer as alertas_migratorias,
  count(i.id) filter (where i.orden_arresto is true)::integer as ordenes_arresto,
  count(i.id) filter (where i.subido_a_pn is true)::integer as subidos_a_pn
from expedientes e
left join imputados i on i.expediente_id = e.id;

create or replace view vw_expedientes_requieren_atencion as
select *
from expedientes
where estado_registro in ('En Revisión', 'Requiere Atención');

insert into roles (nombre, descripcion, es_administracion) values
  ('Administrador', 'Acceso completo al sistema', true),
  ('Supervisor', 'Supervisión operativa sin administración técnica', false),
  ('Analista', 'Gestión operativa de expedientes', false),
  ('Consultor', 'Solo lectura', false)
on conflict (nombre) do nothing;

insert into permissions (id, modulo, accion, descripcion) values
  ('dashboard.view', 'Dashboard', 'Ver', 'Acceso al panel principal'),
  ('cases.create', 'Expedientes', 'Crear', 'Crear expedientes'),
  ('cases.edit', 'Expedientes', 'Editar', 'Editar expedientes'),
  ('cases.delete', 'Expedientes', 'Eliminar', 'Eliminar expedientes'),
  ('cases.export', 'Expedientes', 'Exportar', 'Exportar expedientes'),
  ('cases.verify', 'Expedientes', 'Verificar', 'Verificar expedientes'),
  ('defendants.measures', 'Imputados', 'Gestionar medidas', 'Gestionar medidas de imputados'),
  ('documents.upload', 'Documentos', 'Subir', 'Subir documentos'),
  ('documents.download', 'Documentos', 'Descargar', 'Descargar documentos'),
  ('reports.export', 'Reportes', 'Exportar', 'Exportar PDF o Excel'),
  ('users.manage', 'Usuarios', 'Gestionar', 'Administrar usuarios y roles'),
  ('catalogs.manage', 'Catálogos', 'Administrar', 'Administrar catálogos'),
  ('audit.view', 'Auditoría', 'Ver', 'Ver auditoría'),
  ('settings.access', 'Configuración', 'Acceder', 'Acceder a configuración')
on conflict (id) do nothing;

insert into usuarios (nombre_completo, usuario, email, password_hash, rol, estatus, debe_cambiar_password) values
  ('Michael Custodio', 'michael.custodio', 'michael.custodio@pgr.gob.do', crypt('Cambiar123!', gen_salt('bf')), 'Administrador', 'Activo', true),
  ('Supervisor UCAPREC', 'supervisor.ucaprec', 'supervisor.ucaprec@pgr.gob.do', crypt('Supervisor123', gen_salt('bf')), 'Supervisor', 'Activo', true),
  ('Analista UCAPREC', 'analista.ucaprec', 'analista.ucaprec@pgr.gob.do', crypt('Analista123', gen_salt('bf')), 'Analista', 'Activo', true)
on conflict (usuario) do nothing;

insert into catalogo_estados_registro (nombre) values ('En Revisión'), ('Verificado'), ('Requiere Atención') on conflict do nothing;
insert into catalogo_estados_imputado (nombre) values ('Prófugo'), ('Rebeldía'), ('Recluido'), ('Absuelto') on conflict do nothing;
insert into catalogo_estados_judiciales (nombre) values ('Condenado'), ('Procesado'), ('Absuelto') on conflict do nothing;
insert into catalogo_tipos_expediente (nombre) values ('Sentencia'), ('Resolución'), ('Recurso de Casación') on conflict do nothing;
insert into catalogo_decisiones (nombre) values ('Acoge'), ('Rechaza'), ('Declara inadmisible'), ('Confirma'), ('Revoca') on conflict do nothing;
insert into catalogo_quien_interpone (nombre) values ('Ministerio Público'), ('Imputado'), ('Víctima'), ('Defensa Técnica') on conflict do nothing;
insert into catalogo_sexos (nombre) values ('Hombre'), ('Mujer'), ('Persona Jurídica'), ('No especificado') on conflict do nothing;
insert into catalogo_nacionalidades (nombre) values ('Dominicano/a'), ('Haitiano/a'), ('Venezolano/a'), ('Colombiano/a'), ('No especificada') on conflict do nothing;
insert into catalogo_jurisdicciones (nombre) values ('Distrito Nacional'), ('Santiago'), ('San Cristóbal'), ('La Vega'), ('Puerto Plata') on conflict do nothing;
insert into catalogo_infracciones (nombre) values ('Lavado de Activos'), ('Fraude Fiscal'), ('Homicidio'), ('Tráfico de Drogas'), ('Estafa'), ('Robo Agravado') on conflict do nothing;
insert into catalogo_centros_penitenciarios (nombre) values ('N/A'), ('CCR Najayo Hombres'), ('CCR Najayo Mujeres'), ('La Victoria'), ('Rafey Hombres'), ('Rafey Mujeres') on conflict do nothing;

commit;
