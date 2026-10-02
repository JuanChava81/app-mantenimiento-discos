export type EstadoAuditoria = "abierta" | "cerrada" | "exportada";

export interface Sitio {
  id: string;
  cod: string;
  nombre: string;
  rotulo: string;
  archivo: string;
  direccion: string | null;
  mes: number | null;
}

export interface Auditoria {
  id: string;
  sitio_id: string;
  ciclo: string;
  fecha: string; // AAAA-MM-DD
  estado: EstadoAuditoria;
  comentario_general: string;
  cerrada_at: string | null;
  exportada_at: string | null;
  created_at: string;
}

export interface AudioPunto {
  url: string;
  durationSecs: number;
  recordedAt: string;
}

export interface Punto {
  id: string;
  auditoria_id: string;
  orden: number;
  fotos: string[];
  audios: AudioPunto[];
  transcripcion: string;
  descripcion: string;
  recomendacion: string;
  remitente: string | null;
  updated_at: string;
}
