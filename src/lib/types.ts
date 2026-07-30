export type Chain = "Disco" | "Devoto";

export type CategoryId = "ac" | "gas" | "ups" | "gen" | "panel";

export type EquipmentStatus = "ok" | "falla" | "pendiente";

export interface Location {
  id: string;
  chain: Chain;
  number: number;
  name: string;
  address: string;
}

export interface CategoryDef {
  id: CategoryId;
  name: string;
  prefix: string;
  subtypes: string[];
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

export interface EquipmentData {
  status: EquipmentStatus;
  comment: string;
  photoUrl: string | null;
  updatedAt: string;
}

export interface HistoryEntry {
  date: string;
  status: EquipmentStatus;
  comment: string;
}
