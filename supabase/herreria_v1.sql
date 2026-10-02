-- Herrería v1: tablas, función y bucket propios, separados de mantenimiento.
-- Correr una sola vez en Supabase > SQL Editor. No toca locations, equipment_state,
-- equipment_history ni los buckets photos/audios. Se puede volver a correr sin romper nada.

create table if not exists herreria_sitios (
  id uuid primary key default gen_random_uuid(),
  cod text not null unique,        -- 'D28', 'DV23', 'CD80', 'G01' (como en la planilla de Seguimiento)
  nombre text not null,            -- para mostrar en la app y en la lista de WhatsApp
  rotulo text not null,            -- como va en "Local:" del informe: 'DV23 (Cnel. Mora)'
  archivo text not null,           -- como va en el nombre del PDF: 'DV23', 'Deposito Burgues', 'Geant I'
  direccion text,
  mes int,                         -- mes de la auditoría anual (1-12)
  activo boolean not null default true
);

create table if not exists herreria_auditorias (
  id uuid primary key default gen_random_uuid(),
  sitio_id uuid not null references herreria_sitios(id),
  ciclo text not null,             -- '2026-2027' (mayo a abril, como la OT anual)
  fecha date not null,             -- fecha de la visita
  estado text not null default 'abierta'
    check (estado in ('abierta', 'cerrada', 'exportada')),
  comentario_general text not null default '',
  actividad_at timestamptz not null default now(),  -- último mensaje (para cerrar por inactividad)
  cerrada_at timestamptz,
  exportada_at timestamptz,
  archivos_borrados boolean not null default false,  -- fotos/audios ya borrados del bucket (30 días después de exportar)
  created_at timestamptz not null default now()
);
create index if not exists herreria_auditorias_sitio_idx on herreria_auditorias (sitio_id);
create index if not exists herreria_auditorias_estado_idx on herreria_auditorias (estado);

create table if not exists herreria_puntos (
  id uuid primary key default gen_random_uuid(),
  auditoria_id uuid not null references herreria_auditorias(id) on delete cascade,
  orden int not null,              -- orden en el informe (1, 2, 3...)
  fotos text[] not null default '{}',      -- URLs públicas del bucket 'herreria'
  audios jsonb not null default '[]',      -- [{url, durationSecs, recordedAt}]
  transcripcion text not null default '',
  descripcion text not null default '',    -- línea de la hoja Descripción
  recomendacion text not null default '',  -- vacía = sin defecto
  remitente text,                  -- número de WhatsApp de quien lo mandó, o 'app'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists herreria_puntos_auditoria_idx on herreria_puntos (auditoria_id, orden);

-- Crea un punto con el siguiente número de orden de la auditoría. El lock
-- evita que dos puntos que llegan al mismo tiempo (dos técnicos) queden con
-- el mismo número.
create or replace function herreria_nuevo_punto(
  p_auditoria uuid,
  p_fotos text[] default '{}',
  p_audios jsonb default '[]',
  p_transcripcion text default '',
  p_descripcion text default '',
  p_recomendacion text default '',
  p_remitente text default null
) returns setof herreria_puntos language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_auditoria::text));
  return query
    insert into herreria_puntos (auditoria_id, orden, fotos, audios, transcripcion, descripcion, recomendacion, remitente)
    values (
      p_auditoria,
      coalesce((select max(orden) from herreria_puntos where auditoria_id = p_auditoria), 0) + 1,
      coalesce(p_fotos, '{}'), coalesce(p_audios, '[]'), coalesce(p_transcripcion, ''),
      coalesce(p_descripcion, ''), coalesce(p_recomendacion, ''), p_remitente
    )
    returning *;
end;
$$;
grant execute on function herreria_nuevo_punto(uuid, text[], jsonb, text, text, text, text) to anon, authenticated;

-- RLS pública como el resto del proyecto (todavía no hay login).
alter table herreria_sitios enable row level security;
alter table herreria_auditorias enable row level security;
alter table herreria_puntos enable row level security;
drop policy if exists "Herreria sitios publico" on herreria_sitios;
drop policy if exists "Herreria auditorias publico" on herreria_auditorias;
drop policy if exists "Herreria puntos publico" on herreria_puntos;
create policy "Herreria sitios publico" on herreria_sitios for all using (true) with check (true);
create policy "Herreria auditorias publico" on herreria_auditorias for all using (true) with check (true);
create policy "Herreria puntos publico" on herreria_puntos for all using (true) with check (true);

