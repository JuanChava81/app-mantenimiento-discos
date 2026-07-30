export type Chain = "Disco" | "Devoto";

export type CategoryId = "ac" | "gas" | "ups" | "gen" | "sub";

export type EquipmentStatus = "ok" | "falla" | "pendiente";

export interface Location {
  id: string;
  suc: string; // código de sucursal, ej. "D 03" | "DV 24"
  chain: Chain;
  name: string;
  address: string;
  months: number[]; // meses de visita planificados (1-12)
}

export interface CheckDef {
  id: string;
  label: string;
  options: [string, string]; // ej. ["OK", "No OK"]
}

export interface FieldDef {
  id: string;
  label: string;
  unit: string;
  placeholder: string;
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  prefix: string;
  subtypes: string[];
  checks: CheckDef[];
  fields: FieldDef[];
}

export interface Equipment {
  id: string;
  locationId: string;
  category: CategoryId;
  subtype: string;
  number: number;
  code: string;
  active: boolean;
}

export interface AudioNote {
  id: string;
  url: string;
  durationSecs: number;
  recordedAt: string;
}

export interface EquipmentData {
  status: EquipmentStatus;
  comment: string;
  photos: string[];
  audios: AudioNote[];
  checks: Record<string, string>;
  fields: Record<string, string>;
  updatedAt: string;
}

export interface HistoryEntry {
  date: string;
  status: EquipmentStatus;
  comment: string;
}
