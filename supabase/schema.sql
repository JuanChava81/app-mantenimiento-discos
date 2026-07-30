-- Esquema inicial: app de control de mantenimiento (Disco / Devoto)
-- Correr esto una sola vez en el SQL Editor de Supabase (Project > SQL Editor > New query).

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  chain text not null,            -- 'Disco' | 'Devoto'
  number int not null,
  name text not null,
  address text
);

create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  category text not null,         -- ac | gas | ups | gen | panel
  subtype text,                   -- Split | Rooftop | Chiller | Manejadora | ...
  code text not null,             -- AC-014
  number int,
  active boolean default true
);

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  visit_date date not null,
  technician_id uuid,
  status text default 'en_progreso',
  created_at timestamptz default now()
);

create table if not exists inspections (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  status text default 'pendiente', -- ok | falla | pendiente
  comment text,
  updated_at timestamptz default now()
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz default now()
);

-- Row Level Security: por ahora dejamos lectura pública (sin login todavía,
-- eso es la etapa 4 de GUIA_PASO_A_PASO.md). Cuando se agregue login, esto
-- se reemplaza por políticas atadas al usuario autenticado.
alter table locations enable row level security;
alter table equipment enable row level security;
alter table visits enable row level security;
alter table inspections enable row level security;
alter table photos enable row level security;

create policy "Lectura pública de locations" on locations for select using (true);
create policy "Lectura pública de equipment" on equipment for select using (true);
create policy "Lectura pública de visits" on visits for select using (true);
create policy "Lectura pública de inspections" on inspections for select using (true);
create policy "Lectura pública de photos" on photos for select using (true);

-- Seed: los 40 locales fijos (20 Disco + 20 Devoto).
insert into locations (chain, number, name, address) values
('Disco', 1, 'Disco Pocitos', 'Av. 18 de Julio 1000, Pocitos'),
('Disco', 2, 'Disco Carrasco', 'Bulevar Artigas 1137, Punta Carretas'),
('Disco', 3, 'Disco Malvín', 'Av. Italia 1274, Buceo'),
('Disco', 4, 'Disco Punta Carretas', 'Av. Rivera 1411, Ciudad Vieja'),
('Disco', 5, 'Disco Cordón', 'Av. Brasil 1548, Malvín'),
('Disco', 6, 'Disco Centro', 'Bulevar España 1685, Centro'),
('Disco', 7, 'Disco Buceo', 'Av. Millán 1822, Tres Cruces'),
('Disco', 8, 'Disco La Blanqueada', 'Camino Maldonado 1959, Carrasco'),
('Disco', 9, 'Disco Tres Cruces', 'Av. de las Instrucciones 2096, Cordón'),
('Disco', 10, 'Disco Ciudad Vieja', 'Av. Giannattasio 2233, La Blanqueada'),
('Disco', 11, 'Disco Pocitos', 'Av. 18 de Julio 2370, Pocitos'),
('Disco', 12, 'Disco Carrasco', 'Bulevar Artigas 2507, Punta Carretas'),
('Disco', 13, 'Disco Malvín', 'Av. Italia 2644, Buceo'),
('Disco', 14, 'Disco Punta Carretas', 'Av. Rivera 2781, Ciudad Vieja'),
('Disco', 15, 'Disco Cordón', 'Av. Brasil 2918, Malvín'),
('Disco', 16, 'Disco Centro', 'Bulevar España 3055, Centro'),
('Disco', 17, 'Disco Buceo', 'Av. Millán 3192, Tres Cruces'),
('Disco', 18, 'Disco La Blanqueada', 'Camino Maldonado 3329, Carrasco'),
('Disco', 19, 'Disco Tres Cruces', 'Av. de las Instrucciones 3466, Cordón'),
('Disco', 20, 'Disco Ciudad Vieja', 'Av. Giannattasio 3603, La Blanqueada'),
('Devoto', 1, 'Devoto Pocitos', 'Av. 18 de Julio 3740, Pocitos'),
('Devoto', 2, 'Devoto Carrasco', 'Bulevar Artigas 3877, Punta Carretas'),
('Devoto', 3, 'Devoto Malvín', 'Av. Italia 4014, Buceo'),
('Devoto', 4, 'Devoto Punta Carretas', 'Av. Rivera 4151, Ciudad Vieja'),
('Devoto', 5, 'Devoto Cordón', 'Av. Brasil 4288, Malvín'),
('Devoto', 6, 'Devoto Centro', 'Bulevar España 4425, Centro'),
('Devoto', 7, 'Devoto Buceo', 'Av. Millán 4562, Tres Cruces'),
('Devoto', 8, 'Devoto La Blanqueada', 'Camino Maldonado 4699, Carrasco'),
('Devoto', 9, 'Devoto Tres Cruces', 'Av. de las Instrucciones 4836, Cordón'),
('Devoto', 10, 'Devoto Ciudad Vieja', 'Av. Giannattasio 4973, La Blanqueada'),
('Devoto', 11, 'Devoto Pocitos', 'Av. 18 de Julio 5110, Pocitos'),
('Devoto', 12, 'Devoto Carrasco', 'Bulevar Artigas 5247, Punta Carretas'),
('Devoto', 13, 'Devoto Malvín', 'Av. Italia 5384, Buceo'),
('Devoto', 14, 'Devoto Punta Carretas', 'Av. Rivera 5521, Ciudad Vieja'),
('Devoto', 15, 'Devoto Cordón', 'Av. Brasil 5658, Malvín'),
('Devoto', 16, 'Devoto Centro', 'Bulevar España 5795, Centro'),
('Devoto', 17, 'Devoto Buceo', 'Av. Millán 5932, Tres Cruces'),
('Devoto', 18, 'Devoto La Blanqueada', 'Camino Maldonado 6069, Carrasco'),
('Devoto', 19, 'Devoto Tres Cruces', 'Av. de las Instrucciones 6206, Cordón'),
('Devoto', 20, 'Devoto Ciudad Vieja', 'Av. Giannattasio 6343, La Blanqueada');
