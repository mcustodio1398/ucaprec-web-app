# UCAPREC - Migración a servidor institucional

Este paquete prepara la salida de Supabase/Netlify hacia una infraestructura propia:

- PostgreSQL institucional para la base de datos.
- Backend Node/Express para autenticación, permisos, CRUD y documentos.
- Carpeta local o ruta de red para almacenar documentos.

La app actual puede seguir funcionando con Supabase mientras se realiza la migración. Este paquete no modifica el frontend existente.

## 1. Requisitos del servidor

Recomendado:

- Ubuntu Server 22.04/24.04 LTS o Windows Server 2019/2022.
- PostgreSQL 15 o superior.
- Node.js 22 LTS.
- Nginx o IIS como proxy web.
- Certificado HTTPS institucional.
- Carpeta segura para documentos, por ejemplo `/srv/ucaprec/documentos`.

## 2. Crear base de datos y usuario PostgreSQL

Entrar como administrador de PostgreSQL y ejecutar:

```sql
create database ucaprec;
create user ucaprec_app with encrypted password 'CAMBIAR_PASSWORD_FUERTE';
grant connect on database ucaprec to ucaprec_app;
```

Luego conectar a la base `ucaprec` y ejecutar:

```sql
grant usage, create on schema public to ucaprec_app;
```

Después ejecutar el archivo:

```text
migracion-servidor-institucional/sql/01_schema_ucaprec_postgresql.sql
```

Ese script crea:

- Roles y usuarios.
- Expedientes.
- Imputados.
- Víctimas.
- Medidas y alertas.
- Documentos.
- Auditoría.
- Catálogos.
- Permisos por usuario.
- Vistas para dashboard.

Usuarios iniciales:

- `michael.custodio@pgr.gob.do` / `Cambiar123!`
- `supervisor.ucaprec@pgr.gob.do` / `Supervisor123`
- `analista.ucaprec@pgr.gob.do` / `Analista123`

Cambiar estas contraseñas antes de producción.

## 3. Configurar permisos de base de datos

Luego de crear el esquema, ejecutar:

```sql
grant usage on schema ucaprec to ucaprec_app;
grant select, insert, update, delete on all tables in schema ucaprec to ucaprec_app;
grant usage, select on all sequences in schema ucaprec to ucaprec_app;
alter default privileges in schema ucaprec grant select, insert, update, delete on tables to ucaprec_app;
alter default privileges in schema ucaprec grant usage, select on sequences to ucaprec_app;
```

## 4. Instalar backend

Copiar la carpeta:

```text
migracion-servidor-institucional/backend
```

En el servidor:

```bash
cd /srv/ucaprec/backend
npm install --omit=dev
cp .env.example .env
```

Editar `.env`:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://ucaprec.pgr.gob.do
DATABASE_URL=postgres://ucaprec_app:CAMBIAR_PASSWORD_FUERTE@localhost:5432/ucaprec
DATABASE_SSL=false
JWT_SECRET=GENERAR_UN_SECRETO_LARGO_ALEATORIO
JWT_EXPIRES_IN=8h
UPLOAD_DIR=/srv/ucaprec/documentos
MAX_FILE_MB=25
```

Crear carpeta de documentos:

```bash
mkdir -p /srv/ucaprec/documentos
chown -R nodeuser:nodeuser /srv/ucaprec/documentos
```

Probar:

```bash
npm start
```

Verificar:

```text
http://SERVIDOR:4000/api/health
```

Debe responder:

```json
{ "ok": true }
```

## 5. Ejecutar como servicio

En Linux con systemd:

```ini
[Unit]
Description=UCAPREC Backend
After=network.target

[Service]
WorkingDirectory=/srv/ucaprec/backend
ExecStart=/usr/bin/node src/server.js
Restart=always
Environment=NODE_ENV=production
User=nodeuser
Group=nodeuser

[Install]
WantedBy=multi-user.target
```

Guardar como:

```text
/etc/systemd/system/ucaprec-backend.service
```

Activar:

```bash
systemctl daemon-reload
systemctl enable ucaprec-backend
systemctl start ucaprec-backend
systemctl status ucaprec-backend
```

## 6. Configurar proxy HTTPS

Ejemplo Nginx:

```nginx
server {
  listen 443 ssl;
  server_name ucaprec.pgr.gob.do;

  ssl_certificate /etc/ssl/certs/ucaprec.crt;
  ssl_certificate_key /etc/ssl/private/ucaprec.key;

  root /srv/ucaprec/frontend/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:4000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

## 7. Frontend

La app actual todavía usa Supabase directamente. Para dejarla 100% institucional hay que hacer esta segunda fase:

1. Crear un cliente API en el frontend.
2. Reemplazar `supabase.auth` por `/api/auth/login` y `/api/auth/me`.
3. Reemplazar consultas `supabase.from("expedientes")` por `/api/expedientes`.
4. Reemplazar `supabase.storage` por `/api/documentos`.
5. Reemplazar reset de contraseña por `/api/users/:id/reset-password`.
6. Reemplazar permisos por `/api/users/:id/permissions`.

Variable sugerida para el frontend:

```env
VITE_API_URL=https://ucaprec.pgr.gob.do/api
```

## 8. Pruebas mínimas antes de producción

1. Login con administrador.
2. Login con analista.
3. Crear expediente con varios imputados y víctimas.
4. Editar expediente.
5. Eliminar expediente y confirmar que no reaparece.
6. Cargar documento PDF.
7. Ver vista previa PDF.
8. Descargar documento.
9. Exportar Excel.
10. Exportar informe PDF del dashboard.
11. Resetear contraseña de supervisor.
12. Cambiar permisos de un usuario y verificar matriz.
13. Revisar auditoría.
14. Probar respaldo y restauración de PostgreSQL.

## 9. Respaldo recomendado

Base de datos:

```bash
pg_dump -Fc -d ucaprec -f /backups/ucaprec_$(date +%F).dump
```

Documentos:

```bash
rsync -a /srv/ucaprec/documentos/ /backups/documentos/
```

## 10. Punto clave

Este backend sustituye Supabase, pero para que el sistema deje de depender totalmente de Supabase hay que ejecutar la fase de adaptación del frontend. El paquete actual deja lista la base y la API institucional para esa transición.
