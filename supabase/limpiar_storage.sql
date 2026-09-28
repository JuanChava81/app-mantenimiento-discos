-- Lista los archivos del Storage (fotos y audios) para que el cron diario
-- del bot de WhatsApp (limpiarStorage en lib/visitas.js) decida cuáles
-- borrar: lo subido antes del 01/09/2026, lo de meses anteriores de locales
-- ya exportados (desde el día 10 de cada mes) y lo que no usa ningún
-- equipo. Supabase no deja borrar archivos directo por SQL; el bot los
-- borra por la API de Storage.
-- Correr una vez en el SQL Editor.

create or replace function archivos_storage(p_desde int default 0, p_cant int default 1000)
returns table (bucket text, nombre text, creado timestamptz, bytes bigint)
language sql security definer set search_path = public, storage as $$
  select bucket_id, name, created_at, coalesce((metadata->>'size')::bigint, 0)
  from storage.objects
  where bucket_id in ('photos', 'audios')
  order by bucket_id, name
  offset p_desde limit p_cant;
$$;

grant execute on function archivos_storage(int, int) to anon, authenticated;

-- Cuánto ocupa hoy cada bucket.
select bucket_id as bucket, count(*) as archivos,
       pg_size_pretty(sum((metadata->>'size')::bigint)) as ocupa
from storage.objects group by 1;