-- Bucket propio para fotos y audios de herrería.
insert into storage.buckets (id, name, public) values ('herreria', 'herreria', true)
on conflict (id) do nothing;
drop policy if exists "Lectura publica herreria" on storage.objects;
drop policy if exists "Subida publica herreria" on storage.objects;
drop policy if exists "Borrado publico herreria" on storage.objects;
create policy "Lectura publica herreria" on storage.objects for select using (bucket_id = 'herreria');
create policy "Subida publica herreria" on storage.objects for insert with check (bucket_id = 'herreria');
create policy "Borrado publico herreria" on storage.objects for delete using (bucket_id = 'herreria');

-- Los 57 sitios. rotulo y archivo copiados del último informe de cada uno; mes = mes de la
-- última auditoría (DV01, DV07 y DV20: última en 2025, se dejan en mayo/junio/junio).
insert into herreria_sitios (cod, nombre, rotulo, archivo, direccion, mes) values
('D01', 'Scoseria', 'D01 (Scoseria)', 'D01', 'Scosería 2628', 12),
('D02', 'Agraciada', 'D02 (Agraciada)', 'D02', 'Av. Agraciada 2986', 3),
('D03', 'Arenal Grande', 'D03 (A.Grande)', 'D03', 'Arenal Grande 1376', 1),
('D04', 'Legrand', 'D04 (Legrand)', 'D04', 'Av. Legrand 5085', 2),
('D05', 'Parada 5', 'D05 (P. Sierra)', 'D05', 'Pedragosa Sierra y Av. Italia, Punta del Este', 5),
('D06', 'Fernandez Crespo', 'D06 (Fernandez Crespo)', 'D06', 'Av. Daniel Fernandez Crespo 1727', 9),
('D07', 'Soca', 'D07 (Soca)', 'D07', 'Av. Dr. Francisco Soca 1318', 3),
('D08', 'Roosevelt', 'D08 (Roosevelt)', 'D08', 'Av. Roosevelt y Zelmar Michellini s/n, Maldonado', 11),
('D09', 'Pta Carretas', 'D09 (Punta Carretas)', 'D09', 'Ellauri 350, local 002. Shopping Punta Carretas', 5),
('D10', 'Camino Maldonado', 'D10 (Cno. Maldonado)', 'D10', 'Brig. Gral. Lavalleja 7722, Maldonado', 3),
('D11', '8 de Octubre y Garibaldi', 'D11 (8 de Octubre)', 'D11', '8 de Octubre 2681', 10),
('D12', 'Curva De Maroñas', 'D12 (Curva de Maroñas)', 'D12', '8 de Octubre 4786', 1),
('D13', 'Chucarro', 'D13 (Chucarro)', 'D13', 'Chucarro 1320', 11),
('D14', 'De La Punta', 'D14 (Calle 17)', 'D14', 'Calle 17, entre Gorlero y 24, Punta del Este', 5),
('D15', 'Marcelino Sosa', 'D15 (M. Sosa)', 'D15', 'Marcelino Sosa 2706', 10),
('D16', 'Ayacucho', 'D16 (Ayacucho)', 'D16', 'Ayacucho 3370', 11),
('D17', 'Calle Maldonado', 'D17 (Maldonado)', 'D17', 'Maldonado 1024', 12),
('D18', 'Solymar', 'D18 (Solymar)', 'D18', 'Av. Giannattasio Km. 23.500, Solymar', 8),
('D19', 'Atlantida', 'D19 (Atlantida)', 'D19', 'Calle Gral. Artigas s/n, entre 22 y 24, Atlántida', 8),
('D20', '20 De Setiembre', 'D20 (20 de Setiembre)', 'D20', '20 de setiembre 1521', 9),
('D21', 'Ejido', 'D21 (Ejido)', 'D21', 'Ejido 1530', 7),
('D22', 'Barrios Amorin', 'D22 (B.Amorin)', 'D22', 'Barrios Amorín 859', 7),
('D23', 'Medanos', 'D23 (Medanos)', 'D23', 'Av. Giannattasio km 27.500 y Av. Central, Médanos', 9),
('D24', 'Obligado', 'D24 (Obligado)', 'D24', 'Obligado 968', 3),
('D25', 'Solano Lopez', 'D25 (S.Lopez)', 'D25', 'Francisco Solano López 1680', 10),
('D26', 'Canelones', 'D26 (Canelones)', 'D26', 'Florencio Sanchez 729, Canelones', 11),
('D27', 'Avda Italia', 'D27 (M. Cervantes)', 'D27', 'Magariños Cervantes 2052', 10),
('D28', 'La Cabaña', 'D28 (La Cabaña)', 'D28', 'Naciones Unidas y Rambla, El Pinar', 9),
('DV01', 'Malvin', 'DV01 (Malvin)', 'DV01', 'H. Irigoyen 1444', 5),
('DV02', 'Punta Gorda', 'DV02 (Gral.Paz)', 'DV02', 'Gral. Paz 1404', 12),
('DV03', 'Brisas', 'DV03 (Brisas)', 'DV03', 'Rivera 4502', 7),
('DV04', 'Carrasco', 'DV04 (Carrasco)', 'DV04', 'Bolivia 1413', 2),
('DV05', 'Shangrila', 'DV05 (Calcagno)', 'DV05', 'Av. Calcagno s/n, Shangrilá', 8),
('DV06', 'Santa Mónica', 'DV06 (Santa Monica)', 'DV06', 'Av. Italia 6958 esq. Sta. Mónica', 12),
('DV07', 'Colón', 'DV07 (Colon)', 'DV07', 'Av. Garzón 1945', 6),
('DV08', 'San Martín I', 'DV08 (San Martin)', 'DV08', 'San Martín 3709', 12),
('DV09', 'Punta del Este', 'DV09 (Roosevelt)', 'DV09', 'Av. Roosevelt y Parada 10, Punta del Este', 11),
('DV10', 'Portones', 'DV10 (Portones)', 'DV10', 'Av. Italia 5779', 7),
('DV11', 'Sayago', 'DV11 (Sayago)', 'DV11', 'Cno. Ariel 4626', 10),
('DV12', 'Pando', 'DV12 (Pando)', 'DV12', 'Ruta 8 km 30.800, Pando', 10),
('DV13', 'Piriapolis Rambla', 'DV13 (Rambla)', 'DV13', 'Rbla. de los Argentinos y Vázquez, Piriápolis', 12),
('DV14', 'Hiperpiria', 'DV14 (Piria)', 'DV14', 'Av. Piria y Bs. As., Piriápolis', 11),
('DV15', 'Agraciada', 'DV15 (Agraciada)', 'DV15', 'Agraciada y Fco. Gómez', 8),
('DV16', 'San Martín II', 'DV16 (San Martin II)', 'DV16', 'Av. Gral. San Martín 3083', 10),
('DV18', 'Las Piedras I', 'DV18 (Las piedras I)', 'DV18', 'Juan A. Lavalleja 671', 8),
('DV19', 'Prado - Suárez', 'DV19 (Suarez)', 'DV19', 'Joaquín Suarez 3458', 7),
('DV20', 'Arenal Grande', 'DV20 (A. Grande)', 'DV20', 'Arenal Grande 2006', 6),
('DV21', '8 de Octubre', 'DV21 (8 de Octubre)', 'DV21', '8 de Octubre 3621', 12),
('DV22', '26 de Marzo', 'DV22 (26 de marzo)', 'DV22', '26 de Marzo esq. Lorenzo Pérez', 2),
('DV23', 'Coronel Mora', 'DV23 (Cnel. Mora)', 'DV23', 'Coronel Mora y Agr. Francisco Ros', 9),
('DV24', 'San Quintín', 'DV24 (San Quintin)', 'DV24', 'Av. San Quintín 4376', 7),
('DV25', 'Las Piedras II', 'DV25 (Las piedras II)', 'DV25', 'Av. Dr. Pouey 622', 8),
('D29', 'Libertad', 'D29 (Libertad)', 'D29', 'Wilson Ferreira Aldunate S/N, Libertad', 2),
('CD80', 'Depósito Burgues', 'Deposito Burgues', 'Deposito Burgues', 'Burgues 3061', 4),
('CD81', 'Depósito Pichincha', 'Deposito Pichincha', 'Deposito Pichincha', 'Camino Pichincha 2791', 1),
('CD82', 'Depósito Perimetral', 'Deposito Perimetral', 'Deposito Perimetral', 'Camino del Andaluz 3031 km 33', 12),
('G01', 'Géant I', 'GEANT I', 'Geant I', 'Avda Giannattasio y Avda a la Playa', 4)
on conflict (cod) do nothing;

select count(*) as sitios from herreria_sitios;
