import { supabase } from "@/lib/supabase";
import { cicloDe } from "./fechas";
import { Auditoria, Punto, Sitio } from "./tipos";

// Acceso a Supabase de la app Herrería: SOLO tablas herreria_* y el bucket
// "herreria". Nunca toca nada de mantenimiento.

const BUCKET = "herreria";

function db() {
  if (!supabase) throw new Error("Supabase no está configurado");
  return supabase;
}

export async function cargarSitios(): Promise<Sitio[]> {
  const { data, error } = await db().from("herreria_sitios").select("id, cod, nombre, rotulo, archivo, direccion, mes").eq("activo", true);
  if (error) throw error;
  return data as Sitio[];
}

export async function cargarAuditorias(): Promise<Auditoria[]> {
  const { data, error } = await db()
    .from("herreria_auditorias")
    .select("id, sitio_id, ciclo, fecha, estado, comentario_general, cerrada_at, exportada_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Auditoria[];
}

export async function cargarPuntos(auditoriaId: string): Promise<Punto[]> {
  const { data, error } = await db().from("herreria_puntos").select("*").eq("auditoria_id", auditoriaId).order("orden");
  if (error) throw error;
  return data as Punto[];
}

export async function crearAuditoria(sitioId: string, fecha: string): Promise<Auditoria> {
  const { data, error } = await db()
    .from("herreria_auditorias")
    .insert({ sitio_id: sitioId, fecha, ciclo: cicloDe(fecha) })
    .select("id, sitio_id, ciclo, fecha, estado, comentario_general, cerrada_at, exportada_at, created_at")
    .single();
  if (error) throw error;
  return data as Auditoria;
}

export async function actualizarAuditoria(id: string, campos: Partial<Auditoria>) {
  const { error } = await db().from("herreria_auditorias").update(campos).eq("id", id);
  if (error) throw error;
}

export async function crearPunto(auditoriaId: string): Promise<Punto> {
  const { data, error } = await db().rpc("herreria_nuevo_punto", { p_auditoria: auditoriaId, p_remitente: "app" });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as Punto;
}

export async function actualizarPunto(id: string, campos: Partial<Punto>) {
  const { error } = await db()
    .from("herreria_puntos")
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Borra el punto y sus archivos, y corre un lugar los que venían después. */
export async function borrarPunto(punto: Punto, todos: Punto[]) {
  const { error } = await db().from("herreria_puntos").delete().eq("id", punto.id);
  if (error) throw error;
  for (const p of todos.filter((x) => x.orden > punto.orden)) {
    await db().from("herreria_puntos").update({ orden: p.orden - 1 }).eq("id", p.id);
  }
  await borrarArchivos([...punto.fotos, ...punto.audios.map((a) => a.url)]);
}

function rutaEnBucket(url: string) {
  const marca = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  return i >= 0 ? decodeURIComponent(url.slice(i + marca.length)) : null;
}

export async function subirArchivo(auditoriaId: string, archivo: Blob, extension: string): Promise<string | null> {
  const path = `${auditoriaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await db().storage.from(BUCKET).upload(path, archivo, { contentType: archivo.type || undefined, upsert: false });
  if (error) {
    console.error("No se pudo subir a herreria:", error.message);
    return null;
  }
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function borrarArchivos(urls: string[]) {
  const rutas = urls.map(rutaEnBucket).filter((r): r is string => Boolean(r));
  if (rutas.length) await db().storage.from(BUCKET).remove(rutas);
}

/** Transcribe (si hay audio) y redacta descripción + recomendación con la IA. */
export async function procesarConIA(params: { audio?: Blob; anterior?: string; texto?: string }) {
  const form = new FormData();
  if (params.audio) form.append("audio", params.audio, `audio.${extensionAudio(params.audio.type)}`);
  if (params.anterior) form.append("anterior", params.anterior);
  if (params.texto != null) form.append("texto", params.texto);
  const res = await fetch("/api/herreria/procesar", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Error ${res.status} procesando el texto`);
  return (await res.json()) as { transcripcion: string; descripcion: string; recomendacion: string };
}

export function extensionAudio(tipo: string) {
  return tipo.includes("mp4") ? "m4a" : tipo.includes("aac") ? "aac" : tipo.includes("ogg") ? "ogg" : "webm";
}
