-- Pantalla "Recorrido del mes" (app de mantenimiento).
-- Pegar entero en Supabase → SQL Editor → Run. Se puede correr más de una vez:
-- no pisa las ubicaciones que ya se corrigieron desde la app.
--
-- ubicaciones_locales: dónde está cada local (cod sin espacio: D01, DV23) y la
--   oficina (OFICINA). confirmada = la revisó Juan; las demás salen de una
--   búsqueda automática de la dirección (OpenStreetMap) y pueden estar corridas:
--   se corrigen en la app manteniendo apretado el marcador y arrastrándolo.
-- recorrido_mes: el orden de visita elegido para cada mes ('2026-10').

create table if not exists ubicaciones_locales (
  cod text primary key,
  lat double precision not null,
  lng double precision not null,
  confirmada boolean not null default false
);

create table if not exists recorrido_mes (
  mes text primary key,
  orden text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table ubicaciones_locales enable row level security;
alter table recorrido_mes enable row level security;
drop policy if exists "Ubicaciones publico" on ubicaciones_locales;
drop policy if exists "Recorrido publico" on recorrido_mes;
create policy "Ubicaciones publico" on ubicaciones_locales for all using (true) with check (true);
create policy "Recorrido publico" on recorrido_mes for all using (true) with check (true);

-- Confirmadas por Juan (si ya existían, se actualizan).
insert into ubicaciones_locales (cod, lat, lng, confirmada) values
  ('OFICINA', -34.8431052, -56.2248710, true), -- Oficina Creative, José Fernández Medina 4921
  ('DV11', -34.8355064, -56.2110738, true), -- Cno. Ariel 4626
  ('DV19', -34.8643150, -56.1954689, true), -- Joaquín Suárez 3458
  ('DV16', -34.8696393, -56.1827428, true), -- Av. Gral. San Martín 3083
  ('D15', -34.8778070, -56.1812741, true), -- Marcelino Sosa 2706
  ('D11', -34.8897045, -56.1607113, true), -- 8 de Octubre 2681
  ('D27', -34.8876064, -56.1409056, true), -- Magariños Cervantes 2052
  ('D25', -34.8917799, -56.1251854, true), -- Francisco Solano López 1680
  ('DV12', -34.7259570, -55.9645727, true) -- Ruta 8 km 30.800, Pando
on conflict (cod) do update set lat = excluded.lat, lng = excluded.lng, confirmada = true;

-- Aproximadas (búsqueda automática, SIN confirmar). Si ya existen no se tocan,
-- así no se pierden las correcciones hechas en la app.
insert into ubicaciones_locales (cod, lat, lng, confirmada) values
  ('D01', -34.9152740, -56.1558301, false), -- Scosería 2628
  ('D02', -34.8759593, -56.1985402, false), -- Av. Agraciada 2986
  ('D03', -34.9027694, -56.1732046, false), -- Arenal Grande 1376
  ('D04', -34.8893286, -56.0984505, false), -- Av. Legrand 5085
  ('D05', -34.9449905, -54.9358260, false), -- Pedragosa Sierra y Av. Italia, Punta del Este
  ('D06', -34.8990703, -56.1776808, false), -- Av. Daniel Fernandez Crespo 1727
  ('D07', -34.9055318, -56.1547295, false), -- Av. Dr. Francisco Soca 1318
  ('D08', -34.9136518, -54.9613913, false), -- Av. Roosevelt y Zelmar Michellini s/n, Maldonado
  ('D09', -34.9239559, -56.1585930, false), -- Ellauri 350, local 002. Shopping Punta Carretas
  ('D10', -34.8273069, -56.1068244, false), -- Brig. Gral. Lavalleja 7722, Maldonado
  ('D12', -34.8572729, -56.1324659, false), -- 8 de Octubre 4786
  ('D13', -34.9090992, -56.1445031, false), -- Chucarro 1320
  ('D14', -34.9636219, -54.9432414, false), -- Calle 17, entre Gorlero y 24, Punta del Este
  ('D16', -34.8943266, -56.1448054, false), -- Ayacucho 3370
  ('D17', -34.9099409, -56.1937522, false), -- Maldonado 1024
  ('D18', -34.8262980, -55.9651137, false), -- Av. Giannattasio Km. 23.500, Solymar
  ('D19', -34.7712655, -55.7612546, false), -- Calle Gral. Artigas s/n, entre 22 y 24, Atlántida
  ('D20', -34.9003983, -56.1627437, false), -- 20 de setiembre 1521
  ('D21', -34.9021589, -56.1867062, false), -- Ejido 1530
  ('D22', -34.9138951, -56.1838399, false), -- Barrios Amorín 859
  ('D23', -34.8069434, -55.9278555, false), -- Av. Giannattasio km 27.500 y Av. Central, Médanos
  ('D24', -34.9132660, -56.1601349, false), -- Obligado 968
  ('D26', -34.5214691, -56.2801298, false), -- Florencio Sanchez 729, Canelones
  ('D28', -34.8041542, -55.9081487, false), -- Naciones Unidas y Rambla, El Pinar
  ('DV01', -34.8950163, -56.1077867, false), -- H. Irigoyen 1444
  ('DV02', -34.8935359, -56.0795988, false), -- Gral. Paz 1404
  ('DV03', -34.8931939, -56.1156841, false), -- Rivera 4502
  ('DV04', -34.8931501, -56.0664118, false), -- Bolivia 1413
  ('DV05', -34.8515043, -55.9964091, false), -- Av. Calcagno s/n, Shangrilá
  ('DV06', -34.8778204, -56.0573141, false), -- Av. Italia 6958 esq. Sta. Mónica
  ('DV07', -34.8052345, -56.2229343, false), -- Av. Garzón 1945
  ('DV08', -34.8569807, -56.1753729, false), -- San Martín 3709
  ('DV09', -34.9331605, -54.9395369, false), -- Av. Roosevelt y Parada 10, Punta del Este
  ('DV10', -34.8803924, -56.0808892, false), -- Av. Italia 5779
  ('DV13', -34.8561548, -55.2916904, false), -- Rbla. de los Argentinos y Vázquez, Piriápolis
  ('DV14', -34.8653573, -55.2698197, false), -- Av. Piria y Bs. As., Piriápolis
  ('DV15', -34.8655409, -56.2102483, false), -- Agraciada y Fco. Gómez
  ('DV18', -34.7285891, -56.2169953, false), -- Juan A. Lavalleja 671
  ('DV20', -34.8925868, -56.1807314, false), -- Arenal Grande 2006
  ('DV21', -34.8765368, -56.1437821, false), -- 8 de Octubre 3621
  ('DV22', -34.9078330, -56.1460490, false), -- 26 de Marzo esq. Lorenzo Pérez
  ('DV23', -34.9191801, -56.1574700, false), -- Coronel Mora y Agr. Francisco Ros
  ('DV24', -34.8523506, -56.2229050, false), -- Av. San Quintín 4376
  ('DV25', -34.7351463, -56.2237529, false) -- Av. Dr. Pouey 622
on conflict (cod) do nothing;

select count(*) as ubicaciones, count(*) filter (where confirmada) as confirmadas from ubicaciones_locales;
