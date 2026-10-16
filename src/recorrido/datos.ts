import { supabase } from "@/lib/supabase";
import { Punto } from "./ruta";

// Lecturas y escrituras de la pantalla Recorrido. Tablas propias
// (ubicaciones_locales, recorrido_mes, ver supabase/recorrido_v1.sql) y
// lecturas de solo lectura de equipment_state y herreria_sitios.

export interface Ubicacion extends Punto {
  confirmada: boolean;
}

/** "D 01" → "D01" (el código que usan ubicaciones y herrería). */
export const codDe = (suc: string) => suc.replace(/\s+/g, "");

export const OFICINA = "OFICINA";

/** Ubicaciones por código, o null si la tabla todavía no existe. */
export async function cargarUbicaciones(): Promise<Record<string, Ubicacion> | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("ubicaciones_locales").select("cod, lat, lng, confirmada");
  if (error || !data) return null;
  return Object.fromEntries(
    (data as { cod: string; lat: number; lng: number; confirmada: boolean }[]).map((u) => [
      u.cod,
      { lat: u.lat, lng: u.lng, confirmada: u.confirmada },
    ])
  );
}

export async function guardarUbicacion(cod: string, p: Punto) {
  if (!supabase) return;
  const { error } = await supabase.from("ubicaciones_locales").upsert({ cod, lat: p.lat, lng: p.lng, confirmada: true });
  if (error) throw error;
}

/** Cantidad de equipos activos de cada local (sin contar comentarios generales). */
export async function equiposPorLocal(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const cuenta: Record<string, number> = {};
  // De a 1000 filas (Supabase no devuelve más de 1000 por consulta).
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("equipment_state")
      .select("location_id, category, active")
      .order("id")
      .range(desde, desde + 999);
    if (error || !data) break;
    for (const r of data as { location_id: string; category: string; active: boolean }[]) {
      if (!r.active || r.category === "cg") continue;
      cuenta[r.location_id] = (cuenta[r.location_id] ?? 0) + 1;
    }
    if (data.length < 1000) break;
  }
  return cuenta;
}

/** Mes de herrería de cada sitio (cod → mes). Solo lectura. */
export async function mesesHerreria(): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("herreria_sitios").select("cod, mes").eq("activo", true);
  if (error || !data) return {};
  return Object.fromEntries((data as { cod: string; mes: number }[]).map((s) => [s.cod, s.mes]));
}

export async function cargarOrden(mes: string): Promise<string[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("recorrido_mes").select("orden").eq("mes", mes).maybeSingle();
  if (error || !data) return null;
  return (data as { orden: string[] }).orden;
}

export async function guardarOrden(mes: string, orden: string[]) {
  if (!supabase) return;
  const { error } = await supabase.from("recorrido_mes").upsert({ mes, orden, updated_at: new Date().toISOString() });
  if (error) throw error;
}
