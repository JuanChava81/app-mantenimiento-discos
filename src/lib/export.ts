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
      try {
        const blob = await urlToBlob(eqData.photos[i]);
        zip.file(`${folder}/${photoCode}_foto${i + 1}.${extFromBlob(blob, "photo")}`, blob);
      } catch {
        // si una foto no se puede descargar (ej. blob local vencido), seguimos con el resto
      }
    }
    for (let i = 0; i < eqData.audios.length; i++) {
      try {
        const blob = await urlToBlob(eqData.audios[i].url);
        zip.file(`${folder}/${eq.code}_nota${i + 1}.${extFromBlob(blob, "audio")}`, blob);
      } catch {
        // ídem para audios
      }
    }
  }

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
