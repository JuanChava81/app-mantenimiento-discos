"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseConfigured } from "@/lib/supabase";
import { MONTH_NAMES } from "@/lib/real-locations";
import { fetchExportedAt, isVisitCompleted } from "@/lib/visit-completion";
import { Location } from "@/lib/types";
import * as datos from "./datos";
import { OFICINA, codDe, Ubicacion } from "./datos";
import { ajustarOrden, largoKm, linkIr, linksRecorrido, ordenarRecorrido, Punto } from "./ruta";
import { COLOR_TAMANIO, EMOJI_TAMANIO, Tamanio, tamaniosPorLocal } from "./tamanio";
import estilos from "./recorrido.module.css";

// Pantalla "Recorrido del mes": mapa con los locales que tocan este mes, en
// qué orden visitarlos saliendo de la oficina y volviendo, y cuál sigue.

const GRIS = "#9aa0a6";
const VERDE_OSCURO = "#0f3d2e";

interface Parada {
  cod: string;
  loc: Location;
  punto: Punto;
  confirmada: boolean;
  tamanio: Tamanio;
  herreria: boolean;
  visitado: boolean;
}

export default function RecorridoApp({ locations }: { locations: Location[] }) {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const claveMes = `${anio}-${String(mes).padStart(2, "0")}`;

  const [ubic, setUbic] = useState<Record<string, Ubicacion> | null | undefined>(undefined);
  const [equipos, setEquipos] = useState<Record<string, number>>({});
  const [herreria, setHerreria] = useState<Record<string, number>>({});
  const [exportado, setExportado] = useState<Record<string, string>>({});
  const [orden, setOrden] = useState<string[] | null>(null);
  const [aviso, setAviso] = useState("");

  const avisar = useCallback((t: string) => {
    setAviso(t);
    setTimeout(() => setAviso((a) => (a === t ? "" : a)), 3500);
  }, []);

  // Datos que no dependen del mes: se leen una vez al abrir la pantalla.
  useEffect(() => {
    datos.cargarUbicaciones().then(setUbic);
    datos.equiposPorLocal().then(setEquipos);
    datos.mesesHerreria().then(setHerreria);
    fetchExportedAt().then(setExportado);
  }, []);

  // Tamaño (tercios sobre todos los locales) por código.
  const tamanios = useMemo(() => {
    const porId = tamaniosPorLocal(Object.fromEntries(locations.map((l) => [l.id, equipos[l.id] ?? 0])));
    return Object.fromEntries(locations.map((l) => [codDe(l.suc), porId[l.id]])) as Record<string, Tamanio>;
  }, [locations, equipos]);

  // Locales del mes: la misma regla que el plan de visitas.
  const delMes = useMemo(() => locations.filter((l) => l.months.includes(mes)), [locations, mes]);

  const paradas = useMemo(() => {
    const p: Record<string, Parada> = {};
    if (!ubic) return p;
    const enElMes = new Date(anio, mes - 1, 15);
    for (const loc of delMes) {
      const cod = codDe(loc.suc);
      const u = ubic[cod];
      if (!u) continue;
      p[cod] = {
        cod,
        loc,
        punto: { lat: u.lat, lng: u.lng },
        confirmada: u.confirmada,
        tamanio: tamanios[cod] ?? "chico",
        herreria: herreria[cod] === mes,
        visitado: isVisitCompleted(loc, exportado[loc.id], enElMes),
      };
    }
    return p;
  }, [ubic, delMes, tamanios, herreria, exportado, anio, mes]);

  const oficina: Punto | null = ubic?.[OFICINA] ? { lat: ubic[OFICINA].lat, lng: ubic[OFICINA].lng } : null;
  const sinUbicacion = delMes.filter((l) => ubic && !ubic[codDe(l.suc)]);
  const sinConfirmar = Object.values(paradas).filter((p) => !p.confirmada);

  const calcular = useCallback(
    () => (oficina ? ordenarRecorrido(oficina, Object.fromEntries(Object.values(paradas).map((p) => [p.cod, p.punto]))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [oficina?.lat, oficina?.lng, paradas]
  );

  // Orden del mes: el guardado (ajustado a los locales de hoy) o el calculado.
  const clavesParadas = Object.keys(paradas).sort().join();
  useEffect(() => {
    if (!ubic) return;
    let vivo = true;
    datos.cargarOrden(claveMes).then((guardado) => {
      if (!vivo) return;
      const calculado = calcular();
      setOrden(guardado ? ajustarOrden(guardado, Object.keys(paradas), calculado) : calculado);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveMes, clavesParadas, ubic === undefined]);

  const lista = (orden ?? []).filter((c) => paradas[c]).map((c) => paradas[c]);
  const siguiente = lista.find((p) => !p.visitado) ?? null;
  const km = oficina && lista.length ? largoKm(oficina, lista.map((p) => p.punto)) : 0;
  const links = oficina ? linksRecorrido(oficina, lista.map((p) => p.punto)) : [];

  async function cambiarOrden(nuevo: string[], mensaje: string) {
    setOrden(nuevo);
    try {
      await datos.guardarOrden(claveMes, nuevo);
      avisar(mensaje);
    } catch (e) {
      avisar(`No se guardó el orden: ${(e as Error).message}`);
    }
  }

  function mover(i: number, dir: -1 | 1) {
    const nuevo = lista.map((p) => p.cod);
    const j = i + dir;
    if (j < 0 || j >= nuevo.length) return;
    [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
    cambiarOrden(nuevo, "Orden guardado");
  }

  // ---------------------------------------------------------------- mapa
  const divMapa = useRef<HTMLDivElement>(null);
  const mapa = useRef<Leaflet.Map | null>(null);
  const capa = useRef<Leaflet.LayerGroup | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const encuadrado = useRef("");

  useEffect(() => {
    let cancelado = false;
    import("leaflet").then((mod) => {
      if (cancelado || !divMapa.current || mapa.current) return;
      L.current = mod;
      const m = mod.map(divMapa.current, { zoomControl: true, tapHold: true }).setView([-34.88, -56.17], 12);
      mod
        .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        })
        .addTo(m);
      capa.current = mod.layerGroup().addTo(m);
      mapa.current = m;
      setMapaListo(true);
    });
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  const moverMarcador = useCallback(
    async (cod: string, p: Punto) => {
      setUbic((u) => (u ? { ...u, [cod]: { ...p, confirmada: true } } : u));
      try {
        await datos.guardarUbicacion(cod, p);
        avisar(`Ubicación de ${cod === OFICINA ? "la oficina" : cod} guardada ✓`);
      } catch (e) {
        avisar(`No se guardó la ubicación: ${(e as Error).message}`);
      }
    },
    [avisar]
  );

  useEffect(() => {
    const Lf = L.current;
    const m = mapa.current;
    const grupo = capa.current;
    if (!mapaListo || !Lf || !m || !grupo || !oficina) return;
    grupo.clearLayers();

    const arrastrable = (marcador: Leaflet.Marker, cod: string) => {
      // Mantener apretado (o clic derecho) habilita arrastrarlo una vez.
      marcador.on("contextmenu", () => {
        marcador.dragging?.enable();
        avisar(`Arrastrá ${cod === OFICINA ? "la oficina" : cod} a su lugar y soltalo`);
      });
      marcador.on("dragend", () => {
        marcador.dragging?.disable();
        const { lat, lng } = marcador.getLatLng();
        moverMarcador(cod, { lat, lng });
      });
    };

    const camino: Leaflet.LatLngExpression[] = [[oficina.lat, oficina.lng]];
    lista.forEach((p, i) => {
      camino.push([p.punto.lat, p.punto.lng]);
      const esSiguiente = siguiente?.cod === p.cod;
      const tam = esSiguiente ? 40 : 28;
      const fondo = p.visitado ? GRIS : COLOR_TAMANIO[p.tamanio];
      const html =
        `<div class="${estilos.redondo}" style="position:relative;width:${tam}px;height:${tam}px;background:${fondo};` +
        `border:${p.confirmada ? "2px solid #fff" : "2px dashed #fff"};box-shadow:0 1px 4px rgba(0,0,0,.45)` +
        `${esSiguiente ? ",0 0 0 4px rgba(15,61,46,.55)" : ""};color:${p.tamanio === "mediano" && !p.visitado ? "#222" : "#fff"};` +
        `display:flex;align-items:center;justify-content:center;font:700 ${esSiguiente ? 17 : 13}px system-ui,sans-serif">` +
        `${p.visitado ? "✓" : i + 1}` +
        (p.herreria ? `<span style="position:absolute;top:-9px;right:-9px;font-size:13px">🔩</span>` : "") +
        `</div>`;
      const marcador = Lf.marker([p.punto.lat, p.punto.lng], {
        icon: Lf.divIcon({ html, className: "", iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] }),
        zIndexOffset: esSiguiente ? 1000 : p.visitado ? -100 : 0,
        draggable: false,
      });
      marcador.bindPopup(
        `<b>${i + 1} · ${p.cod} ${p.loc.name}</b><br>${p.loc.address}` +
          (p.confirmada ? "" : "<br><i>Ubicación sin confirmar: mantené apretado para moverla</i>")
      );
      arrastrable(marcador, p.cod);
      grupo.addLayer(marcador);
    });
    camino.push([oficina.lat, oficina.lng]);

    grupo.addLayer(Lf.polyline(camino, { color: VERDE_OSCURO, weight: 3, opacity: 0.7, dashArray: "6 6" }));
    const of = Lf.marker([oficina.lat, oficina.lng], {
      icon: Lf.divIcon({
        html: `<div style="width:34px;height:34px;background:${VERDE_OSCURO};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;font-size:18px">🏢</div>`,
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      zIndexOffset: 500,
    }).bindPopup("<b>Oficina Creative</b><br>Salida y llegada del recorrido");
    arrastrable(of, OFICINA);
    grupo.addLayer(of);

    // Encuadrar cuando cambia el mes (no cada vez que se mueve algo).
    if (encuadrado.current !== claveMes && camino.length > 2) {
      m.fitBounds(Lf.latLngBounds(camino), { padding: [30, 30] });
      encuadrado.current = claveMes;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaListo, lista.map((p) => `${p.cod}${p.visitado}${p.punto.lat}${p.punto.lng}${p.confirmada}`).join(), siguiente?.cod, oficina?.lat, oficina?.lng]);

  function centrar(p: Parada) {
    mapa.current?.setView([p.punto.lat, p.punto.lng], 15);
    divMapa.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ------------------------------------------------------------ pantalla
  if (!supabaseConfigured) return <Mensaje texto="Falta conectar Supabase." />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <header className="header-hero">
        <Link href="/" style={{ fontSize: 13, opacity: 0.85 }}>
          ← Plan de visitas
        </Link>
        <div className="flex justify-between items-end mt-2 gap-2">
          <h1 style={{ fontSize: 28 }}>Recorrido</h1>
          <select
            className="field-input"
            style={{ maxWidth: 150, color: "#111" }}
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            aria-label="Mes"
          >
            {MONTH_NAMES.map((n, i) => (
              <option key={n} value={i + 1}>
                {n} {anio}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-between mt-2" style={{ fontSize: 12, opacity: 0.8 }}>
          <span>
            {lista.length} locales · {lista.filter((p) => p.visitado).length} visitados
          </span>
          <span>~{Math.round(km)} km en línea recta</span>
        </div>
      </header>

      {siguiente && (
        <div
          className="card-reg flex items-center gap-3"
          style={{ position: "sticky", top: 0, zIndex: 1100, padding: "10px 16px", borderRadius: 0, background: "var(--color-surface, #fff)" }}
        >
          <div className="flex-1 min-w-0" style={{ fontSize: 13 }}>
            <div style={{ fontSize: 11, opacity: 0.6, textTransform: "uppercase" }}>Siguiente</div>
            <div style={{ fontWeight: 700 }}>
              {lista.indexOf(siguiente) + 1} · {siguiente.cod} {siguiente.loc.name}
            </div>
            <div style={{ opacity: 0.75 }}>
              {siguiente.loc.address} · {EMOJI_TAMANIO[siguiente.tamanio]}
              {siguiente.herreria ? " · 🔩" : ""}
            </div>
          </div>
          <a className="btn btn-primary" style={{ minHeight: 44, padding: "0 18px" }} href={linkIr(siguiente.punto)} target="_blank" rel="noreferrer">
            Ir
          </a>
        </div>
      )}
      {lista.length > 0 && !siguiente && (
        <div style={{ padding: "10px 16px", fontSize: 13, background: "var(--color-accent-100)" }}>✓ Todos los locales del mes están visitados.</div>
      )}

      {ubic === null && (
        <Mensaje texto="Falta crear las tablas del recorrido: pegá supabase/recorrido_v1.sql en Supabase → SQL Editor → Run." />
      )}

      <div ref={divMapa} style={{ height: "55vh", minHeight: 300, width: "100%", zIndex: 0 }} />

      <div className="p-4 flex flex-col gap-3">
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          🔴 grande · 🟡 mediano · 🟢 chico · 🔩 también herrería · ⚪ ya visitado · 🏢 oficina
        </div>

        {(sinConfirmar.length > 0 || sinUbicacion.length > 0) && (
          <div style={{ fontSize: 12, background: "var(--color-accent-100)", padding: "8px 10px" }}>
            {sinConfirmar.length > 0 && (
              <div>
                ⚠️ Ubicación sin confirmar (borde punteado): {sinConfirmar.map((p) => p.cod).join(", ")}. Mantené apretado el marcador y
                arrastralo a su lugar.
              </div>
            )}
            {sinUbicacion.length > 0 && <div>⚠️ Sin ubicación: {sinUbicacion.map((l) => codDe(l.suc)).join(", ")} (no entran en el recorrido).</div>}
          </div>
        )}

        <div className="flex gap-2">
          <button
            className="btn btn-ghost flex-1"
            disabled={!oficina || lista.length === 0}
            onClick={() => cambiarOrden(calcular(), "Recorrido recalculado")}
          >
            Reordenar
          </button>
        </div>
        {links.map((href, i) => (
          <a key={href} className="btn btn-primary btn-block" href={href} target="_blank" rel="noreferrer">
            {links.length === 1 ? "Todo el recorrido en Google Maps" : `Recorrido en Google Maps · Parte ${i + 1}`}
          </a>
        ))}

        {orden === null && ubic !== null && <p style={{ fontSize: 13, opacity: 0.6 }}>Cargando…</p>}

        <div className="flex flex-col gap-2">
          {lista.map((p, i) => (
            <div key={p.cod} className="card-reg flex items-center gap-2 p-2" style={siguiente?.cod === p.cod ? { outline: `2px solid ${VERDE_OSCURO}` } : undefined}>
              <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => centrar(p)}>
                <span
                  className={estilos.redondo}
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    background: p.visitado ? GRIS : COLOR_TAMANIO[p.tamanio],
                    color: p.tamanio === "mediano" && !p.visitado ? "#222" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {p.visitado ? "✓" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span style={{ fontWeight: 700 }}>
                    {p.cod} {p.loc.name}
                  </span>
                  <span className="block" style={{ fontSize: 12, opacity: 0.7 }}>
                    {p.loc.address}
                  </span>
                  <span className="block" style={{ fontSize: 12 }}>
                    {EMOJI_TAMANIO[p.tamanio]} {equipos[p.loc.id] ?? 0} equipos{p.herreria ? " · 🔩 herrería" : ""}
                    {p.visitado ? " · ✓ visitado" : ""}
                    {p.confirmada ? "" : " · ⚠️ ubicación sin confirmar"}
                  </span>
                </span>
              </button>
              <span className="flex flex-col gap-1">
                <button className="btn btn-ghost" style={{ minHeight: 28, padding: "0 8px" }} disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">
                  ↑
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ minHeight: 28, padding: "0 8px" }}
                  disabled={i === lista.length - 1}
                  onClick={() => mover(i, 1)}
                  aria-label="Bajar"
                >
                  ↓
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {aviso && (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 20,
            zIndex: 2000,
            background: "#222",
            color: "#fff",
            padding: "10px 14px",
            fontSize: 13,
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          {aviso}
        </div>
      )}
    </div>
  );
}

function Mensaje({ texto }: { texto: string }) {
  return <div style={{ padding: 16, fontSize: 14 }}>{texto}</div>;
}
