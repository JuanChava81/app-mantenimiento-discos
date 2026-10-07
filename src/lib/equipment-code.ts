import { Equipment } from "./types";

// Prefijos de código para aires acondicionados según el subtipo — igual
// al criterio de la planilla original del usuario (S_01 Split, R_01
// Rooftop, CH_01 Chiller, M_01 Manejadora, UE_01 Unidad Exterior, UI_01
// Unidad Interior; el número es el número de equipo). Se usa tanto en el
// informe Excel como en el export de fotos.
const AC_SUBTYPE_PREFIX: Record<string, string> = {
  Split: "S",
  Rooftop: "R",
  Chiller: "CH",
  Manejadora: "M",
  UE: "UE",
  UI: "UI",
};

export function acShortCode(eq: Equipment): string {
  const prefix = AC_SUBTYPE_PREFIX[eq.subtype] ?? eq.subtype.slice(0, 1).toUpperCase();
  return `${prefix}_${String(eq.number).padStart(2, "0")}`;
}

// Ciclos de refrigeración: mismo código que manda el bot (UIMT_01,
// BTC_02...).
const CR_SUBTYPE_PREFIX: Record<string, string> = {
  "UI MT": "UIMT",
  "UI BT": "UIBT",
  "UE MT": "UEMT",
  "UE BT": "UEBT",
  "Compresor MT": "MTC",
  "Compresor BT": "BTC",
  Ciclo: "CR",
};

export function crShortCode(eq: Equipment): string {
  const prefix = CR_SUBTYPE_PREFIX[eq.subtype] ?? "CR";
  return `${prefix}_${String(eq.number).padStart(2, "0")}`;
}

/** Código que se ve en la app: el de siempre, salvo ciclos de refrigeración. */
export function displayCode(eq: Equipment): string {
  return eq.category === "cr" ? crShortCode(eq) : eq.code;
}

export function equipmentPhotoCode(eq: Equipment): string {
  return eq.category === "ac" ? acShortCode(eq) : displayCode(eq);
}
