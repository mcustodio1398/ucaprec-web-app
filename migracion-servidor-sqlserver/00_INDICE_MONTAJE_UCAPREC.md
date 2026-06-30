# UCAPREC - Indice de montaje institucional

Este folder contiene el paquete para montar UCAPREC en el entorno institucional con Microsoft SQL Server.

## Archivos principales

- `sql/01_schema_ucaprec_sqlserver.sql`: crea toda la base de datos operativa en SQL Server.
- `backend/`: API Node.js/Express para conectar el sistema con SQL Server.
- `backend/.env.example`: plantilla de variables del servidor.
- `README_DESPLIEGUE_SQLSERVER_UCAPREC.md`: paso a paso completo de instalacion.
- `API_CONFIGURACION_UCAPREC.md`: mapa de endpoints, variables y configuracion de proxy.

## Orden recomendado

1. Crear base `UCAPREC` en SQL Server Management Studio.
2. Ejecutar `sql/01_schema_ucaprec_sqlserver.sql`.
3. Crear el usuario tecnico `ucaprec_app` o el usuario de dominio definido por infraestructura.
4. Copiar `backend/` al servidor interno.
5. Configurar `backend/.env`.
6. Iniciar y probar `GET /api/health`.
7. Publicar el frontend en IIS/Nginx.
8. Configurar proxy `/api/*` hacia el backend.
9. Ejecutar pruebas funcionales con administrador, supervisor y analista.

## Nota importante

La app actual de produccion sigue funcionando con Supabase/Netlify. Este paquete institucional deja lista la base y la API SQL Server para la siguiente fase: cambiar el cliente del frontend desde Supabase hacia `VITE_API_URL`.
