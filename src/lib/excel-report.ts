import ExcelJS from "exceljs";
import { categoryById } from "./categories";
import { Equipment, EquipmentData, Location } from "./types";

const STATUS_LABEL: Record<string, string> = { ok: "OK", falla: "No OK", pendiente: "Pendiente" };
const STATUS_FILL: Record<string, string> = { ok: "FFDCEFDD", falla: "FF4A0A0D", pendiente: "FFF7EDED" };
const STATUS_FONT: Record<string, string> = { ok: "FF1D6B2C", falla: "FFFFFFFF", pendiente: "FF7C1116" };

const ACCENT = "FFD21F2B";
const DARK = "FF4A0A0D";

// Tamaños de imagen en píxeles a 96dpi. La altura de fila necesaria en
// puntos es aprox. px * 0.75 — así la foto entra completa antes del salto
// de página, en vez de quedar cortada entre dos hojas impresas.
const PRIMARY_W = 340;
const PRIMARY_H = 255;
const THUMB_W = 100;
const THUMB_H = 75;

function pxToRowPoints(px: number) {
  return Math.ceil(px * 0.75) + 4;
}

async function fetchImage(url: string): Promise<{ buffer: ArrayBuffer; extension: "jpeg" | "png" } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const extension = blob.type.includes("png") ? "png" : "jpeg";
    return { buffer, extension };
  } catch {
    return null;
  }
}

export async function generateVisitExcel(
  location: Location,
  visitDate: string,
  equipmentList: Equipment[],
  data: Record<string, EquipmentData>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Informe", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  sheet.columns = [{ width: 3 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }];

  const [yyyy, mm, dd] = [visitDate.slice(0, 4), visitDate.slice(5, 7), visitDate.slice(8, 10)];

  let row = 1;

  function titleRow(text: string, bg: string, color: string, size = 14) {
    sheet.mergeCells(row, 2, row, 5);
    const cell = sheet.getCell(row, 2);
    cell.value = text;
    cell.font = { bold: true, size, color: { argb: color } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(row).height = size + 14;
    row++;
  }

  function labelValueRow(label: string, value: string, opts?: { bg?: string; color?: string }) {
    sheet.getCell(row, 2).value = label;
    sheet.getCell(row, 2).font = { bold: true, size: 10 };
    sheet.mergeCells(row, 3, row, 5);
    const valueCell = sheet.getCell(row, 3);
    valueCell.value = value;
    valueCell.font = { size: 10, color: opts?.color ? { argb: opts.color } : undefined };
    if (opts?.bg) valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } };
    row++;
  }

  titleRow(`${location.suc} · ${location.name}`, DARK, "FFFFFFFF", 16);
  labelValueRow("Dirección", location.address);
  labelValueRow("Cadena", location.chain);
  labelValueRow("Fecha de visita", `${dd}/${mm}/${yyyy}`);
  row++;

  const byCategory = new Map<string, Equipment[]>();
  for (const eq of equipmentList) {
    const list = byCategory.get(eq.category) ?? [];
    list.push(eq);
    byCategory.set(eq.category, list);
  }

  for (const [categoryId, eqs] of byCategory) {
    const cat = categoryById(categoryId);
    titleRow(cat.name.toUpperCase(), ACCENT, "FFFFFFFF", 13);
    row++;

    for (const eq of eqs) {
      const eqData = data[eq.id];
      if (!eqData) continue;

      const startRow = row;

      sheet.mergeCells(row, 2, row, 5);
      const codeCell = sheet.getCell(row, 2);
      codeCell.value = `${eq.code} — ${eq.subtype}`;
      codeCell.font = { bold: true, size: 12 };
      row++;

      const status = eqData.status;
      labelValueRow("Estado general", STATUS_LABEL[status] ?? status, {
        bg: STATUS_FILL[status],
        color: STATUS_FONT[status],
      });

      for (const check of cat.checks) {
        const value = eqData.checks[check.id] ?? "—";
        labelValueRow(
          check.label,
          value,
          value === "No OK" ? { bg: "FFFDECEC", color: "FFA8171F" } : undefined
        );
      }
      for (const field of cat.fields) {
        const value = eqData.fields[field.id];
        labelValueRow(field.label, value ? `${value}${field.unit}` : "—");
      }

      sheet.getCell(row, 2).value = "Observación";
      sheet.getCell(row, 2).font = { bold: true, size: 10 };
      sheet.getCell(row, 2).alignment = { vertical: "top" };
      sheet.mergeCells(row, 3, row, 5);
      const obsCell = sheet.getCell(row, 3);
      obsCell.value = eqData.comment || "—";
      obsCell.font = { size: 10, italic: !eqData.comment };
      obsCell.alignment = { wrapText: true, vertical: "top" };
      sheet.getRow(row).height = 30;
      row++;

      // Foto principal (primer elemento del array) — más grande, primero.
      if (eqData.photos.length > 0) {
        const primary = await fetchImage(eqData.photos[0]);
        if (primary) {
          const imageId = workbook.addImage(primary);
          const photoRow = row;
          sheet.addImage(imageId, {
            tl: { col: 1.05, row: photoRow - 1 + 0.05 },
            ext: { width: PRIMARY_W, height: PRIMARY_H },
          });
          sheet.getRow(photoRow).height = pxToRowPoints(PRIMARY_H);
          row++;
        }

        // Resto de las fotos, más chicas, en fila debajo de la principal.
        const rest = eqData.photos.slice(1, 5);
        if (rest.length > 0) {
          const thumbRow = row;
          let col = 1.05;
          for (const url of rest) {
            const img = await fetchImage(url);
            if (!img) continue;
            const imageId = workbook.addImage(img);
            sheet.addImage(imageId, {
              tl: { col, row: thumbRow - 1 + 0.05 },
              ext: { width: THUMB_W, height: THUMB_H },
            });
            col += THUMB_W / 64; // ancho de columna aprox 64px
          }
          sheet.getRow(thumbRow).height = pxToRowPoints(THUMB_H);
          row++;
        }
      } else {
        sheet.getCell(row, 2).value = "(sin fotos)";
        sheet.getCell(row, 2).font = { italic: true, size: 9, color: { argb: "FF999999" } };
        row++;
      }

      row++; // espacio entre equipos

      // Salto de página después de cada equipo con fotos, para que la
      // imagen no quede cortada entre dos hojas impresas.
      if (eqData.photos.length > 0) {
        sheet.getRow(row - 1).addPageBreak();
      }

      void startRow;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const slug = (t: string) => t.trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
  link.download = `${slug(location.suc)}_${slug(location.name)}_${yyyy}-${mm}-${dd}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
