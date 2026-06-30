/*
  UCAPREC - Esquema institucional para Microsoft SQL Server
  Ejecutar desde SQL Server Management Studio.

  Recomendación:
  1. Crear primero la base de datos UCAPREC.
  2. Ejecutar este script dentro de esa base.
*/

set nocount on;
go

if schema_id('ucaprec') is null
  exec('create schema ucaprec');
go

drop view if exists ucaprec.vw_dashboard_kpis;
drop view if exists ucaprec.vw_expedientes_requieren_atencion;
go

drop table if exists ucaprec.auditoria;
drop table if exists ucaprec.documentos;
drop table if exists ucaprec.medidas_alertas_expediente;
drop table if exists ucaprec.victimas;
drop table if exists ucaprec.imputados;
drop table if exists ucaprec.expedientes;
drop table if exists ucaprec.user_permissions;
drop table if exists ucaprec.permissions;
drop table if exists ucaprec.usuarios;
drop table if exists ucaprec.roles;
drop table if exists ucaprec.configuracion_sistema;
drop table if exists ucaprec.notificaciones;
drop table if exists ucaprec.catalogo_centros_penitenciarios;
drop table if exists ucaprec.catalogo_decisiones;
drop table if exists ucaprec.catalogo_estados_imputado;
drop table if exists ucaprec.catalogo_estados_judiciales;
drop table if exists ucaprec.catalogo_estados_registro;
drop table if exists ucaprec.catalogo_infracciones;
drop table if exists ucaprec.catalogo_jurisdicciones;
drop table if exists ucaprec.catalogo_nacionalidades;
drop table if exists ucaprec.catalogo_quien_interpone;
drop table if exists ucaprec.catalogo_sexos;
drop table if exists ucaprec.catalogo_tipos_expediente;
drop table if exists ucaprec.sectores;
drop table if exists ucaprec.municipios;
drop table if exists ucaprec.provincias;
go

create table ucaprec.roles (
  id uniqueidentifier not null constraint df_roles_id default newid() primary key,
  nombre nvarchar(80) not null unique,
  descripcion nvarchar(300) null,
  es_administracion bit not null constraint df_roles_admin default 0,
  created_at datetime2(0) not null constraint df_roles_created default sysutcdatetime()
);

create table ucaprec.usuarios (
  id uniqueidentifier not null constraint df_usuarios_id default newid() primary key,
  nombre_completo nvarchar(180) not null,
  usuario nvarchar(80) not null unique,
  email nvarchar(180) not null unique,
  password_hash nvarchar(255) not null,
  rol nvarchar(80) not null,
  estatus nvarchar(30) not null constraint df_usuarios_estatus default 'Activo',
  ultimo_acceso datetime2(0) null,
  debe_cambiar_password bit not null constraint df_usuarios_cambiar default 1,
  casos_asignados int not null constraint df_usuarios_casos default 0,
  created_at datetime2(0) not null constraint df_usuarios_created default sysutcdatetime(),
  updated_at datetime2(0) not null constraint df_usuarios_updated default sysutcdatetime(),
  constraint fk_usuarios_roles foreign key (rol) references ucaprec.roles(nombre)
);

create table ucaprec.permissions (
  id nvarchar(80) not null primary key,
  modulo nvarchar(80) not null,
  accion nvarchar(80) not null,
  descripcion nvarchar(300) null
);

create table ucaprec.user_permissions (
  usuario_id uniqueidentifier not null,
  permission_id nvarchar(80) not null,
  permitido bit not null,
  updated_at datetime2(0) not null constraint df_user_permissions_updated default sysutcdatetime(),
  constraint pk_user_permissions primary key (usuario_id, permission_id),
  constraint fk_user_permissions_usuario foreign key (usuario_id) references ucaprec.usuarios(id) on delete cascade,
  constraint fk_user_permissions_permission foreign key (permission_id) references ucaprec.permissions(id) on delete cascade
);

