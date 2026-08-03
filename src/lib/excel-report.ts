import ExcelJS from "exceljs";
import { CATEGORIES, categoryById } from "./categories";
import { CategoryId, Equipment, EquipmentData, Location } from "./types";

const HEADER_GRAY = "FFE7E4E1";
const COMMENTS_BG = "FFEDE7E0";
const CAPTION_BG = "FF1A1A1A";

// Prefijos de código para las fotos/tabla de aires acondicionados, según
// el subtipo — igual al criterio de la planilla original del usuario
// (S_01 Split, R_01 Rooftop, CH_01 Chiller, M_01 Manejadora).
const AC_SUBTYPE_PREFIX: Record<string, string> = {
  Split: "S",
  Rooftop: "R",
  Chiller: "CH",
  Manejadora: "M",
};

function acShortCode(eq: Equipment): string {
  const prefix = AC_SUBTYPE_PREFIX[eq.subtype] ?? eq.subtype.slice(0, 1).toUpperCase();
  return `${prefix}_${String(eq.number).padStart(2, "0")}`;
}

function photoCode(eq: Equipment): string {
  return eq.category === "ac" ? acShortCode(eq) : eq.code;
}

// Tamaño de foto en la grilla (px a 96dpi) y su cartelito de código abajo.
const GRID_COLS = 6;
const PHOTO_W = 108;
const PHOTO_H = 90;
const CAPTION_H = 18;
const COL_WIDTH_UNITS = 15; // ancho de columna Excel ~ COL_WIDTH_UNITS*7px

function pxToRowPoints(px: number) {
  return Math.ceil(px * 0.75) + 2;
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
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    },
  });

  const NUM_COLS = 9;
  sheet.columns = [
    { width: 3 },
    ...Array.from({ length: NUM_COLS - 1 }, () => ({ width: COL_WIDTH_UNITS })),
  ];

  const [yyyy, mm, dd] = [visitDate.slice(0, 4), visitDate.slice(5, 7), visitDate.slice(8, 10)];

  let row = 1;

  // ---- Encabezado: logo (placeholder) + SUCURSAL / FECHA ----
  // El logo se agrega en una próxima vuelta cuando el usuario mande el
  // archivo de imagen — por ahora queda este espacio reservado en fila 1-3.
  row = 4;

  function fieldBox(label: string, value: string, colStart: number, colEnd: number) {
    sheet.getCell(row, colStart).value = label;
    sheet.getCell(row, colStart).font = { bold: true, size: 11 };
    sheet.mergeCells(row, colStart + 1, row, colEnd);
    const box = sheet.getCell(row, colStart + 1);
    box.value = value;
    box.font = { bold: true, size: 13 };
    box.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
    box.alignment = { vertical: "middle", horizontal: "center" };
  }

  fieldBox("SUCURSAL:", `${location.suc} · ${location.name}`, 2, 4);
  fieldBox("FECHA:", `${dd}.${mm}.${yyyy}`, 6, 8);
  sheet.getRow(row).height = 22;
  row += 2;

  const byCategory = new Map<CategoryId, Equipment[]>();
  for (const eq of equipmentList) {
    const list = byCategory.get(eq.category) ?? [];
    list.push(eq);
    byCategory.set(eq.category, list);
  }

  let sectionNumber = 1;
  for (const cat of CATEGORIES) {
    const eqs = byCategory.get(cat.id);
    if (!eqs || eqs.length === 0) continue;

    // ---- Barra de sección gris ----
    sheet.mergeCells(row, 2, row, NUM_COLS);
    const sectionCell = sheet.getCell(row, 2);
    sectionCell.value = `${sectionNumber}  ${cat.name.toUpperCase()}`;
    sectionCell.font = { bold: true, size: 12, color: { argb: "FF444444" } };
    sectionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_GRAY } };
    sectionCell.alignment = { vertical: "middle", indent: 1 };
    sheet.getRow(row).height = 20;
    row += 2;
    sectionNumber++;

    if (cat.id === "ac") {
      row = renderAcTable(sheet, row, eqs, data);
    } else {
      row = renderChecklistTables(sheet, row, cat, eqs, data);
    }

    row = renderComments(sheet, row, eqs, data);
    row += 1;

    row = await renderPhotoGallery(workbook, sheet, row, eqs, data);
    row += 2;
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

// ---- Tabla grande de aires acondicionados (una fila por equipo). ----
// Las columnas de puntaje (Intercambiadores, Gabinete, etc.) quedan en
// blanco: la app no carga esos valores numéricos todavía, se completan a
// mano — se deja la tabla igual que la planilla original para que sea
// facil de ajustar.
const AC_TABLE_HEADERS = [
  "Código Equipo",
  "Intercambiadores",
  "Gabinete",
  "Desagües/Aislac.",
  "Eléctrica",
  "CD/CI Equipo",
  "TR",
  "Estado del equipo",
  "Vigencia tecnológica",
];

function renderAcTable(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  eqs: Equipment[],
  data: Record<string, EquipmentData>
): number {
  let row = startRow;
  for (let i = 0; i < AC_TABLE_HEADERS.length; i++) {
    const cell = sheet.getCell(row, 2 + i);
    cell.value = AC_TABLE_HEADERS[i];
    cell.font = { bold: true, size: 9 };
    cell.alignment = { wrapText: true, vertical: "bottom", horizontal: "center" };
    cell.border = { bottom: { style: "thin" } };
  }
  sheet.getRow(row).height = 26;
  row++;

  for (const eq of eqs) {
    const eqData = data[eq.id];
    sheet.getCell(row, 2).value = acShortCode(eq);
    sheet.getCell(row, 2).font = { size: 10 };
    for (let c = 3; c <= 10; c++) {
      sheet.getCell(row, c).border = { bottom: { style: "hair" } };
    }
    void eqData;
    row++;
  }
  return row + 1;
}

