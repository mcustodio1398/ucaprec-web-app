# UCAPREC - Estructura del proyecto

## Aplicacion actual

- `src/`: codigo principal React/TypeScript.
- `src/app/App.tsx`: interfaz y logica funcional principal.
- `src/data/catalogs.ts`: catalogos operativos.
- `dist/`: compilacion generada por `npm run build`.

## Despliegue actual Netlify/Supabase

- `netlify/`: funciones serverless usadas por Netlify.
- `netlify.toml`: configuracion de build y redirects.
- `.env.example`: variables requeridas para frontend.
- `supabase_*.sql`: scripts de soporte para Supabase.

## Despliegue institucional SQL Server

- `migracion-servidor-sqlserver/`: paquete recomendado para servidor institucional.
- `migracion-servidor-sqlserver/sql/01_schema_ucaprec_sqlserver.sql`: esquema completo SQL Server.
- `migracion-servidor-sqlserver/backend/`: API Node.js/Express para SQL Server.
- `migracion-servidor-sqlserver/00_INDICE_MONTAJE_UCAPREC.md`: orden de montaje.
- `migracion-servidor-sqlserver/API_CONFIGURACION_UCAPREC.md`: endpoints y variables de API.
- `migracion-servidor-sqlserver/README_DESPLIEGUE_SQLSERVER_UCAPREC.md`: instrucciones extendidas.

## Documentacion operativa

- `CHECKLIST_PRODUCCION.md`: validaciones antes de presentar o publicar.
- `SEGURIDAD_PRODUCCION_UCAPREC.md`: recomendaciones de seguridad.
- `VENTANA_CONTEXTO_ACTUAL_UCAPREC.txt`: contexto historico del trabajo.
- `contexto_ucaprec.txt`: contexto auxiliar.

## Referencia tecnica

- `migracion-servidor-institucional/`: paquete anterior basado en PostgreSQL. Para produccion institucional con SQL Server, usar `migracion-servidor-sqlserver/`.

## Nota

No mover `src/`, `netlify/`, `package.json`, `vite.config.ts`, `index.html` ni `netlify.toml` sin ajustar la configuracion de build, porque Netlify depende de esas rutas.