create table ucaprec.expedientes (
  id uniqueidentifier not null constraint df_expedientes_id default newid() primary key,
  numero_expediente nvarchar(100) not null unique,
  codigo_estructurado nvarchar(180) null unique,
  numero_sentencia nvarchar(150) null,
  tipo_expediente nvarchar(80) null,
  jurisdiccion nvarchar(180) null,
  localidad_jurisdiccion nvarchar(180) null,
  fecha_recepcion date null,
  fecha_decision date null,
  decision nvarchar(180) null,
  quien_interpone nvarchar(180) null,
  estado_registro nvarchar(80) not null constraint df_expedientes_estado default 'En Revisión',
  asignado_a nvarchar(180) null,
  creado_por nvarchar(80) null,
  provincia nvarchar(120) null,
  municipio nvarchar(120) null,
  sector nvarchar(120) null,
  direccion nvarchar(500) null,
  delito_principal nvarchar(180) null,
  tipos_penales nvarchar(max) null,
  observacion nvarchar(max) null,
  created_at datetime2(0) not null constraint df_expedientes_created default sysutcdatetime(),
  updated_at datetime2(0) not null constraint df_expedientes_updated default sysutcdatetime()
);

create table ucaprec.imputados (
  id uniqueidentifier not null constraint df_imputados_id default newid() primary key,
  expediente_id uniqueidentifier null,
  numero_expediente nvarchar(100) null,
  tipo_persona nvarchar(80) null constraint df_imputados_tipo default 'Persona Física',
  nombre_completo nvarchar(220) not null,
  documento nvarchar(80) null,
  edad int null,
  sexo nvarchar(80) null,
  nacionalidad nvarchar(120) null,
  estado_imputado nvarchar(80) null,
  estado_judicial nvarchar(80) null,
  centro_penitenciario nvarchar(180) null,
  pena nvarchar(120) null,
  pena_impuesta decimal(18,2) null,
  pena_privativa decimal(18,2) null,
  pena_suspendida decimal(18,2) null,
  indemnizacion decimal(18,2) null,
  garantia decimal(18,2) null,
  multa decimal(18,2) null,
  decomiso nvarchar(max) null,
  alerta_roja bit not null constraint df_imputados_alerta_roja default 0,
  alerta_migratoria bit not null constraint df_imputados_alerta_migratoria default 0,
  orden_arresto bit not null constraint df_imputados_orden default 0,
  subido_a_pn bit not null constraint df_imputados_pn default 0,
  created_at datetime2(0) not null constraint df_imputados_created default sysutcdatetime(),
  updated_at datetime2(0) not null constraint df_imputados_updated default sysutcdatetime(),
  constraint fk_imputados_expediente foreign key (expediente_id) references ucaprec.expedientes(id) on delete cascade
);

create table ucaprec.victimas (
  id uniqueidentifier not null constraint df_victimas_id default newid() primary key,
  expediente_id uniqueidentifier null,
  numero_expediente nvarchar(100) null,
  tipo_persona nvarchar(80) null constraint df_victimas_tipo default 'Persona Física',
  nombre_completo nvarchar(220) not null,
  imputado_relacionado nvarchar(220) null,
  delito nvarchar(180) null,
  fecha_registro date not null constraint df_victimas_fecha default cast(sysutcdatetime() as date),
  created_at datetime2(0) not null constraint df_victimas_created default sysutcdatetime(),
  constraint fk_victimas_expediente foreign key (expediente_id) references ucaprec.expedientes(id) on delete cascade
);

create table ucaprec.medidas_alertas_expediente (
  id uniqueidentifier not null constraint df_medidas_id default newid() primary key,
  expediente_id uniqueidentifier null,
  imputado_id uniqueidentifier null,
  numero_expediente nvarchar(100) null,
  tipo_medida nvarchar(120) not null,
  imputado nvarchar(220) null,
  delito nvarchar(180) null,
  activada_por nvarchar(80) null,
  fecha_activacion date not null constraint df_medidas_fecha default cast(sysutcdatetime() as date),
  activa bit not null constraint df_medidas_activa default 1,
  observacion nvarchar(max) null,
  created_at datetime2(0) not null constraint df_medidas_created default sysutcdatetime(),
  updated_at datetime2(0) not null constraint df_medidas_updated default sysutcdatetime(),
  constraint fk_medidas_expediente foreign key (expediente_id) references ucaprec.expedientes(id) on delete cascade,
  constraint fk_medidas_imputado foreign key (imputado_id) references ucaprec.imputados(id) on delete set null
);

