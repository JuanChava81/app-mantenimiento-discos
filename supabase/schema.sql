-- Esquema: app de control de mantenimiento (Disco / Devoto)
-- Correr esto una sola vez en el SQL Editor de Supabase (Project > SQL Editor > New query)
-- para un proyecto nuevo. Si ya corriste una version anterior de este archivo:
--  - con las 40 sucursales de ejemplo: usá supabase/migrate_v2_locations.sql
--  - con el modelo equipment/visits/inspections viejo: usá supabase/migrate_v3_equipment_state.sql

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  suc text not null,              -- código de sucursal, ej. 'D 03' | 'DV 24'
  chain text not null,            -- 'Disco' | 'Devoto'
  name text not null,
  address text,
  months int[] not null default '{}'  -- meses de visita planificados (1-12)
);

-- Un registro por equipo con su estado actual (fotos, audio, checklist,
-- mediciones). El historial de visitas anteriores queda para una etapa
-- futura; por ahora esto es lo que hace que todos los dispositivos vean
-- lo mismo.
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

-- Row Level Security: por ahora dejamos lectura y escritura públicas (sin
-- login todavía, eso es la etapa "Usuarios" de GUIA_PASO_A_PASO.md). Cuando
-- se agregue login, esto se reemplaza por políticas atadas al técnico
-- autenticado.
alter table locations enable row level security;
alter table equipment_state enable row level security;

create policy "Lectura pública de locations" on locations for select using (true);
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

