import JSZip from "jszip";
import { categoryById } from "./categories";
import { equipmentPhotoCode } from "./equipment-code";
import { Equipment, EquipmentData, Location } from "./types";

const STATUS_LABEL: Record<string, string> = { ok: "OK", falla: "No OK", pendiente: "Pendiente" };

function slug(text: string) {
  return text.trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  return res.blob();
}

// Descarga varias URLs en paralelo (con un tope de conexiones a la vez,
// en vez de sin límite) en lugar de una por una en secuencia — con una
// visita de varios equipos y decenas de fotos cada uno, hacerlo de a una
// es lo que hacía tardar tanto el export.
async function descargarEnParalelo<T>(items: T[], concurrencia: number, worker: (item: T) => Promise<void>) {
  let siguiente = 0;
  async function tomarSiguiente() {
    while (siguiente < items.length) {
      const item = items[siguiente++];
      await worker(item);
    }
  }
  const trabajadores = Array.from({ length: Math.min(concurrencia, items.length) }, tomarSiguiente);
  await Promise.all(trabajadores);
}

function extFromBlob(blob: Blob, kind: "photo" | "audio") {
  const type = blob.type || "";
  if (kind === "photo") return type.includes("png") ? "png" : "jpg";
  if (type.includes("mp4")) return "m4a";
  if (type.includes("aac")) return "aac";
  return "webm";
}

export async function exportVisitZip(
  location: Location,
  visitDate: string,
  equipmentList: Equipment[],
  data: Record<string, EquipmentData>
): Promise<void> {
  const zip = new JSZip();

  const [yyyy, mm, dd] = [visitDate.slice(0, 4), visitDate.slice(5, 7), visitDate.slice(8, 10)];

  let report = `Local: ${location.suc} · ${location.name}\n`;
  report += `Dirección: ${location.address}\n`;
  report += `Fecha de visita: ${dd}/${mm}/${yyyy}\n`;
  report += `\n${"=".repeat(48)}\n\n`;

  // Primero armamos el texto del informe y la lista de archivos a bajar
  // (todo sincrónico, sin esperar red), y recién después los descargamos
  // todos juntos en paralelo — así el tiempo de export depende de la foto
  // más lenta, no de la suma de todas.
  const descargas: { url: string; kind: "photo" | "audio"; path: (ext: string) => string }[] = [];

  for (const eq of equipmentList) {
    const cat = categoryById(eq.category);
    const folder = slug(cat.name);
    const eqData = data[eq.id];
    if (!eqData) continue;

    report += `${cat.name} · ${eq.code} (${eq.subtype})\n`;
    report += `Estado: ${STATUS_LABEL[eqData.status] ?? eqData.status}\n`;
    for (const check of cat.checks) {
      report += `  ${check.label}: ${eqData.checks[check.id] ?? "—"}\n`;
    }
    for (const field of cat.fields) {
      const value = eqData.fields[field.id];
      report += `  ${field.label}: ${value ? `${value}${field.unit}` : "—"}\n`;
    }
    report += `  Observación: ${eqData.comment || "—"}\n`;
    report += `  Fotos: ${eqData.photos.length} · Notas de voz: ${eqData.audios.length}\n\n`;

    const photoCode = equipmentPhotoCode(eq);
    for (let i = 0; i < eqData.photos.length; i++) {
      const url = eqData.photos[i];
      descargas.push({ url, kind: "photo", path: (ext) => `${folder}/${photoCode}_foto${i + 1}.${ext}` });
    }
    for (let i = 0; i < eqData.audios.length; i++) {
      const url = eqData.audios[i].url;
      descargas.push({ url, kind: "audio", path: (ext) => `${folder}/${eq.code}_nota${i + 1}.${ext}` });
    }
  }

  await descargarEnParalelo(descargas, 6, async ({ url, kind, path }) => {
    try {
      const blob = await urlToBlob(url);
      zip.file(path(extFromBlob(blob, kind)), blob);
    } catch {
      // si un archivo no se puede descargar (ej. blob local vencido), seguimos con el resto
    }
  });

  zip.file("informe.txt", report);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug(location.suc)}_${slug(location.name)}_${yyyy}-${mm}-${dd}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
