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

export function saveEquipmentState(equipment: Equipment, data: EquipmentData) {
  if (!supabaseConfigured || !supabase) return;

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
    .then(({ error }) => {
      if (error) console.error("No se pudo guardar el equipo en Supabase:", error.message);
    });
}
