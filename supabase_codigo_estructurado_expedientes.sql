-- UCAPREC - ID estructurado institucional para expedientes.
-- Formato profesional: UC-EXP-AAAAMMDD-SECUENCIA-NO-SENTENCIA-O-RESOLUCION
-- Ejemplo: UC-EXP-20260630-000001-SRES-00400
--
-- La secuencia se genera en la base de datos para evitar colisiones cuando
-- varios analistas registran expedientes al mismo tiempo.

alter table public.expedientes
add column if not exists codigo_estructurado text;

create sequence if not exists public.ucaprec_expediente_codigo_seq
as bigint
start with 1
increment by 1
no minvalue
no maxvalue
cache 1;

create or replace function public.ucaprec_normalize_codigo_segment(value text)
returns text
language sql
immutable
as $$
  select upper(
    trim(
      both '-' from regexp_replace(
        regexp_replace(coalesce(value, 'SIN-RESOLUCION'), '[^[:alnum:]]+', '-', 'g'),
        '-+', '-', 'g'
      )
    )
  );
$$;

create or replace function public.ucaprec_set_codigo_estructurado()
returns trigger
language plpgsql
as $$
declare
  reference_value text;
begin
  if new.codigo_estructurado is null or btrim(new.codigo_estructurado) = '' then
    reference_value := public.ucaprec_normalize_codigo_segment(coalesce(new.numero_sentencia, new.numero_expediente));
    new.codigo_estructurado :=
      'UC-EXP-' ||
      to_char(coalesce(new.created_at, now()), 'YYYYMMDD') ||
      '-' ||
      lpad(nextval('public.ucaprec_expediente_codigo_seq')::text, 6, '0') ||
      '-' ||
      reference_value;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ucaprec_codigo_estructurado on public.expedientes;
create trigger trg_ucaprec_codigo_estructurado
before insert on public.expedientes
for each row
execute function public.ucaprec_set_codigo_estructurado();

create unique index if not exists idx_expedientes_codigo_estructurado
on public.expedientes (codigo_estructurado)
where codigo_estructurado is not null and codigo_estructurado <> '';