create table ucaprec.documentos (
  id uniqueidentifier not null constraint df_documentos_id default newid() primary key,
  expediente_id uniqueidentifier null,
  numero_expediente nvarchar(100) null,
  nombre_archivo nvarchar(260) not null,
  tipo_archivo nvarchar(120) null,
  peso nvarchar(40) null,
  imputado nvarchar(220) null,
  descripcion nvarchar(500) null,
  subido_por nvarchar(80) null,
  fecha_subida datetime2(0) not null constraint df_documentos_fecha default sysutcdatetime(),
  version int not null constraint df_documentos_version default 1,
  ruta_storage nvarchar(500) null,
  checksum_sha256 nvarchar(64) null,
  created_at datetime2(0) not null constraint df_documentos_created default sysutcdatetime(),
  constraint fk_documentos_expediente foreign key (expediente_id) references ucaprec.expedientes(id) on delete cascade,
  constraint uq_documentos_nombre unique (numero_expediente, nombre_archivo)
);

create table ucaprec.auditoria (
  id uniqueidentifier not null constraint df_auditoria_id default newid() primary key,
  usuario nvarchar(80) null,
  accion nvarchar(120) not null,
  modulo nvarchar(120) null,
  entidad nvarchar(180) null,
  detalle nvarchar(max) null,
  ip nvarchar(80) null,
  tipo nvarchar(40) null constraint df_auditoria_tipo default 'info',
  fecha datetime2(0) not null constraint df_auditoria_fecha default sysutcdatetime(),
  created_at datetime2(0) not null constraint df_auditoria_created default sysutcdatetime()
);

create table ucaprec.notificaciones (
  id uniqueidentifier not null constraint df_notificaciones_id default newid() primary key,
  tipo nvarchar(40) not null constraint df_notificaciones_tipo default 'info',
  mensaje nvarchar(500) not null,
  numero_expediente nvarchar(100) null,
  leida bit not null constraint df_notificaciones_leida default 0,
  created_at datetime2(0) not null constraint df_notificaciones_created default sysutcdatetime()
);

create table ucaprec.configuracion_sistema (
  clave nvarchar(120) not null primary key,
  valor nvarchar(max) not null,
  updated_at datetime2(0) not null constraint df_configuracion_updated default sysutcdatetime(),
  constraint ck_configuracion_json check (isjson(valor) = 1)
);

