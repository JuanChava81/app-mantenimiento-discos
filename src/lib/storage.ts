import { supabase, supabaseConfigured } from "./supabase";

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Sube una foto/audio a Supabase Storage y devuelve la URL pública.
 * Si Supabase no está configurado, devuelve null y el llamador cae a un
 * blob local (solo visible en este dispositivo).
 */
export async function uploadToStorage(
  bucket: "photos" | "audios",
  equipmentId: string,
  file: Blob,
  extension: string
): Promise<string | null> {
  if (!supabaseConfigured || !supabase) return null;

  const path = `${equipmentId}/${Date.now()}-${randomSuffix()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) {
    console.error(`No se pudo subir a ${bucket}:`, error.message);
    return null;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
