// Tamaño de cada local según cuántos equipos tiene cargados, en tercios
// sobre TODOS los locales (no solo los del mes).

export type Tamanio = "grande" | "mediano" | "chico";

export const COLOR_TAMANIO: Record<Tamanio, string> = {
  grande: "#d62828", // 🔴
  mediano: "#f2b705", // 🟡
  chico: "#2a9d55", // 🟢
};

export const EMOJI_TAMANIO: Record<Tamanio, string> = { grande: "🔴", mediano: "🟡", chico: "🟢" };

/**
 * Ordena los locales por cantidad de equipos y los parte en tercios. Si en
 * el corte hay empates, los empatados van al grupo de más equipos.
 */
export function tamaniosPorLocal(equiposPorLocal: Record<string, number>): Record<string, Tamanio> {
  const ids = Object.keys(equiposPorLocal);
  const cantidades = ids.map((id) => equiposPorLocal[id]).sort((a, b) => b - a);
  const n = cantidades.length;
  const resultado: Record<string, Tamanio> = {};
  if (n === 0) return resultado;
  const corteGrande = cantidades[Math.max(0, Math.floor(n / 3) - 1)];
  const corteMediano = cantidades[Math.max(0, Math.floor((2 * n) / 3) - 1)];
  for (const id of ids) {
    const c = equiposPorLocal[id];
    // Sin equipos cargados siempre es chico (si no, con todo en 0 saldrían todos rojos).
    resultado[id] = c > 0 && c >= corteGrande ? "grande" : c > 0 && c >= corteMediano ? "mediano" : "chico";
  }
  return resultado;
}