create table ucaprec.catalogo_tipos_expediente (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_decisiones (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_quien_interpone (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_estados_registro (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_estados_imputado (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_estados_judiciales (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_sexos (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_nacionalidades (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_jurisdicciones (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_infracciones (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);
create table ucaprec.catalogo_centros_penitenciarios (id int identity primary key, nombre nvarchar(180) not null unique, activo bit default 1);

create table ucaprec.provincias (id int identity primary key, nombre nvarchar(120) not null unique);
create table ucaprec.municipios (
  id int identity primary key,
  provincia_id int not null,
  nombre nvarchar(120) not null,
  constraint fk_municipios_provincia foreign key (provincia_id) references ucaprec.provincias(id) on delete cascade,
  constraint uq_municipios unique (provincia_id, nombre)
);
create table ucaprec.sectores (
  id int identity primary key,
  municipio_id int not null,
  nombre nvarchar(120) not null,
  constraint fk_sectores_municipio foreign key (municipio_id) references ucaprec.municipios(id) on delete cascade,
  constraint uq_sectores unique (municipio_id, nombre)
);
go

create index ix_expedientes_numero on ucaprec.expedientes(numero_expediente);
create index ix_expedientes_estado on ucaprec.expedientes(estado_registro);
create index ix_expedientes_asignado on ucaprec.expedientes(asignado_a);
create index ix_imputados_numero on ucaprec.imputados(numero_expediente);
create index ix_victimas_numero on ucaprec.victimas(numero_expediente);
create index ix_medidas_numero on ucaprec.medidas_alertas_expediente(numero_expediente);
create index ix_documentos_numero on ucaprec.documentos(numero_expediente);
create index ix_auditoria_fecha on ucaprec.auditoria(fecha desc);
go

create or alter trigger ucaprec.trg_usuarios_updated_at on ucaprec.usuarios
after update as
begin
  set nocount on;
  update u set updated_at = sysutcdatetime()
  from ucaprec.usuarios u
  join inserted i on i.id = u.id;
end;
go

create or alter trigger ucaprec.trg_expedientes_updated_at on ucaprec.expedientes
after update as
begin
  set nocount on;
  update e set updated_at = sysutcdatetime()
  from ucaprec.expedientes e
  join inserted i on i.id = e.id;
end;
go

create or alter trigger ucaprec.trg_imputados_updated_at on ucaprec.imputados
after update as
begin
  set nocount on;
  update t set updated_at = sysutcdatetime()
  from ucaprec.imputados t
  join inserted i on i.id = t.id;
end;
go

create or alter trigger ucaprec.trg_medidas_updated_at on ucaprec.medidas_alertas_expediente
after update as
begin
  set nocount on;
  update t set updated_at = sysutcdatetime()
  from ucaprec.medidas_alertas_expediente t
  join inserted i on i.id = t.id;
end;
go

create view ucaprec.vw_dashboard_kpis as
select
  count(distinct e.id) as expedientes_totales,
  count(i.id) as imputados_totales,
  sum(case when i.estado_imputado = N'Prófugo' then 1 else 0 end) as profugos_activos,
  sum(case when i.estado_imputado = N'Rebeldía' then 1 else 0 end) as en_rebeldia,
  count(distinct case when e.estado_registro = N'En Revisión' then e.id end) as expedientes_en_revision,
  sum(case when i.alerta_roja = 1 then 1 else 0 end) as alertas_rojas,
  sum(case when i.alerta_migratoria = 1 then 1 else 0 end) as alertas_migratorias,
  sum(case when i.orden_arresto = 1 then 1 else 0 end) as ordenes_arresto,
  sum(case when i.subido_a_pn = 1 then 1 else 0 end) as subidos_a_pn
from ucaprec.expedientes e
left join ucaprec.imputados i on i.expediente_id = e.id;
go

create view ucaprec.vw_expedientes_requieren_atencion as
select *
from ucaprec.expedientes
where estado_registro in (N'En Revisión', N'Requiere Atención');
go

insert into ucaprec.roles (nombre, descripcion, es_administracion)
select v.nombre, v.descripcion, v.es_administracion
from (values
  (N'Administrador', N'Acceso completo al sistema', cast(1 as bit)),
  (N'Supervisor', N'Supervisión operativa sin administración técnica', cast(0 as bit)),
  (N'Analista', N'Gestión operativa de expedientes', cast(0 as bit)),
  (N'Consultor', N'Solo lectura', cast(0 as bit))
) v(nombre, descripcion, es_administracion)
where not exists (select 1 from ucaprec.roles r where r.nombre = v.nombre);

insert into ucaprec.permissions (id, modulo, accion, descripcion)
select v.id, v.modulo, v.accion, v.descripcion
from (values
  (N'dashboard.view', N'Dashboard', N'Ver', N'Acceso al panel principal'),
  (N'cases.create', N'Expedientes', N'Crear', N'Crear expedientes'),
  (N'cases.edit', N'Expedientes', N'Editar', N'Editar expedientes'),
  (N'cases.delete', N'Expedientes', N'Eliminar', N'Eliminar expedientes'),
  (N'cases.export', N'Expedientes', N'Exportar', N'Exportar expedientes'),
  (N'cases.verify', N'Expedientes', N'Verificar', N'Verificar expedientes'),
  (N'defendants.measures', N'Imputados', N'Gestionar medidas', N'Gestionar medidas de imputados'),
  (N'documents.upload', N'Documentos', N'Subir', N'Subir documentos'),
  (N'documents.download', N'Documentos', N'Descargar', N'Descargar documentos'),
  (N'reports.export', N'Reportes', N'Exportar', N'Exportar PDF o Excel'),
  (N'users.manage', N'Usuarios', N'Gestionar', N'Administrar usuarios y roles'),
  (N'catalogs.manage', N'Catálogos', N'Administrar', N'Administrar catálogos'),
  (N'audit.view', N'Auditoría', N'Ver', N'Ver auditoría'),
  (N'settings.access', N'Configuración', N'Acceder', N'Acceder a configuración')
) v(id, modulo, accion, descripcion)
where not exists (select 1 from ucaprec.permissions p where p.id = v.id);

insert into ucaprec.usuarios (nombre_completo, usuario, email, password_hash, rol, estatus, debe_cambiar_password)
select v.nombre_completo, v.usuario, v.email, v.password_hash, v.rol, N'Activo', cast(1 as bit)
from (values
  (N'Michael Custodio', N'michael.custodio', N'michael.custodio@pgr.gob.do', N'CAMBIAR_DESDE_BACKEND', N'Administrador'),
  (N'Supervisor UCAPREC', N'supervisor.ucaprec', N'supervisor.ucaprec@pgr.gob.do', N'CAMBIAR_DESDE_BACKEND', N'Supervisor'),
  (N'Analista UCAPREC', N'analista.ucaprec', N'analista.ucaprec@pgr.gob.do', N'CAMBIAR_DESDE_BACKEND', N'Analista')
) v(nombre_completo, usuario, email, password_hash, rol)
where not exists (select 1 from ucaprec.usuarios u where u.usuario = v.usuario);

insert into ucaprec.catalogo_estados_registro (nombre) values (N'En Revisión'), (N'Verificado'), (N'Requiere Atención');
insert into ucaprec.catalogo_estados_imputado (nombre) values (N'Prófugo'), (N'Rebeldía'), (N'Recluido'), (N'Absuelto');
insert into ucaprec.catalogo_estados_judiciales (nombre) values (N'Condenado'), (N'Procesado'), (N'Absuelto');
insert into ucaprec.catalogo_tipos_expediente (nombre) values (N'Sentencia'), (N'Resolución'), (N'Recurso de Casación');
insert into ucaprec.catalogo_decisiones (nombre) values (N'Acoge'), (N'Rechaza'), (N'Declara inadmisible'), (N'Confirma'), (N'Revoca');
insert into ucaprec.catalogo_quien_interpone (nombre) values (N'Ministerio Público'), (N'Imputado'), (N'Víctima'), (N'Defensa Técnica');
insert into ucaprec.catalogo_sexos (nombre) values (N'Hombre'), (N'Mujer'), (N'Persona Jurídica'), (N'No especificado');
insert into ucaprec.catalogo_nacionalidades (nombre) values (N'Dominicano/a'), (N'Haitiano/a'), (N'Venezolano/a'), (N'Colombiano/a'), (N'No especificada');
insert into ucaprec.catalogo_jurisdicciones (nombre) values (N'Distrito Nacional'), (N'Santiago'), (N'San Cristóbal'), (N'La Vega'), (N'Puerto Plata');
insert into ucaprec.catalogo_infracciones (nombre) values (N'Lavado de Activos'), (N'Fraude Fiscal'), (N'Homicidio'), (N'Tráfico de Drogas'), (N'Estafa'), (N'Robo Agravado');
insert into ucaprec.catalogo_centros_penitenciarios (nombre) values (N'N/A'), (N'CCR Najayo Hombres'), (N'CCR Najayo Mujeres'), (N'La Victoria'), (N'Rafey Hombres'), (N'Rafey Mujeres');
go
