-- UCAPREC - Regla de unicidad para documentos por expediente
-- Ejecutar cuando no existan documentos duplicados con el mismo numero_expediente + nombre_archivo.
-- Primero puedes revisar duplicados con este SELECT:
--
-- select numero_expediente, lower(nombre_archivo) as nombre_normalizado, count(*) as total
-- from public.documentos
-- group by numero_expediente, lower(nombre_archivo)
-- having count(*) > 1;
--
-- Si el SELECT no devuelve filas, puedes crear el indice unico:

create unique index if not exists uq_documentos_expediente_nombre
on public.documentos (numero_expediente, lower(nombre_archivo));
