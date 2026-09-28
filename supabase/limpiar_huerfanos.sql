-- Archivos "huérfanos": fotos y audios que están en el Storage pero que ya
-- no figuran en ningún equipo ni en el historial (se borraron desde la app
-- o con BORRAR/CAMBIAR en el bot, subidas que se cortaron, etc.). Ocupan
-- espacio del plan gratis sin servir para nada.
--
-- Esta función los lista; el cron diario del bot de WhatsApp los borra por
-- la API de Storage (Supabase no deja borrar archivos directo por SQL).
-- Solo cuenta archivos de más de 1 día, para no tocar una subida en curso.
-- Correr una vez en el SQL Editor.

create or replace function archivos_huerfanos(p_limite int default 1000)
returns table (bucket text, nombre text, bytes bigint)
language sql security definer set search_path = public, storage as $$
  with usadas as (
    select unnest(photos) as url from public.equipment_state
    union select unnest(photos) from public.equipment_history
    union select a->>'url' from public.equipment_state, jsonb_array_elements(audios) a
    union select a->>'url' from public.equipment_history, jsonb_array_elements(audios) a
  ),
  rutas as (
    select substring(url from '/object/public/(.*)$') as ruta from usadas where url is not null
  )
  select o.bucket_id, o.name, coalesce((o.metadata->>'size')::bigint, 0)
  from storage.objects o
  where o.bucket_id in ('photos', 'audios')
    and o.created_at < now() - interval '1 day'
    and not exists (select 1 from rutas r where r.ruta = o.bucket_id || '/' || o.name)
    -- Traba de seguridad: si ninguna URL guardada coincide con ningún
    -- archivo (formato distinto), no devuelve nada en vez de dar TODO por
    -- huérfano.
    and exists (select 1 from rutas r join storage.objects o2 on r.ruta = o2.bucket_id || '/' || o2.name)
  order by 3 desc
  limit p_limite;
$$;

grant execute on function archivos_huerfanos(int) to anon, authenticated;

-- Diagnóstico: cuánto ocupa cada bucket y cuánto se puede liberar.
select bucket_id as bucket, count(*) as archivos,
       pg_size_pretty(sum((metadata->>'size')::bigint)) as ocupa
from storage.objects group by 1;

select count(*) as huerfanos, pg_size_pretty(sum(bytes)) as se_liberan
from archivos_huerfanos(100000);
