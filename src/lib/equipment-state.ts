import { supabase, supabaseConfigured } from "./supabase";
import { AudioNote, Equipment, EquipmentData, EquipmentStatus } from "./types";

interface EquipmentStateRow {
  id: string;
  location_id: string;
  category: string;
  subtype: string;
  number: number;
  code: string;
  active: boolean;
  status: EquipmentStatus;
  comment: string;
  checks: Record<string, string>;
  fields: Record<string, string>;
  photos: string[];
  audios: AudioNote[];
}

// Equipos que ya existen en Supabase: a esos se les guarda SOLO lo que se
// cambió (ej. el comentario), no la fila entera. Guardar la fila entera
// pisaba con la lista vieja de fotos las que el bot de WhatsApp había
// subido mientras tanto.
const savedIds = new Set<string>();

export type EquipmentChange = Partial<Omit<EquipmentData, "updatedAt">> & Partial<Pick<Equipment, "subtype" | "number" | "code" | "active">>;

const COLUMN_FOR: Record<string, string> = {
  status: "status",
  comment: "comment",
  checks: "checks",
  fields: "fields",
  photos: "photos",
  audios: "audios",
  subtype: "subtype",
  number: "number",
  code: "code",
  active: "active",
};

export async function fetchAllEquipmentState(): Promise<{
  equipment: Equipment[];
  data: Record<string, EquipmentData>;
} | null> {
  if (!supabaseConfigured || !supabase) return null;

  const { data: rows, error } = await supabase.from("equipment_state").select("*");
  if (error || !rows) return null;

  const equipment: Equipment[] = [];
  const data: Record<string, EquipmentData> = {};

  for (const row of rows as EquipmentStateRow[]) {
    savedIds.add(row.id);
    equipment.push({
      id: row.id,
      locationId: row.location_id,
      category: row.category as Equipment["category"],
      subtype: row.subtype,
      number: row.number,
      code: row.code,
      active: row.active,
    });
    data[row.id] = {
      status: row.status,
      comment: row.comment ?? "",
      checks: row.checks ?? {},
      fields: row.fields ?? {},
      photos: row.photos ?? [],
      audios: row.audios ?? [],
      updatedAt: "Sincronizado",
    };
  }

  return { equipment, data };
}

export function saveEquipmentState(equipment: Equipment, data: EquipmentData, change?: EquipmentChange) {
  if (!supabaseConfigured || !supabase) return;

  const onError = ({ error }: { error: { message: string } | null }) => {
    if (error) console.error("No se pudo guardar el equipo en Supabase:", error.message);
  };

  if (change && savedIds.has(equipment.id)) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [key, value] of Object.entries(change)) {
      const column = COLUMN_FOR[key];
      if (column) update[column] = value;
    }
    supabase.from("equipment_state").update(update).eq("id", equipment.id).then(onError);
    return;
  }

  // Primera vez que se guarda este equipo: la fila entera.
  savedIds.add(equipment.id);
  supabase
    .from("equipment_state")
    .upsert({
      id: equipment.id,
      location_id: equipment.locationId,
      category: equipment.category,
      subtype: equipment.subtype,
      number: equipment.number,
      code: equipment.code,
      active: equipment.active,
      status: data.status,
      comment: data.comment,
      checks: data.checks,
      fields: data.fields,
      photos: data.photos,
      audios: data.audios,
      updated_at: new Date().toISOString(),
    })
    .then(onError);
}

export interface HistoryVisit {
  period: string; // "2026-09"
  status: EquipmentStatus;
  comment: string;
  photos: number;
}

/**
 * Visitas anteriores de un equipo (las archiva el bot de WhatsApp cuando
 * empieza la visita siguiente del local), de la más nueva a la más vieja.
 */
export async function fetchEquipmentHistory(equipmentId: string): Promise<HistoryVisit[]> {
  if (!supabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from("equipment_history")
    .select("period, status, comment, photos")
    .eq("equipment_id", equipmentId)
    .order("period", { ascending: false });
  if (error || !data) return [];
  return (data as { period: string; status: EquipmentStatus | null; comment: string | null; photos: string[] | null }[]).map(
    (row) => ({
      period: row.period,
      status: row.status ?? "pendiente",
      comment: row.comment ?? "",
      photos: row.photos?.length ?? 0,
    })
  );
}
