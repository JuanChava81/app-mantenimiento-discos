import { Equipment } from "./types";

// Prefijos de código para aires acondicionados según el subtipo — igual
// al criterio de la planilla original del usuario (S_01 Split, R_01
// Rooftop, CH_01 Chiller, M_01 Manejadora; el número es el número de
// equipo). Se usa tanto en el informe Excel como en el export de fotos.
const AC_SUBTYPE_PREFIX: Record<string, string> = {
  Split: "S",
  Rooftop: "R",
  Chiller: "CH",
  Manejadora: "M",
};

export function acShortCode(eq: Equipment): string {
  const prefix = AC_SUBTYPE_PREFIX[eq.subtype] ?? eq.subtype.slice(0, 1).toUpperCase();
  return `${prefix}_${String(eq.number).padStart(2, "0")}`;
}

export function equipmentPhotoCode(eq: Equipment): string {
  return eq.category === "ac" ? acShortCode(eq) : eq.code;
}