-- Seed: las 52 sucursales reales (28 Disco + 24 Devoto).
-- OJO: los meses de todos los locales salvo Julio salen de la grilla "Plan con
-- formato" del Excel original y todavía no están validados con el usuario
-- (ver design_handoff_app_mantenimiento/README.md). Julio sí está confirmado.
insert into locations (suc, chain, name, address, months) values
('D 01', 'Disco', 'Scoseria', 'Scosería 2628', '{1}'),
('D 02', 'Disco', 'Agraciada', 'Av. Agraciada 2986', '{1,4}'),
('D 03', 'Disco', 'Arenal Grande', 'Arenal Grande 1376', '{1,2,7}'),
('D 04', 'Disco', 'Legrand', 'Av. Legrand 5085', '{1,3}'),
('D 05', 'Disco', 'Parada 5', 'Pedragosa Sierra y Av. Italia, Punta del Este', '{1,6}'),
('D 06', 'Disco', 'Fernandez Crespo', 'Av. Daniel Fernandez Crespo 1727', '{1,4}'),
('D 07', 'Disco', 'Soca', 'Av. Dr. Francisco Soca 1318', '{1,4}'),
('D 08', 'Disco', 'Roosevelt', 'Av. Roosevelt y Zelmar Michellini s/n, Maldonado', '{1,5}'),
('D 09', 'Disco', 'Pta Carretas', 'Ellauri 350, local 002. Shopping Punta Carretas', '{1,6}'),
('D 10', 'Disco', 'Camino Maldonado', 'Brig. Gral. Lavalleja 7722, Maldonado', '{1,4}'),
('D 11', 'Disco', '8 de Octubre y Garibaldi', '8 de Octubre 2681', '{1,5}'),
('D 12', 'Disco', 'Curva De Maroñas', '8 de Octubre 4786', '{1,2,7}'),
('D 13', 'Disco', 'Chucarro', 'Chucarro 1320', '{1,6}'),
('D 14', 'Disco', 'De La Punta', 'Calle 17, entre Gorlero y 24, Punta del Este', '{1,6}'),
('D 15', 'Disco', 'Marcelino Sosa', 'Marcelino Sosa 2706', '{1,5}'),
('D 16', 'Disco', 'Ayacucho', 'Ayacucho 3370', '{1,6}'),
('D 17', 'Disco', 'Calle Maldonado', 'Maldonado 1024', '{1}'),
('D 18', 'Disco', 'Solymar', 'Av. Giannattasio Km. 23.500, Solymar', '{1,3}'),
('D 19', 'Disco', 'Atlantida', 'Calle Gral. Artigas s/n, entre 22 y 24, Atlántida', '{1,2}'),
('D 20', 'Disco', '20 De Setiembre', '20 de setiembre 1521', '{1,4}'),
('D 21', 'Disco', 'Ejido', 'Ejido 1530', '{1,2,7}'),
('D 22', 'Disco', 'Barrios Amorin', 'Barrios Amorín 859', '{1,2,7}'),
('D 23', 'Disco', 'Medanos', 'Av. Giannattasio km 27.500 y Av. Central, Médanos', '{1,3}'),
('D 24', 'Disco', 'Obligado', 'Obligado 968', '{1,4}'),
('D 25', 'Disco', 'Solano Lopez', 'Francisco Solano López 1680', '{1,5}'),
('D 26', 'Disco', 'Canelones', 'Florencio Sanchez 729, Canelones', '{1,6}'),
('D 27', 'Disco', 'Avda Italia', 'Magariños Cervantes 2052', '{1,5}'),
('D 28', 'Disco', 'La Cabaña', 'Naciones Unidas y Rambla, El Pinar', '{1,3}'),
('DV 01', 'Devoto', 'Malvin', 'H. Irigoyen 1444', '{1,6}'),
('DV 02', 'Devoto', 'Punta Gorda', 'Gral. Paz 1404', '{1}'),
('DV 03', 'Devoto', 'Brisas', 'Rivera 4502', '{1,2,7}'),
('DV 04', 'Devoto', 'Carrasco', 'Bolivia 1413', '{1,3}'),
('DV 05', 'Devoto', 'Shangrila', 'Av. Calcagno s/n, Shangrilá', '{1,4}'),
('DV 06', 'Devoto', 'Santa Mónica', 'Av. Italia 6958 esq. Sta. Mónica', '{1}'),
('DV 07', 'Devoto', 'Colón', 'Av. Garzón 1945', '{1}'),
('DV 08', 'Devoto', 'San Martín I', 'San Martín 3709', '{1}'),
('DV 09', 'Devoto', 'Punta del Este', 'Av. Roosevelt y Parada 10, Punta del Este', '{1,5}'),
('DV 10', 'Devoto', 'Portones', 'Av. Italia 5779', '{1,2,7}'),
('DV 11', 'Devoto', 'Sayago', 'Cno. Ariel 4626', '{1,4}'),
('DV 12', 'Devoto', 'Pando', 'Ruta 8 km 30.800, Pando', '{1,5}'),
('DV 13', 'Devoto', 'Piriapolis Rambla', 'Rbla. de los Argentinos y Vázquez, Piriápolis', '{1,2}'),
('DV 14', 'Devoto', 'Hiperpiria', 'Av. Piria y Bs. As., Piriápolis', '{1,5}'),
('DV 15', 'Devoto', 'Agraciada', 'Agraciada y Fco. Gómez', '{1,3}'),
('DV 16', 'Devoto', 'San Martín II', 'Av. Gral. San Martín 3083', '{1,6}'),
('DV 18', 'Devoto', 'Las Piedras I', 'Juan A. Lavalleja 671', '{1,3}'),
('DV 19', 'Devoto', 'Prado - Suárez', 'Joaquín Suarez 3458', '{1,7,8}'),
('DV 20', 'Devoto', 'Arenal Grande', 'Arenal Grande 2006', '{1}'),
('DV 21', 'Devoto', '8 de Octubre', '8 de Octubre 3621', '{1}'),
('DV 22', 'Devoto', '26 de Marzo', '26 de Marzo esq. Lorenzo Pérez', '{1,3}'),
('DV 23', 'Devoto', 'Coronel Mora', 'Coronel Mora y Agr. Francisco Ros', '{1,4}'),
('DV 24', 'Devoto', 'San Quintín', 'Av. San Quintín 4376', '{1,2,7}'),
('DV 25', 'Devoto', 'Las Piedras II', 'Av. Dr. Pouey 622', '{1,3}');
