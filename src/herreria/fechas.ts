const ZONA = "America/Montevideo";

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Fecha de hoy en Uruguay, "AAAA-MM-DD". */
export function hoyISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(now);
}

export function mesDe(fechaISO: string) {
  return Number(fechaISO.slice(5, 7));
}

/** Ciclo de la orden de trabajo anual: de mayo a abril. "2026-09-14" → "2026-2027". */
export function cicloDe(fechaISO: string) {
  const [anio, mes] = fechaISO.split("-").map(Number);
  const inicio = mes >= 5 ? anio : anio - 1;
  return `${inicio}-${inicio + 1}`;
}

/** "2026-09-14" → "14/09/2026" */
export function fechaLarga(fechaISO: string) {
  const [a, m, d] = fechaISO.split("-");
  return `${d}/${m}/${a}`;
}
