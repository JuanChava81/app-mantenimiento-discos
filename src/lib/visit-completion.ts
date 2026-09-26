import { supabase, supabaseConfigured } from "./supabase";
import { Location } from "./types";

// Un local queda "Completo" cuando se exportan sus fotos y audios (botón
// del resumen de visita). Se guarda la fecha en locations.exported_at
// (ver supabase/migrate_v7_completado_al_exportar.sql) para que todos los
// dispositivos lo vean igual.

/**
 * Trae la fecha del último export de cada local. Va en una consulta aparte
 * de fetchLocations a propósito: si todavía no se corrió la migración v7 y
 * la columna no existe, esto falla solo (sin marcas de completo) en vez de
 * tirar toda la lista de locales a datos de ejemplo.
 */
export async function fetchExportedAt(): Promise<Record<string, string>> {
  if (!supabaseConfigured || !supabase) return {};
  const { data, error } = await supabase.from("locations").select("id, exported_at");
  if (error || !data) return {};
  const result: Record<string, string> = {};
  for (const row of data as { id: string; exported_at: string | null }[]) {
    if (row.exported_at) result[row.id] = row.exported_at;
  }
  return result;
}

export async function saveExportedAt(locationId: string, iso: string) {
  if (!supabaseConfigured || !supabase) return;
  const { error } = await supabase.from("locations").update({ exported_at: iso }).eq("id", locationId);
  if (error) console.error("No se pudo marcar el local como completo:", error.message);
}

/**
 * Primer día del mes de visita planificado más reciente (el actual o uno
 * anterior). Ej. un local de Marzo y Setiembre, mirado en Octubre → 1 de
 * Setiembre.
 */
function inicioUltimaVisitaPlanificada(months: number[], now: Date): Date | null {
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    if (months.includes(d.getMonth() + 1)) return d;
  }
  return null;
}

/**
 * Completo = se exportó después de que arrancó su visita planificada más
 * reciente. Así lo exportado en Marzo no cuenta para la visita de
 * Setiembre, pero si la de Setiembre se exporta el 2 de Octubre sigue
 * figurando completa.
 */
export function isVisitCompleted(location: Location, exportedAt: string | undefined, now = new Date()): boolean {
  if (!exportedAt) return false;
  const inicio = inicioUltimaVisitaPlanificada(location.months, now);
  return inicio !== null && new Date(exportedAt) >= inicio;
}

/**
 * Fecha de la visita actual de cada local ("YYYY-MM-DD"), la que anota el
 * bot de WhatsApp al abrir la sucursal. Consulta aparte por el mismo
 * motivo que fetchExportedAt (si falta la columna, no rompe nada).
 */
export async function fetchVisitDates(): Promise<Record<string, string>> {
  if (!supabaseConfigured || !supabase) return {};
  const { data, error } = await supabase.from("locations").select("id, visit_date");
  if (error || !data) return {};
  const result: Record<string, string> = {};
  for (const row of data as { id: string; visit_date: string | null }[]) {
    if (row.visit_date) result[row.id] = row.visit_date;
  }
  return result;
}