// ---- Tablas Item / Estado / Observaciones para el resto de categorías ----
// (UPS, Generador, Gas, Subestación) — usa las verificaciones reales que
// carga la app (OK / No OK), coloreadas igual que en el checklist.
function renderChecklistTables(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  cat: ReturnType<typeof categoryById>,
  eqs: Equipment[],
  data: Record<string, EquipmentData>
): number {
  let row = startRow;

  for (const eq of eqs) {
    const eqData = data[eq.id];
    if (!eqData) continue;

    sheet.mergeCells(row, 2, row, 4);
    sheet.getCell(row, 2).value = `${eq.code}${eqs.length > 1 ? ` — ${eq.subtype}` : ""}`;
    sheet.getCell(row, 2).font = { bold: true, size: 10 };
    sheet.getCell(row, 5).value = "Estado";
    sheet.getCell(row, 5).font = { bold: true, size: 9 };
    sheet.mergeCells(row, 6, row, NUM_COLS_CONST);
    sheet.getCell(row, 6).value = "Observaciones";
    sheet.getCell(row, 6).font = { bold: true, size: 9 };
    row++;

    for (const check of cat.checks) {
      const value = eqData.checks[check.id] ?? "—";
      sheet.mergeCells(row, 2, row, 4);
      sheet.getCell(row, 2).value = check.label;
      sheet.getCell(row, 2).font = { size: 10 };
      const statusCell = sheet.getCell(row, 5);
      statusCell.value = value;
      statusCell.alignment = { horizontal: "center" };
      if (value === "No OK") {
        statusCell.font = { size: 10, bold: true, color: { argb: "FFA8171F" } };
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDECEC" } };
      } else {
        statusCell.font = { size: 10, color: { argb: "FF1D6B2C" } };
      }
      row++;
    }
    for (const field of cat.fields) {
      const value = eqData.fields[field.id];
      sheet.mergeCells(row, 2, row, 4);
      sheet.getCell(row, 2).value = field.label;
      sheet.getCell(row, 2).font = { size: 10 };
      sheet.mergeCells(row, 5, row, NUM_COLS_CONST);
      sheet.getCell(row, 5).value = value ? `${value}${field.unit}` : "—";
      sheet.getCell(row, 5).font = { size: 10 };
      row++;
    }
    row++;
  }
  return row;
}

const NUM_COLS_CONST = 9;

// ---- Sección "Comentarios:" — código + observación, una fila por equipo ----
function renderComments(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  eqs: Equipment[],
  data: Record<string, EquipmentData>
): number {
  const withComments = eqs.filter((eq) => data[eq.id]?.comment);
  if (withComments.length === 0) return startRow;

  let row = startRow;
  sheet.mergeCells(row, 2, row, NUM_COLS_CONST);
  const header = sheet.getCell(row, 2);
  header.value = "Comentarios:";
  header.font = { bold: true, size: 10 };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COMMENTS_BG } };
  row++;

  for (const eq of withComments) {
    const code = eq.category === "ac" ? acShortCode(eq) : eq.code;
    sheet.getCell(row, 2).value = code;
    sheet.getCell(row, 2).font = { bold: true, size: 10 };
    sheet.getCell(row, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COMMENTS_BG } };
    sheet.mergeCells(row, 3, row, NUM_COLS_CONST);
    const commentCell = sheet.getCell(row, 3);
    commentCell.value = data[eq.id].comment;
    commentCell.font = { size: 10 };
    commentCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COMMENTS_BG } };
    commentCell.alignment = { wrapText: true };
    row++;
  }
  return row;
}

// ---- Galería de fotos de toda la categoría, con cartelito negro debajo
// de cada una indicando el código del equipo (ej. "S_01", "R_02"). ----
async function renderPhotoGallery(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  startRow: number,
  eqs: Equipment[],
  data: Record<string, EquipmentData>
): Promise<number> {
  const photos: { url: string; code: string }[] = [];
  for (const eq of eqs) {
    const eqData = data[eq.id];
    if (!eqData) continue;
    for (const url of eqData.photos) {
      photos.push({ url, code: photoCode(eq) });
    }
  }
  if (photos.length === 0) return startRow;

  let row = startRow;
  let col = 0;

  for (const photo of photos) {
    const img = await fetchImage(photo.url);
    if (img) {
      const imageId = workbook.addImage(img);
      const colStart = 2 + col;
      sheet.addImage(imageId, {
        tl: { col: colStart - 1 + 0.05, row: row - 1 + 0.05 },
        ext: { width: PHOTO_W, height: PHOTO_H },
      });
      const captionCell = sheet.getCell(row + 1, colStart);
      captionCell.value = photo.code;
      captionCell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
      captionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CAPTION_BG } };
      captionCell.alignment = { horizontal: "center", vertical: "middle" };
    }

    col++;
    if (col >= GRID_COLS) {
      col = 0;
      sheet.getRow(row).height = pxToRowPoints(PHOTO_H);
      sheet.getRow(row + 1).height = pxToRowPoints(CAPTION_H);
      row += 2;
    }
  }

  if (col !== 0) {
    sheet.getRow(row).height = pxToRowPoints(PHOTO_H);
    sheet.getRow(row + 1).height = pxToRowPoints(CAPTION_H);
    row += 2;
  }

  return row;
}
