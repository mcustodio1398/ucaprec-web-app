# Checklist de Producción UCAPREC

## Antes de publicar

- Confirmar que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configuradas en Netlify.
- Si se decide reconstruir Supabase, ejecutar `supabase_reset_schema_ucaprec.sql` desde Supabase SQL Editor.
- Si ya se ejecutó el reset inicial, ejecutar `supabase_incremental_relaciones.txt` para habilitar insert/update/delete en módulos operativos.
- Para datos reales sensibles, NO usar las políticas abiertas a `anon` como estado final.
- Antes de publicar con datos reales, migrar login a Supabase Auth y luego ejecutar `supabase_hardening_produccion.sql`.
- Confirmar en Supabase Project Settings > API que la Project URL y Publishable key coinciden con `.env.local` y Netlify.
- Confirmar que Supabase permite lectura para las vistas/tablas usadas por el frontend:
  - `vw_dashboard_kpis`
  - `expedientes`
  - `imputados`
  - `victimas`
  - `medidas_alertas_expediente`
  - `documentos`
  - `usuarios`
  - `auditoria`
- Ejecutar `npm run build` fuera del sandbox de Codex o directamente en Netlify.
- Verificar que la app abre en modo limpio: sin expedientes, imputados, usuarios, auditoría, notificaciones o gráficas ficticias.

## Prueba funcional rápida

- Login: entrar con `michael.custodio@pgr.gob.do` o `michael.custodio` y contraseña temporal `12345`.
- Login: entrar con `analista.ucaprec` y validar que no vea administración.
- Login: entrar con `supervisor.ucaprec` y validar que no vea administración.
- Login: validar mensaje de error con credenciales incorrectas.
- Seguridad: confirmar que no exista `service_role` en frontend ni en Netlify como variable expuesta `VITE_`.
- Seguridad: confirmar que el SQL de producción revoca permisos a `anon` cuando Supabase Auth esté activo.
- Login: probar mostrar/ocultar contraseña, recordar sesión y cerrar sesión.
- Dashboard: KPIs cargan desde `vw_dashboard_kpis` o muestran cero si no hay datos.
- Expedientes: listado, filtros, exportación e impresión.
- Imputados: listado y selección de expediente.
- Víctimas: listado, filtros y registro visual.
- Medidas y alertas: listado, filtros y registro visual.
- Documentos: listado, filtros y modal de carga.
- Documentos: al subir, buscar expediente por número, sentencia, imputado o delito.
- Expedientes: borrar un expediente y confirmar que no reaparece al recargar.
- Dashboard: aplicar filtros con rango de fecha y confirmar que los indicadores/exportación Excel cambian.
- Usuarios: listado desde Supabase y acciones visuales.
- Auditoría: listado desde Supabase y exportación Excel.
- Reportes: generar reporte completo de expedientes y exportar Excel.
- Navegación: sidebar, topbar, breadcrumbs, modo oscuro y retorno entre vistas.

## Recomendaciones para garantizar funcionamiento hoy

- Publicar una versión MVP estable con lectura real de Supabase y estados vacíos limpios.
- Posponer autenticación avanzada y permisos finos si bloquean la publicación del día; el CRUD operativo principal ya debe quedar persistente con el SQL incremental.
- Si se publicará con datos reales, no posponer autenticación real ni RLS por rol.
- No cargar datos ficticios en producción; usar datos reales mínimos o tablas vacías.
- Validar políticas RLS tabla por tabla: si una pantalla queda vacía inesperadamente, revisar permisos antes de tocar UI.
- Si aparece error 401 desde Supabase, revisar llave pública y aplicar las políticas temporales de `supabase_policies_ucaprec.sql` solo para pruebas.
- Hacer una prueba en Netlify con cache limpio y navegador incógnito antes de enviar el enlace final.
