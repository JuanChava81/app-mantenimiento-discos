-- Migración v7: marcar un local como "Completo" al exportar sus fotos y
-- audios desde la app (botón "Exportar fotos y audios por equipo").
-- Correr una sola vez en el SQL Editor de Supabase.
--
-- Incluye también el calendario completo de la v6 (si ya la corriste, no
-- pasa nada: vuelve a poner los mismos meses).

alter table locations add column if not exists exported_at timestamptz;

drop policy if exists "Marcar locations como exportadas" on locations;
create policy "Marcar locations como exportadas" on locations for update using (true) with check (true);

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
