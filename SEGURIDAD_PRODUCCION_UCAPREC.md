# Seguridad de Produccion UCAPREC

## Estado actual

La aplicacion ya puede conectarse a Supabase y operar datos, pero todavia no debe considerarse lista para datos sensibles en produccion institucional hasta completar estos controles.

## Riesgos criticos detectados

1. Login temporal en frontend
- Existen usuarios y contrasenas temporales dentro de `src/app/App.tsx`.
- Esto sirve para demo/MVP, pero no cumple un estandar de seguridad para datos sensibles.
- Accion requerida: migrar a Supabase Auth o proveedor institucional SSO.

2. Politicas RLS abiertas para `anon`
- Los scripts actuales permiten operaciones a `anon` para desbloquear pruebas.
- Esto no es aceptable para produccion con datos personales o judiciales.
- Accion requerida: revocar permisos a `anon` y permitir acceso solo a `authenticated`.

3. Roles solo controlados en frontend
- La interfaz oculta modulos segun rol, pero el backend debe validar tambien.
- Accion requerida: guardar el rol en Supabase Auth `app_metadata.role` y aplicar politicas RLS por rol.

4. Password reset visual
- El boton "Recuperar acceso" registra una solicitud visual, pero no ejecuta un flujo real de restablecimiento.
- Accion requerida: usar `supabase.auth.resetPasswordForEmail` o proceso institucional.

5. Auditoria incompleta
- La tabla `auditoria` existe, pero no todos los CRUD escriben eventos.
- Accion requerida: registrar alta, edicion, eliminacion, login, logout, exportacion y carga/descarga documental.

## Controles minimos antes de publicar con datos reales

- Quitar credenciales temporales del frontend.
- Usar Supabase Auth para login.
- Requerir MFA para administradores.
- Revocar permisos `insert/update/delete/select` a `anon`.
- Mantener RLS activo en todas las tablas.
- Aplicar politicas por rol en backend.
- Configurar variables de entorno solo en Netlify, nunca en codigo.
- No exponer `service_role` en frontend.
- Activar HTTPS, que Netlify ya provee por defecto.
- Revisar CORS/dominios permitidos del proyecto Supabase.
- Crear respaldos antes de cambios masivos o despliegues.
- Probar con usuario Administrador, Supervisor y Analista.

## Reglas de rol recomendadas

- Administrador:
  - Acceso total.
  - Puede crear, editar, eliminar, administrar usuarios, catalogos y auditoria.
- Supervisor:
  - Puede ver todo, crear/editar expedientes, imputados, victimas, medidas, documentos y reportes.
  - No debe eliminar registros criticos ni administrar usuarios.
- Analista:
  - Puede ver y crear/editar operaciones asignadas.
  - No debe eliminar expedientes ni administrar usuarios, roles, auditoria o catalogos.

## Archivos relacionados

- `supabase_hardening_produccion.sql`: politicas de seguridad recomendadas para produccion con Supabase Auth.
- `supabase_incremental_relaciones.sql`: politicas permisivas temporales para que el MVP funcione hoy.

## Recomendacion de uso

No ejecutes `supabase_hardening_produccion.sql` hasta que el login este migrado a Supabase Auth. Si lo ejecutas ahora, el login temporal del frontend dejara de tener permisos suficientes porque no crea una sesion `authenticated` real.
