-- Migración v4: tabla mínima para el keepalive de Supabase.
-- Correr una sola vez en el SQL Editor de Supabase (Project > SQL Editor > New query).
--
-- El plan gratis de Supabase pausa el proyecto después de ~7 días sin
-- actividad. El cron semanal (api/cron/keepalive-supabase.js, en el repo
-- wpp-mantenimiento) hacía solo una lectura (select) para evitarlo, pero
-- igual se pausó — así que ahora, además de correr todos los días en vez
-- de una vez por semana, hace una escritura real acá (un upsert), que no
-- deja ninguna duda de que cuenta como actividad.

create table if not exists _keepalive (
  id int primary key default 1,
  pinged_at timestamptz not null default now()
);

alter table _keepalive enable row level security;

create policy "Keepalive escribible" on _keepalive for all using (true) with check (true);

insert into _keepalive (id, pinged_at) values (1, now())
on conflict (id) do update set pinged_at = excluded.pinged_at;
