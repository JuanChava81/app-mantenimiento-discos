-- Migración: guardar el estado real de los equipos (fotos, audio,
-- checklist, mediciones, estado) para que se vea igual en todos los
-- dispositivos, en vez de vivir solo en la memoria del navegador.
-- Correr una sola vez en el SQL Editor de Supabase.

-- Las tablas equipment/visits/inspections/photos/audios de una migración
-- anterior nunca llegaron a usarse (el modelo completo con visitas e
-- historial queda para más adelante). Las reemplazamos por una tabla
-- más simple que sí conecta la app: un registro por equipo con su
-- estado actual.
drop table if exists photos cascade;
drop table if exists audios cascade;
drop table if exists inspections cascade;
drop table if exists visits cascade;
drop table if exists equipment cascade;

create table if not exists equipment_state (
  id text primary key,               -- mismo id que usa la app, ej. "<location_uuid>-ac-1"
  location_id uuid references locations(id) on delete cascade,
  category text not null,            -- ac | gas | ups | gen | sub
  subtype text,
  number int not null,
  code text not null,                -- AC-001
  active boolean not null default true,
  status text not null default 'pendiente',  -- ok | falla | pendiente
  comment text not null default '',
  checks jsonb not null default '{}',
  fields jsonb not null default '{}',
  photos text[] not null default '{}',       -- URLs públicas del bucket "photos"
  audios jsonb not null default '[]',        -- [{id, url, durationSecs, recordedAt}]
  updated_at timestamptz not null default now()
);

alter table equipment_state enable row level security;

-- Sin login todavía (eso es la etapa "Usuarios" de la guía), así que
-- dejamos lectura y escritura abiertas. Cuando se agregue login, esto se
-- reemplaza por políticas atadas al técnico autenticado.
create policy "Lectura pública de equipment_state" on equipment_state for select using (true);
create policy "Escritura pública de equipment_state" on equipment_state for insert with check (true);
create policy "Actualización pública de equipment_state" on equipment_state for update using (true) with check (true);

-- Buckets de Storage para fotos y notas de voz, públicos para lectura.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('audios', 'audios', true)
on conflict (id) do nothing;

create policy "Lectura pública de fotos" on storage.objects for select using (bucket_id = 'photos');
create policy "Subida pública de fotos" on storage.objects for insert with check (bucket_id = 'photos');
create policy "Borrado público de fotos" on storage.objects for delete using (bucket_id = 'photos');

create policy "Lectura pública de audios" on storage.objects for select using (bucket_id = 'audios');
create policy "Subida pública de audios" on storage.objects for insert with check (bucket_id = 'audios');
create policy "Borrado público de audios" on storage.objects for delete using (bucket_id = 'audios');
