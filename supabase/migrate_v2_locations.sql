-- Migración: pasar de las 40 sucursales de ejemplo a las 52 sucursales reales
-- con código de sucursal y meses de visita.
-- Correr una sola vez en el SQL Editor de Supabase si ya corriste schema.sql
-- (versión vieja, sin `suc` ni `months`).

alter table locations add column if not exists suc text;
alter table locations add column if not exists months int[] not null default '{}';

-- Borra los 40 locales de ejemplo (todavía no hay visitas/equipos reales
-- guardados en la base, así que esto es seguro).
delete from locations;

alter table locations drop column if exists number;
alter table locations alter column suc set not null;

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

-- equipment/visits/inspections: agregamos las columnas nuevas que necesita
-- el modelo de checks/mediciones y notas de voz (no rompe nada existente).
alter table inspections add column if not exists checks jsonb default '{}';
alter table inspections add column if not exists fields jsonb default '{}';

create table if not exists audios (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  storage_path text not null,
  duration_secs numeric,
  recorded_at timestamptz default now()
);
alter table audios enable row level security;
create policy if not exists "Lectura pública de audios" on audios for select using (true);
