# UCAPREC - Despliegue institucional con SQL Server

Este paquete es la ruta correcta si la institución usa:

- Microsoft SQL Server
- SQL Server Management Studio
- Windows Server/IIS o un servidor Node interno

La carpeta PostgreSQL anterior queda solo como referencia técnica. Para producción institucional debe usarse este paquete `migracion-servidor-sqlserver`.

## 1. Contenido

```text
migracion-servidor-sqlserver/
  sql/
    01_schema_ucaprec_sqlserver.sql
  backend/
    package.json
    .env.example
    src/
```

## 2. Crear la base en SQL Server

Desde SQL Server Management Studio:

```sql
create database UCAPREC;
go
```

Entrar a la base `UCAPREC` y ejecutar:

```text
migracion-servidor-sqlserver/sql/01_schema_ucaprec_sqlserver.sql
```

Ese script crea:

- Esquema `ucaprec`
- Usuarios y roles
- Permisos por usuario
- Expedientes
- Imputados
- Víctimas
- Medidas y alertas
- Documentos
- Auditoría
- Catálogos
- Vistas del dashboard
- Índices

## 3. Crear usuario de conexión para el backend

Ejemplo con autenticación SQL Server:

```sql
use master;
go

create login ucaprec_app with password = 'CAMBIAR_PASSWORD_FUERTE';
go

use UCAPREC;
go

create user ucaprec_app for login ucaprec_app;
go

grant select, insert, update, delete on schema::ucaprec to ucaprec_app;
grant execute on schema::ucaprec to ucaprec_app;
go
```

Si la institución usa autenticación integrada de Windows, el equipo de infraestructura puede crear el usuario con el dominio institucional en lugar de `login` SQL.

## 4. Primeras contraseñas

El script crea usuarios semilla con `password_hash = CAMBIAR_DESDE_BACKEND`.

Esto es intencional. Las contraseñas reales deben generarse desde el backend usando bcrypt.

Después de iniciar el backend, el administrador debe resetear las contraseñas desde el módulo Usuarios y Roles, o el equipo técnico puede insertar hashes bcrypt generados por backend.

Usuarios semilla:

- `michael.custodio@pgr.gob.do`
- `supervisor.ucaprec@pgr.gob.do`
- `analista.ucaprec@pgr.gob.do`

## 5. Instalar backend

Copiar la carpeta:

```text
migracion-servidor-sqlserver/backend
```

Ejemplo en Windows Server:

```text
C:\UCAPREC\backend
```

Instalar Node.js 22 LTS y luego:

```powershell
cd C:\UCAPREC\backend
npm install --omit=dev
copy .env.example .env
```

Editar `.env`:

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

Crear carpeta:

```powershell
mkdir D:\UCAPREC\documentos
```

El usuario del servicio debe tener permisos de lectura/escritura sobre esa carpeta.

## 6. Probar backend

```powershell
npm start
```

Abrir:

```text
http://SERVIDOR:4000/api/health
```

Respuesta esperada:

```json
{ "ok": true, "service": "ucaprec-backend-sqlserver" }
```

## 7. Ejecutar backend como servicio Windows

Opción sencilla con NSSM:

```powershell
nssm install UCAPREC-Backend
```

Configurar:

- Path: `C:\Program Files\nodejs\node.exe`
- Startup directory: `C:\UCAPREC\backend`
- Arguments: `src\server.js`

Luego:

```powershell
nssm start UCAPREC-Backend
```

## 8. Publicar frontend

El frontend actual todavía habla con Supabase. Para operar 100% contra SQL Server hay que hacer una fase adicional:

1. Crear cliente API en frontend con `VITE_API_URL`.
2. Reemplazar login Supabase por `POST /api/auth/login`.
3. Reemplazar `supabase.from("expedientes")` por `/api/expedientes`.
4. Reemplazar `supabase.storage` por `/api/documentos`.
5. Reemplazar reset de contraseña por `/api/users/:id/reset-password`.
6. Reemplazar permisos por `/api/users/:id/permissions`.

Variable sugerida:

```env
VITE_API_URL=https://ucaprec.pgr.gob.do/api
```

Luego compilar:

```powershell
npm run build
```

Publicar la carpeta `dist` en IIS o Nginx.

## 9. Proxy recomendado en IIS

Si usan IIS:

- Instalar URL Rewrite.
- Instalar ARR.
- Publicar `dist` como sitio.
- Redirigir `/api/*` hacia `http://127.0.0.1:4000/api/*`.

También se puede servir el frontend con Nginx si la institución lo permite.

## 10. Pruebas antes de presentación

1. Login administrador.
2. Login supervisor.
3. Login analista.
4. Resetear contraseña desde Usuarios y Roles.
5. Crear expediente con múltiples imputados.
6. Crear expediente con múltiples víctimas.
7. Cargar PDF.
8. Vista previa PDF.
9. Descargar documento.
10. Eliminar documento con confirmación.
11. Exportar Excel.
12. Exportar PDF del Dashboard.
13. Cambiar permiso de un usuario.
14. Confirmar que el usuario ve u oculta lo permitido.
15. Revisar auditoría.

## 11. Respaldo recomendado

Base de datos:

```sql
backup database UCAPREC
to disk = 'D:\Backups\UCAPREC_FULL.bak'
with compression, init;
go
```

Documentos:

```powershell
robocopy D:\UCAPREC\documentos D:\Backups\UCAPREC_Documentos /MIR
```

## 12. Conclusión

Este paquete SQL Server es el que corresponde al entorno institucional.

El siguiente trabajo técnico es adaptar el frontend actual para consumir este backend. Hasta que eso se haga, el sistema funcional actual seguirá dependiendo de Supabase/Netlify.
