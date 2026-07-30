import { CategoryDef } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "ac",
    name: "Aires acondicionados",
    prefix: "AC",
    subtypes: ["Split", "Rooftop", "Chiller", "Manejadora"],
  },
  { id: "gas", name: "Cañerías de gas", prefix: "GAS", subtypes: ["Tramo"] },
  { id: "ups", name: "UPS", prefix: "UPS", subtypes: ["UPS"] },
  { id: "gen", name: "Generador eléctrico", prefix: "GEN", subtypes: ["Generador"] },
  { id: "panel", name: "Tablero eléctrico", prefix: "TAB", subtypes: ["Tablero"] },
];

export function categoryById(id: string): CategoryDef {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Categoría desconocida: ${id}`);
  return found;
}
