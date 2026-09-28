-- Función para cargar el comentario del último informe a un equipo,
-- creando el equipo si todavía no existe en Supabase (antes la app
-- mostraba equipos de ejemplo que no estaban en la base, y por eso un
-- "update" solo encontraba algunos).
--
-- Uso (una línea por equipo):
--   select cargar_comentario('D 01', 'ac', 'Rooftop', 1, $c$texto$c$);
--
-- El comentario queda marcado como del informe anterior
-- (comment_period = 'informe'): se ve en la app y en el mensaje del bot al
-- abrir la sucursal, y el primer comentario nuevo de la visita lo reemplaza.
-- Correr este archivo una vez en el SQL Editor de Supabase, antes de las
-- líneas con los comentarios.

create or replace function cargar_comentario(p_suc text, p_category text, p_subtype text, p_number int, p_comment text)
returns text language plpgsql as $$
declare
  v_location uuid;
  v_id text;
  v_prefix text := case p_category
    when 'ac' then 'AC' when 'gas' then 'GAS' when 'ups' then 'UPS'
    when 'gen' then 'GEN' when 'sub' then 'TAB' when 'cg' then 'CG'
    else upper(p_category) end;
begin
  select id into v_location from locations where suc = p_suc;
  if v_location is null then
    return 'NO EXISTE EL LOCAL ' || p_suc;
  end if;

  select id into v_id from equipment_state
  where location_id = v_location and category = p_category and subtype = p_subtype and number = p_number and active
  limit 1;

  if v_id is null then
    v_id := v_location || '-' || p_category || '-' || gen_random_uuid();
    insert into equipment_state (id, location_id, category, subtype, number, code, active, status, comment, comment_period, photos, audios)
    values (v_id, v_location, p_category, p_subtype, p_number,
            v_prefix || '-' || lpad(p_number::text, 3, '0'), true, 'pendiente',
            coalesce(p_comment, ''), 'informe', '{}', '[]');
    return 'creado';
  end if;

  -- El trigger marcaría el comentario como de la visita actual: se pone
  -- el texto y después la marca, en dos pasos.
  update equipment_state set comment = coalesce(p_comment, '') where id = v_id;
  update equipment_state set comment_period = 'informe' where id = v_id;
  return 'actualizado';
end;
$$;
