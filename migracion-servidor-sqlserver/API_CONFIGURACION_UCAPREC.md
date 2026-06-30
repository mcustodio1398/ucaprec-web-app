# UCAPREC - Configuracion de API institucional

## 1. Variables del backend

Crear `backend/.env` a partir de `backend/.env.example`:

```env
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://ucaprec.pgr.gob.do

SQLSERVER_HOST=SERVIDOR_SQL
SQLSERVER_PORT=1433
SQLSERVER_DATABASE=UCAPREC
SQLSERVER_USER=ucaprec_app
SQLSERVER_PASSWORD=CAMBIAR_PASSWORD_FUERTE
SQLSERVER_ENCRYPT=false
SQLSERVER_TRUST_CERT=true

JWT_SECRET=GENERAR_UN_SECRETO_LARGO_ALEATORIO
JWT_EXPIRES_IN=8h

UPLOAD_DIR=D:\UCAPREC\documentos
MAX_FILE_MB=25
```

## 2. Endpoints disponibles

Base URL sugerida:

```text
https://ucaprec.pgr.gob.do/api
```

### Salud

- `GET /api/health`: confirma que el backend esta activo.

### Autenticacion

- `POST /api/auth/login`: autentica por usuario/correo y contrasena.
- `GET /api/auth/me`: devuelve el usuario autenticado.

### Dashboard

- `GET /api/dashboard/kpis`: devuelve indicadores principales.

### Expedientes

- `GET /api/expedientes`: lista expedientes.
- `GET /api/expedientes/:numero`: obtiene expediente con imputados, victimas y documentos.
- `POST /api/expedientes`: crea expediente con imputados y victimas.
- `PUT /api/expedientes/:numero`: actualiza datos generales del expediente.
- `DELETE /api/expedientes/:numero`: elimina expediente.

### Documentos

- `GET /api/documentos`: lista documentos.
- `POST /api/documentos`: sube documento con `multipart/form-data`.
- `GET /api/documentos/:id/preview`: abre vista previa.
- `GET /api/documentos/:id/download`: descarga archivo.
- `DELETE /api/documentos/:id`: elimina registro y archivo fisico.

### Usuarios y permisos

- `GET /api/users`: lista usuarios.
- `POST /api/users`: crea usuario.
- `PATCH /api/users/:id`: edita usuario.
- `POST /api/users/:id/reset-password`: restablece contrasena.
- `DELETE /api/users/:id`: elimina usuario.
- `GET /api/users/:id/permissions`: lista permisos.
- `PUT /api/users/:id/permissions/:permissionId`: actualiza permiso.

## 3. Configuracion del frontend cuando se migre a SQL Server

Agregar variable:

```env
VITE_API_URL=https://ucaprec.pgr.gob.do/api
```

Cambios tecnicos pendientes en frontend:

- Reemplazar `supabase.auth.signInWithPassword` por `POST /api/auth/login`.
- Reemplazar consultas `supabase.from(...)` por llamadas `fetch` a `/api/...`.
- Reemplazar `supabase.storage` por `/api/documentos`.
- Guardar el JWT en sesion segura y enviarlo como `Authorization: Bearer TOKEN`.

## 4. Proxy recomendado

Si el frontend se publica en IIS:

- Sitio publico: `https://ucaprec.pgr.gob.do`
- Backend interno: `http://127.0.0.1:4000`
- Regla proxy: `/api/*` hacia `http://127.0.0.1:4000/api/*`

## 5. Prueba minima antes de produccion

1. `GET /api/health`.
2. Login administrador.
3. Crear expediente.
4. Editar estado del registro a `Verificado`.
5. Subir PDF.
6. Vista previa PDF.
7. Descargar PDF.
8. Resetear contrasena de usuario.
9. Cambiar permisos.
10. Revisar auditoria.
