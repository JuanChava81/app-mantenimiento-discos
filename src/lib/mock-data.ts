import { CATEGORIES } from "./categories";
import { REAL_LOCATIONS } from "./real-locations";
import { Equipment, EquipmentData, EquipmentStatus, Location } from "./types";

export const MOCK_LOCATIONS: Location[] = REAL_LOCATIONS;

function statusForSeed(seed: number): EquipmentStatus {
  const r = seed % 10;
  if (r < 6) return "ok";
  if (r < 8) return "falla";
  return "pendiente";
}

/**
 * Genera equipos y su estado inicial para una lista de locales.
 * Todavía no hay tablas `equipment`/`inspections` conectadas en Supabase
 * (ver supabase/schema.sql), así que esto sigue siendo data de ejemplo
 * generada en el cliente a partir de los locales reales.
 */
export function generateEquipmentFor(locations: Location[]): {
  equipment: Equipment[];
  data: Record<string, EquipmentData>;
} {
  const equipment: Equipment[] = [];
  const data: Record<string, EquipmentData> = {};
  let seed = 0;

  for (const location of locations) {
    for (const category of CATEGORIES) {
      const count = category.id === "ac" ? 3 : category.id === "gas" ? 2 : 1;
      for (let n = 1; n <= count; n++) {
        seed++;
        const id = `${location.id}-${category.id}-${n}`;
        const subtype = category.subtypes[(seed + n) % category.subtypes.length];
        const code = `${category.prefix}-${String(n).padStart(3, "0")}`;
        const status = statusForSeed(seed);
        equipment.push({
          id,
          locationId: location.id,
          category: category.id,
          subtype,
          number: n,
          code,
          active: true,
        });
        const checks: Record<string, string> = {};
        for (const check of category.checks) {
          checks[check.id] = status === "falla" ? check.options[1] : check.options[0];
        }
        const fields: Record<string, string> = {};
        for (const field of category.fields) {
          fields[field.id] = "";
        }
        data[id] = {
          status,
          comment: status === "falla" ? "Ruido anormal, requiere revisión técnica." : "",
          photos: [],
          audios: [],
          checks,
          fields,
          updatedAt: "Hoy · 09:00",
        };
      }
    }
  }

  return { equipment, data };
}
