// Orden del recorrido del mes y links de Google Maps. Todo en línea recta
// (haversine): son pocos locales y no hace falta ningún servicio pago.

export interface Punto {
  lat: number;
  lng: number;
}

/** Distancia en km entre dos puntos. */
export function distanciaKm(a: Punto, b: Punto): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Largo total saliendo de `origen`, pasando por `paradas` en orden y volviendo. */
export function largoKm(origen: Punto, paradas: Punto[]): number {
  const camino = [origen, ...paradas, origen];
  let total = 0;
  for (let i = 0; i < camino.length - 1; i++) total += distanciaKm(camino[i], camino[i + 1]);
  return total;
}

/**
 * Orden de visita que sale de `origen` y vuelve: vecino más cercano y
 * después mejora 2-opt (da vuelta tramos mientras el recorrido se acorte).
 * Devuelve las claves en el orden a visitar.
 */
export function ordenarRecorrido(origen: Punto, paradas: Record<string, Punto>): string[] {
  const pendientes = new Set(Object.keys(paradas));
  const orden: string[] = [];
  let actual = origen;
  while (pendientes.size > 0) {
    let mejor = "";
    let mejorD = Infinity;
    for (const k of [...pendientes].sort()) {
      const d = distanciaKm(actual, paradas[k]);
      if (d < mejorD) {
        mejorD = d;
        mejor = k;
      }
    }
    orden.push(mejor);
    pendientes.delete(mejor);
    actual = paradas[mejor];
  }

  // 2-opt con la oficina fija al principio y al final.
  const pt = (i: number) => (i < 0 || i >= orden.length ? origen : paradas[orden[i]]);
  let mejoro = true;
  while (mejoro) {
    mejoro = false;
    for (let i = 0; i < orden.length - 1; i++) {
      for (let j = i + 1; j < orden.length; j++) {
        const antes = distanciaKm(pt(i - 1), pt(i)) + distanciaKm(pt(j), pt(j + 1));
        const despues = distanciaKm(pt(i - 1), pt(j)) + distanciaKm(pt(i), pt(j + 1));
        if (despues < antes - 1e-9) {
          orden.splice(i, j - i + 1, ...orden.slice(i, j + 1).reverse());
          mejoro = true;
        }
      }
    }
  }
  return orden;
}

/**
 * Orden guardado del mes ajustado a los locales de hoy: saca los que ya no
 * están y agrega al final los nuevos (en el orden que da `ordenarRecorrido`).
 */
export function ajustarOrden(guardado: string[], actuales: string[], calculado: string[]): string[] {
  const set = new Set(actuales);
  const base = guardado.filter((k) => set.has(k));
  const faltan = calculado.filter((k) => !base.includes(k));
  return [...base, ...faltan];
}

/** Google Maps admite hasta 9 paradas intermedias por link. */
export const MAX_PARADAS_GOOGLE = 9;

const coord = (p: Punto) => `${p.lat},${p.lng}`;

/** Navegación de Google Maps hasta un punto. */
export function linkIr(p: Punto): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${coord(p)}&travelmode=driving`;
}

/**
 * Links de Google Maps para todo el recorrido (oficina → paradas → oficina).
 * Si hay más de 9 paradas se parte en varios links: cada uno arranca donde
 * terminó el anterior.
 */
export function linksRecorrido(origen: Punto, paradas: Punto[]): string[] {
  const camino = [origen, ...paradas, origen];
  const links: string[] = [];
  let i = 0;
  while (i < camino.length - 1) {
    const j = Math.min(i + MAX_PARADAS_GOOGLE + 1, camino.length - 1);
    const intermedias = camino.slice(i + 1, j);
    let url = `https://www.google.com/maps/dir/?api=1&origin=${coord(camino[i])}&destination=${coord(camino[j])}&travelmode=driving`;
    if (intermedias.length) url += `&waypoints=${intermedias.map(coord).join("%7C")}`;
    links.push(url);
    i = j;
  }
  return links;
}
