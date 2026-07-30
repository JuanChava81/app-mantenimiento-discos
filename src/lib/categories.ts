import { CategoryDef } from "./types";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "ac",
    name: "Aires acondicionados",
    prefix: "AC",
    subtypes: ["Split", "Rooftop", "Chiller", "Manejadora"],
    checks: [
      { id: "filtro", label: "Filtro", options: ["OK", "No OK"] },
      { id: "desague", label: "Desagüe", options: ["OK", "No OK"] },
      { id: "intercambiador", label: "Intercambiador", options: ["OK", "No OK"] },
    ],
    fields: [],
  },
  {
    id: "gas",
    name: "Cañerías de gas",
    prefix: "GAS",
    subtypes: ["Tramo"],
    checks: [
      { id: "flexibles", label: "Flexibles autorizados", options: ["OK", "No OK"] },
      { id: "cortePanico", label: "Sistema de corte por pánico", options: ["OK", "No OK"] },
    ],
    fields: [],
  },
  {
    id: "ups",
    name: "UPS",
    prefix: "UPS",
    subtypes: ["UPS"],
    checks: [
      { id: "enLinea", label: "UPS en línea", options: ["OK", "No OK"] },
      { id: "aireDedicado", label: "Aire acondicionado dedicado", options: ["Sí", "No"] },
      { id: "cargaBaterias", label: "Estado de carga de baterías", options: ["OK", "No OK"] },
    ],
    fields: [
      { id: "carga", label: "Carga", unit: "%", placeholder: "100" },
      { id: "autonomia", label: "Autonomía", unit: "", placeholder: "2 h 12 min" },
    ],
  },
  {
    id: "gen",
    name: "Generador eléctrico",
    prefix: "GEN",
    subtypes: ["Generador"],
    checks: [
      { id: "bateria", label: "Batería", options: ["OK", "No OK"] },
      { id: "refrigerante", label: "Líquido refrigerante", options: ["OK", "No OK"] },
      { id: "lubricante", label: "Lubricante", options: ["OK", "No OK"] },
      { id: "correa", label: "Correa", options: ["OK", "No OK"] },
    ],
    fields: [
      { id: "combustible", label: "Tanque de combustible", unit: "%", placeholder: "55" },
      { id: "horas", label: "Horas de equipo", unit: "h", placeholder: "0" },
      { id: "voltaje", label: "Voltaje", unit: "V", placeholder: "220" },
    ],
  },
  {
    id: "sub",
    name: "Subestación y tablero",
    prefix: "TAB",
    subtypes: ["Tablero"],
    checks: [
      { id: "objetos", label: "Objetos extraños", options: ["OK", "No OK"] },
      { id: "filtraciones", label: "Filtraciones de agua", options: ["OK", "No OK"] },
      { id: "tableros", label: "Tableros eléctricos", options: ["OK", "No OK"] },
      { id: "condensadores", label: "Bancos de condensadores", options: ["OK", "No OK"] },
    ],
    fields: [{ id: "fp", label: "Factor de potencia", unit: "", placeholder: "0,95" }],
  },
];

export function categoryById(id: string): CategoryDef {
  const found = CATEGORIES.find((c) => c.id === id);
  if (!found) throw new Error(`Categoría desconocida: ${id}`);
  return found;
}
