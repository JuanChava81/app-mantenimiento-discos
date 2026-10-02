import JSZip from "jszip";
import { Auditoria, Punto, Sitio } from "./tipos";

// Export de una auditoría de herrería. El formato es un CONTRATO con la
// skill de Cowork "informe-herreria": no cambiar nombres de archivos, ni
// claves del JSON, ni su orden.
//
//   HER_<cod>_<AAAA-MM-DD>.zip
//     herreria.json
//     herreria.txt
//     fotos/P01_foto1.jpg ...
//     audios/P01_audio1.<ext>   (opcional)

export interface ArchivoBajado {
  data: Uint8Array | ArrayBuffer | Blob;
  extension: string; // para audios; las fotos siempre van .jpg
}

/** Baja una foto ya convertida a JPG, o null si no se pudo. */
export type BajarFoto = (url: string) => Promise<ArchivoBajado | null>;
/** Baja un audio tal cual, o null si no se pudo. */
export type BajarAudio = (url: string) => Promise<ArchivoBajado | null>;

export function nombreZip(sitio: Sitio, auditoria: Auditoria) {
  return `HER_${sitio.cod}_${auditoria.fecha}.zip`;
}

const pp = (n: number) => `P${String(n).padStart(2, "0")}`;

/**
 * Arma el ZIP. Los puntos van en orden y se numeran 1, 2, 3... por su
 * posición (así no quedan huecos si se borró o reordenó alguno). Las fotos
 * van en el orden en que llegaron. Si una foto no se pudo bajar, no se
 * lista. Devuelve el ZIP y cuántos archivos fallaron.
 */
export async function armarZip(
  sitio: Sitio,
  auditoria: Auditoria,
  puntosDesordenados: Punto[],
  bajarFoto: BajarFoto,
  bajarAudio: BajarAudio
) {
  const zip = new JSZip();
  const puntos = [...puntosDesordenados].sort((a, b) => a.orden - b.orden);
  let fallidos = 0;

  const json = {
    version: 1,
    sitio: { cod: sitio.cod, nombre: sitio.nombre, rotulo: sitio.rotulo, archivo: sitio.archivo },
    fecha: auditoria.fecha,
    ciclo: auditoria.ciclo,
    comentario_general: auditoria.comentario_general ?? "",
    puntos: [] as {
      orden: number;
      descripcion: string;
      recomendacion: string;
      transcripcion: string;
      fotos: string[];
    }[],
  };

  for (const [i, punto] of puntos.entries()) {
    const orden = i + 1;
    const fotos: string[] = [];
    const bajadas = await Promise.all(punto.fotos.map((u) => bajarFoto(u).catch(() => null)));
    bajadas.forEach((archivo) => {
      if (!archivo) {
        fallidos++;
        return;
      }
      const ruta = `fotos/${pp(orden)}_foto${fotos.length + 1}.jpg`;
      zip.file(ruta, archivo.data);
      fotos.push(ruta);
    });

    const audios = await Promise.all((punto.audios ?? []).map((a) => bajarAudio(a.url).catch(() => null)));
    let nAudio = 0;
    audios.forEach((archivo) => {
      if (!archivo) return; // los audios son opcionales
      nAudio++;
      zip.file(`audios/${pp(orden)}_audio${nAudio}.${archivo.extension}`, archivo.data);
    });

    json.puntos.push({
      orden,
      descripcion: punto.descripcion ?? "",
      recomendacion: punto.recomendacion ?? "",
      transcripcion: punto.transcripcion ?? "",
      fotos,
    });
  }

  zip.file("herreria.json", JSON.stringify(json, null, 2));
  zip.file("herreria.txt", textoLegible(json));
  return { zip, json, fallidos };
}

function textoLegible(j: {
  sitio: { rotulo: string };
  fecha: string;
  ciclo: string;
  comentario_general: string;
  puntos: { orden: number; descripcion: string; recomendacion: string; transcripcion: string; fotos: string[] }[];
}) {
  const [a, m, d] = j.fecha.split("-");
  let t = `AUDITORÍA DE HERRERÍA\nLocal: ${j.sitio.rotulo}\nFecha: ${d}/${m}/${a}\nCiclo: ${j.ciclo}\n`;
  if (j.comentario_general.trim()) t += `\nComentario general:\n${j.comentario_general.trim()}\n`;
  t += `\n${"=".repeat(48)}\n`;
  for (const p of j.puntos) {
    t += `\n${pp(p.orden)}\n`;
    t += `Descripción: ${p.descripcion || "—"}\n`;
    t += `Recomendación: ${p.recomendacion || "—"}\n`;
    if (p.transcripcion) t += `Lo que dijo el técnico: ${p.transcripcion}\n`;
    t += `Fotos: ${p.fotos.length ? p.fotos.join(", ") : "—"}\n`;
  }
  const recs = j.puntos.filter((p) => p.recomendacion.trim());
  t += `\n${"=".repeat(48)}\nRECOMENDACIONES (${recs.length})\n`;
  recs.forEach((p) => (t += `- ${pp(p.orden)}: ${p.recomendacion}\n`));
  return t;
}

// ---- Navegador: bajar y convertir a JPG ----

async function aJpg(blob: Blob): Promise<Blob> {
  if (blob.type === "image/jpeg") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const jpg: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.9));
  if (!jpg) throw new Error("No se pudo convertir a JPG");
  return jpg;
}

export const bajarFotoNavegador: BajarFoto = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return { data: await aJpg(await res.blob()), extension: "jpg" };
};

export const bajarAudioNavegador: BajarAudio = async (url) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  const extension = url.split("?")[0].split(".").pop() || "webm";
  return { data: await res.blob(), extension };
};

/** Arma el ZIP en el navegador y lo descarga. */
export async function exportarAuditoria(sitio: Sitio, auditoria: Auditoria, puntos: Punto[]) {
  const { zip, fallidos } = await armarZip(sitio, auditoria, puntos, bajarFotoNavegador, bajarAudioNavegador);
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombreZip(sitio, auditoria);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  return { fallidos };
}
