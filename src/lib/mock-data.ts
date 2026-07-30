import { CATEGORIES } from "./categories";
import { Chain, Equipment, EquipmentData, EquipmentStatus, Location } from "./types";

const STREETS = [
  "Av. 18 de Julio",
  "Bulevar Artigas",
  "Av. Italia",
  "Av. Rivera",
  "Av. Brasil",
  "Bulevar España",
  "Av. Millán",
  "Camino Maldonado",
  "Av. de las Instrucciones",
  "Av. Giannattasio",
];

const NEIGHBORHOODS = [
  "Pocitos",
  "Carrasco",
  "Malvín",
  "Punta Carretas",
  "Cordón",
  "Centro",
  "Buceo",
  "La Blanqueada",
  "Tres Cruces",
  "Ciudad Vieja",
];

function makeAddress(seed: number): string {
  const street = STREETS[seed % STREETS.length];
  const number = 1000 + ((seed * 137) % 8000);
  const neighborhood = NEIGHBORHOODS[(seed * 3) % NEIGHBORHOODS.length];
  return `${street} ${number}, ${neighborhood}`;
}

export const MOCK_LOCATIONS: Location[] = (["Disco", "Devoto"] as Chain[]).flatMap(
  (chain, chainIdx) =>
    Array.from({ length: 20 }, (_, i) => {
      const number = i + 1;
      const seed = chainIdx * 20 + i;
      return {
        id: `${chain.toLowerCase()}-${String(number).padStart(2, "0")}`,
        chain,
        number,
        name: `${chain} ${NEIGHBORHOODS[seed % NEIGHBORHOODS.length]}`,
        address: makeAddress(seed),
      };
    })
);

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
        data[id] = {
          status,
          comment: status === "falla" ? "Ruido anormal, requiere revisión técnica." : "",
          photoUrl: null,
          updatedAt: "Hoy · 09:00",
        };
      }
    }
  }

  return { equipment, data };
}
