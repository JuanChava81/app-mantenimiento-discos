-- Migración v8: una visita nueva por local, fecha de visita e historial.
-- Correr una sola vez en el SQL Editor de Supabase. Incluye todo lo de la
-- v7 (marcar Completo al exportar + calendario completo): si ya la
-- corriste, no pasa nada, vuelve a dejar lo mismo.
--
-- Qué hace:
--  - Cada equipo recuerda de qué visita (período "AAAA-MM") son sus fotos
--    y su comentario. Cuando al local le toca el mes de visita siguiente,
--    el bot de WhatsApp archiva la visita anterior en equipment_history y
--    deja el equipo limpio (sin fotos, estado Pendiente); el comentario
--    viejo se sigue viendo hasta que se cargue uno nuevo.
--  - locations.visit_date: fecha real de la visita (la anota el bot al
--    abrir la sucursal), usada por el export y el informe de la app.

-- ---- v7 ----
alter table locations add column if not exists exported_at timestamptz;
drop policy if exists "Marcar locations como exportadas" on locations;
create policy "Marcar locations como exportadas" on locations for update using (true) with check (true);

-- ---- v8 ----
alter table locations add column if not exists visit_date date;
alter table equipment_state add column if not exists visit_period text;
alter table equipment_state add column if not exists comment_period text;

create table if not exists equipment_history (
  id uuid primary key default gen_random_uuid(),
  equipment_id text not null,
  location_id uuid references locations(id) on delete cascade,
  period text not null,             -- visita archivada, ej. '2026-09'
  status text,
  comment text,
  checks jsonb,
  fields jsonb,
  photos text[] not null default '{}',
  audios jsonb not null default '[]',
  files_deleted boolean not null default false,  -- fotos/audios ya borrados del Storage
  archived_at timestamptz not null default now()
);
create index if not exists equipment_history_equipment_idx on equipment_history (equipment_id);

alter table equipment_history enable row level security;
drop policy if exists "Historial público" on equipment_history;
create policy "Historial público" on equipment_history for all using (true) with check (true);

-- Cuando cambia el comentario de un equipo (desde la app o el bot), queda
-- marcado como de la visita actual.
create or replace function marcar_periodo_comentario() returns trigger language plpgsql as $$
begin
  if new.comment is distinct from old.comment then
    new.comment_period := new.visit_period;
  end if;
  return new;
end;
$$;
drop trigger if exists marcar_periodo_comentario on equipment_state;
create trigger marcar_periodo_comentario before update on equipment_state
  for each row execute function marcar_periodo_comentario();

-- ---- Calendario de visitas (igual que v6/v7) ----
update locations set months = '{6,12}' where suc = 'D 01';
update locations set months = '{3,9}' where suc = 'D 02';
update locations set months = '{1,7}' where suc = 'D 03';
update locations set months = '{2,8}' where suc = 'D 04';
update locations set months = '{5,12}' where suc = 'D 05';
update locations set months = '{3,9}' where suc = 'D 06';
update locations set months = '{3,9}' where suc = 'D 07';
update locations set months = '{4,11}' where suc = 'D 08';
update locations set months = '{5,10}' where suc = 'D 09';
update locations set months = '{3,9}' where suc = 'D 10';
update locations set months = '{4,10}' where suc = 'D 11';
update locations set months = '{1,7}' where suc = 'D 12';
update locations set months = '{5,11}' where suc = 'D 13';
update locations set months = '{5,12}' where suc = 'D 14';
update locations set months = '{4,10}' where suc = 'D 15';
update locations set months = '{5,11}' where suc = 'D 16';
update locations set months = '{6,12}' where suc = 'D 17';
update locations set months = '{2,8}' where suc = 'D 18';
update locations set months = '{1,8}' where suc = 'D 19';
update locations set months = '{3,9}' where suc = 'D 20';
update locations set months = '{1,7}' where suc = 'D 21';
update locations set months = '{1,7}' where suc = 'D 22';
update locations set months = '{2,9}' where suc = 'D 23';
update locations set months = '{3,9}' where suc = 'D 24';
update locations set months = '{4,10}' where suc = 'D 25';
update locations set months = '{5,11}' where suc = 'D 26';
update locations set months = '{4,10}' where suc = 'D 27';
update locations set months = '{2,9}' where suc = 'D 28';
update locations set months = '{5,11}' where suc = 'DV 01';
update locations set months = '{6,12}' where suc = 'DV 02';
update locations set months = '{1,7}' where suc = 'DV 03';
update locations set months = '{2,8}' where suc = 'DV 04';
update locations set months = '{3,8}' where suc = 'DV 05';
update locations set months = '{6,12}' where suc = 'DV 06';
update locations set months = '{6,11}' where suc = 'DV 07';
update locations set months = '{6,12}' where suc = 'DV 08';
update locations set months = '{4,11}' where suc = 'DV 09';
update locations set months = '{1,7}' where suc = 'DV 10';
update locations set months = '{3,10}' where suc = 'DV 11';
update locations set months = '{4,10}' where suc = 'DV 12';
update locations set months = '{1,12}' where suc = 'DV 13';
update locations set months = '{4,11}' where suc = 'DV 14';
update locations set months = '{2,8}' where suc = 'DV 15';
update locations set months = '{5,10}' where suc = 'DV 16';
update locations set months = '{2,8}' where suc = 'DV 18';
update locations set months = '{7,10}' where suc = 'DV 19';
update locations set months = '{6,11}' where suc = 'DV 20';
update locations set months = '{6,12}' where suc = 'DV 21';
update locations set months = '{2,8}' where suc = 'DV 22';
update locations set months = '{3,9}' where suc = 'DV 23';
update locations set months = '{1,7}' where suc = 'DV 24';
update locations set months = '{2,8}' where suc = 'DV 25';
