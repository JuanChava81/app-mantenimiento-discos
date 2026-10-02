"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { compressPhoto } from "@/lib/image";
import { supabaseConfigured } from "@/lib/supabase";
import * as datos from "./datos";
import { exportarAuditoria } from "./exportar";
import { MESES, cicloDe, hoyISO, mesDe } from "./fechas";
import { Grabadora } from "./Grabadora";
import { Auditoria, EstadoAuditoria, Punto, Sitio } from "./tipos";

// App "Herrería": plan anual de auditorías de sistemas anticaída en cubierta.
// Totalmente separada de la app de mantenimiento (solo tablas herreria_* y
// bucket herreria).

type Pantalla =
  | { tipo: "plan" }
  | { tipo: "auditoria"; id: string }
  | { tipo: "punto"; auditoriaId: string; puntoId: string };

// Lo editado en este dispositivo en los últimos 15 s no se pisa al
// sincronizar (si no, un refresco en medio del tipeo borraría letras).
const ediciones: Record<string, number> = {};
const marcarEdicion = (id: string) => (ediciones[id] = Date.now());
const editadoRecien = (id: string) => Date.now() - (ediciones[id] ?? 0) < 15000;

// Guardado con demora para los textos (no un pedido por cada letra).
const timers: Record<string, ReturnType<typeof setTimeout>> = {};
function guardarLuego(clave: string, fn: () => Promise<void>) {
  clearTimeout(timers[clave]);
  timers[clave] = setTimeout(() => fn().catch((e) => console.error("No se pudo guardar:", e)), 700);
}

const ETIQUETA: Record<EstadoAuditoria | "pendiente", string> = {
  pendiente: "Pendiente",
  abierta: "En curso",
  cerrada: "Cerrada",
  exportada: "Exportada",
};

export default function HerreriaApp() {
  const [sitios, setSitios] = useState<Sitio[]>([]);
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [puntos, setPuntos] = useState<Record<string, Punto[]>>({});
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: "plan" });
  const [listo, setListo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const hoy = useMemo(() => hoyISO(), []);
  const cicloActual = cicloDe(hoy);
  const auditoriaAbierta = pantalla.tipo === "plan" ? null : pantalla.tipo === "auditoria" ? pantalla.id : pantalla.auditoriaId;

  const avisar = useCallback((t: string) => {
    setAviso(t);
    setTimeout(() => setAviso(null), 2600);
  }, []);

  // Carga inicial y sincronización cada 15 s (y al volver a la app).
  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelado = false;
    async function sincronizar() {
      try {
        const [s, a] = await Promise.all([datos.cargarSitios(), datos.cargarAuditorias()]);
        if (cancelado) return;
        setSitios(s);
        setAuditorias((local) => a.map((r) => (editadoRecien(r.id) ? local.find((l) => l.id === r.id) ?? r : r)));
        if (auditoriaAbierta) {
          const p = await datos.cargarPuntos(auditoriaAbierta);
          if (cancelado) return;
          setPuntos((local) => ({
            ...local,
            [auditoriaAbierta]: p.map((r) => (editadoRecien(r.id) ? local[auditoriaAbierta]?.find((l) => l.id === r.id) ?? r : r)),
          }));
        }
        setListo(true);
      } catch (e) {
        if (!cancelado) setError((e as Error).message);
      }
    }
    sincronizar();
    const reloj = setInterval(() => document.visibilityState === "visible" && sincronizar(), 15000);
    const alVolver = () => document.visibilityState === "visible" && sincronizar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      cancelado = true;
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [auditoriaAbierta]);

  const sitioPorId = useMemo(() => new Map(sitios.map((s) => [s.id, s])), [sitios]);

  function auditoriaDelCiclo(sitioId: string) {
    return auditorias.find((a) => a.sitio_id === sitioId && a.ciclo === cicloActual) ?? null;
  }

  function cambiarAuditoria(id: string, campos: Partial<Auditoria>) {
    marcarEdicion(id);
    setAuditorias((l) => l.map((a) => (a.id === id ? { ...a, ...campos } : a)));
  }

  function cambiarPunto(audId: string, id: string, campos: Partial<Punto>) {
    marcarEdicion(id);
    setPuntos((p) => ({ ...p, [audId]: (p[audId] ?? []).map((x) => (x.id === id ? { ...x, ...campos } : x)) }));
  }

  async function abrirSitio(sitio: Sitio) {
    let a = auditoriaDelCiclo(sitio.id);
    if (!a) {
      if (!confirm(`¿Empezar la auditoría ${cicloActual} de ${sitio.rotulo}?`)) return;
      a = await datos.crearAuditoria(sitio.id, hoy);
      setAuditorias((l) => [a!, ...l]);
    }
    setPantalla({ tipo: "auditoria", id: a.id });
  }

  if (!supabaseConfigured) {
    return <Centro texto="Falta conectar Supabase (variables NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)." />;
  }
  if (error && !listo) return <Centro texto={`No se pudo cargar: ${error}`} />;
  if (!listo) return <Centro texto="Sincronizando…" />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {pantalla.tipo === "plan" && (
        <Plan
          sitios={sitios}
          estadoDe={(s) => auditoriaDelCiclo(s.id)?.estado ?? "pendiente"}
          puntosDe={(s) => {
            const a = auditoriaDelCiclo(s.id);
            return a ? puntos[a.id]?.length : undefined;
          }}
          ciclo={cicloActual}
          mesHoy={mesDe(hoy)}
          onAbrir={(s) => abrirSitio(s).catch((e) => avisar(`Error: ${e.message}`))}
        />
      )}

      {pantalla.tipo === "auditoria" &&
        (() => {
          const a = auditorias.find((x) => x.id === pantalla.id);
          const sitio = a && sitioPorId.get(a.sitio_id);
          if (!a || !sitio) return <Centro texto="Cargando…" />;
          return (
            <PantallaAuditoria
              auditoria={a}
              sitio={sitio}
              puntos={puntos[a.id] ?? []}
              onVolver={() => setPantalla({ tipo: "plan" })}
              onCambiar={(campos) => {
                cambiarAuditoria(a.id, campos);
                guardarLuego(`a-${a.id}-${Object.keys(campos).join()}`, () => datos.actualizarAuditoria(a.id, campos));
              }}
              onAbrirPunto={(p) => setPantalla({ tipo: "punto", auditoriaId: a.id, puntoId: p.id })}
              onAgregar={async () => {
                const p = await datos.crearPunto(a.id);
                setPuntos((x) => ({ ...x, [a.id]: [...(x[a.id] ?? []), p] }));
                setPantalla({ tipo: "punto", auditoriaId: a.id, puntoId: p.id });
              }}
              onMover={async (p, dir) => {
                const lista = [...(puntos[a.id] ?? [])].sort((x, y) => x.orden - y.orden);
                const i = lista.findIndex((x) => x.id === p.id);
                const otro = lista[i + dir];
                if (!otro) return;
                cambiarPunto(a.id, p.id, { orden: otro.orden });
                cambiarPunto(a.id, otro.id, { orden: p.orden });
                await Promise.all([datos.actualizarPunto(p.id, { orden: otro.orden }), datos.actualizarPunto(otro.id, { orden: p.orden })]);
              }}
              onExportar={async () => {
                avisar("Armando el ZIP…");
                try {
                  const { fallidos } = await exportarAuditoria(sitio, a, puntos[a.id] ?? []);
                  const exportada_at = new Date().toISOString();
                  cambiarAuditoria(a.id, { estado: "exportada", exportada_at });
                  await datos.actualizarAuditoria(a.id, { estado: "exportada", exportada_at });
                  avisar(fallidos ? `ZIP descargado · ${fallidos} foto(s) no se pudieron bajar` : "ZIP descargado · auditoría exportada");
                } catch (e) {
                  avisar(`No se pudo exportar: ${(e as Error).message}`);
                }
              }}
            />
          );
        })()}

      {pantalla.tipo === "punto" &&
        (() => {
          const lista = puntos[pantalla.auditoriaId] ?? [];
          const p = lista.find((x) => x.id === pantalla.puntoId);
          if (!p) return <Centro texto="Cargando…" />;
          const audId = pantalla.auditoriaId;
          const volver = () => setPantalla({ tipo: "auditoria", id: audId });
          return (
            <PantallaPunto
              punto={p}
              onVolver={volver}
              onCambiar={(campos, inmediato) => {
                cambiarPunto(audId, p.id, campos);
                if (inmediato) datos.actualizarPunto(p.id, campos).catch((e) => avisar(`No se guardó: ${e.message}`));
                else guardarLuego(`p-${p.id}-${Object.keys(campos).join()}`, () => datos.actualizarPunto(p.id, campos));
              }}
              onBorrar={async () => {
                if (!confirm(`¿Borrar el punto ${p.orden}?`)) return;
                await datos.borrarPunto(p, lista);
                setPuntos((x) => ({
                  ...x,
                  [audId]: lista.filter((y) => y.id !== p.id).map((y) => (y.orden > p.orden ? { ...y, orden: y.orden - 1 } : y)),
                }));
                volver();
              }}
              avisar={avisar}
            />
          );
        })()}

      {aviso && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-accent-900)] text-white px-4 py-2 text-sm shadow-lg z-50">
          {aviso}
        </div>
      )}
    </div>
  );
}

function Centro({ texto }: { texto: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ background: "var(--color-bg)" }}>
      <span style={{ fontSize: 14, opacity: 0.7 }}>{texto}</span>
    </div>
  );
}

function Encabezado({ titulo, sub, onVolver }: { titulo: string; sub?: string; onVolver?: () => void }) {
  return (
    <header className="header-hero" style={{ background: "#1c2a33" }}>
      {onVolver && (
        <button onClick={onVolver} style={{ color: "#fff", fontSize: 14, opacity: 0.85, marginBottom: 6 }}>
          ← Volver
        </button>
      )}
      <div className="kicker">HERRERÍA · SISTEMAS ANTICAÍDA</div>
      <h1 style={{ fontSize: 28, marginTop: 4 }}>{titulo}</h1>
      {sub && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>{sub}</div>}
    </header>
  );
}

function Chip({ estado }: { estado: EstadoAuditoria | "pendiente" }) {
  const cls = estado === "exportada" || estado === "cerrada" ? "chip chip-ok" : "chip chip-pendiente";
  return <span className={cls}>{ETIQUETA[estado]}</span>;
}

// ---------------- Plan anual ----------------

function Plan({
  sitios,
  estadoDe,
  puntosDe,
  ciclo,
  mesHoy,
  onAbrir,
}: {
  sitios: Sitio[];
  estadoDe: (s: Sitio) => EstadoAuditoria | "pendiente";
  puntosDe: (s: Sitio) => number | undefined;
  ciclo: string;
  mesHoy: number;
  onAbrir: (s: Sitio) => void;
}) {
  const [filtro, setFiltro] = useState<"Este mes" | "Todos">("Este mes");
  const [busqueda, setBusqueda] = useState("");
  const q = busqueda.trim().toLowerCase();
  const lista = sitios
    .filter((s) => filtro === "Todos" || s.mes === mesHoy)
    .filter((s) => !q || `${s.cod} ${s.nombre} ${s.rotulo}`.toLowerCase().includes(q))
    .sort((a, b) => (a.mes ?? 13) - (b.mes ?? 13) || a.cod.localeCompare(b.cod, "es", { numeric: true }));
  const delMes = sitios.filter((s) => s.mes === mesHoy);
  const hechos = delMes.filter((s) => estadoDe(s) === "exportada").length;

  return (
    <>
      <Encabezado titulo="Plan anual" sub={`Ciclo ${ciclo} · ${MESES[mesHoy - 1]}: ${hechos}/${delMes.length} exportadas`} />
      <div className="p-4 flex flex-col gap-3">
        <input className="field-input" placeholder="Buscar sitio" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="seg" style={{ maxWidth: 240 }}>
          {(["Este mes", "Todos"] as const).map((o) => (
            <button key={o} className={`seg-opt ${filtro === o ? "active" : ""}`} onClick={() => setFiltro(o)}>
              {o}
            </button>
          ))}
        </div>
        {lista.length === 0 && <p style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: 24 }}>No hay sitios para este filtro.</p>}
        <div className="hairline" style={{ borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
          {lista.map((s) => (
            <button key={s.id} onClick={() => onAbrir(s)} className="w-full flex items-center gap-3 hairline-b text-left" style={{ minHeight: 58, padding: "8px 4px" }}>
              <span
                className="flex items-center justify-center shrink-0"
                style={{ width: 46, height: 40, border: "1.5px solid var(--color-accent-700)", fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 12 }}
              >
                {s.cod}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }}>
                  {s.nombre}
                </span>
                <span className="block truncate" style={{ fontSize: 11.5, opacity: 0.55 }}>
                  {s.mes ? MESES[s.mes - 1] : "Sin mes"} · {s.direccion ?? ""}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1 shrink-0">
                <Chip estado={estadoDe(s)} />
                {puntosDe(s) != null && <span style={{ fontSize: 11, opacity: 0.6 }}>{puntosDe(s)} puntos</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------- Auditoría ----------------

function PantallaAuditoria({
  auditoria,
  sitio,
  puntos,
  onVolver,
  onCambiar,
  onAbrirPunto,
  onAgregar,
  onMover,
  onExportar,
}: {
  auditoria: Auditoria;
  sitio: Sitio;
  puntos: Punto[];
  onVolver: () => void;
  onCambiar: (c: Partial<Auditoria>) => void;
  onAbrirPunto: (p: Punto) => void;
  onAgregar: () => Promise<void>;
  onMover: (p: Punto, dir: -1 | 1) => Promise<void>;
  onExportar: () => Promise<void>;
}) {
  const [ocupado, setOcupado] = useState(false);
  const ordenados = [...puntos].sort((a, b) => a.orden - b.orden);
  const conRec = ordenados.filter((p) => p.recomendacion.trim()).length;
  const ejecutar = (fn: () => Promise<void>) => async () => {
    setOcupado(true);
    try {
      await fn();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <>
      <Encabezado titulo={sitio.rotulo} sub={`${sitio.direccion ?? ""} · Ciclo ${auditoria.ciclo}`} onVolver={onVolver} />
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            Fecha de la visita
            <input
              type="date"
              className="field-input"
              value={auditoria.fecha}
              onChange={(e) => e.target.value && onCambiar({ fecha: e.target.value, ciclo: cicloDe(e.target.value) })}
            />
          </label>
          <Chip estado={auditoria.estado} />
        </div>

        <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
          Comentario general
          <textarea
            className="field-input"
            rows={2}
            value={auditoria.comentario_general}
            onChange={(e) => onCambiar({ comentario_general: e.target.value })}
            placeholder="Opcional"
          />
        </label>

        <div className="flex justify-between items-baseline">
          <h5>Puntos ({ordenados.length})</h5>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{conRec} con recomendación</span>
        </div>

        {ordenados.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.6 }}>
            Todavía no hay puntos. Se cargan solos desde el WhatsApp de herrería, o con &quot;Agregar punto&quot;.
          </p>
        )}

        <div className="flex flex-col gap-2">
          {ordenados.map((p, i) => (
            <div key={p.id} className="card-reg flex gap-2 p-2 items-center">
              <button className="flex gap-3 flex-1 min-w-0 text-left items-center" onClick={() => onAbrirPunto(p)}>
                {p.fotos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotos[0]} alt="" style={{ width: 56, height: 56, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <span style={{ width: 56, height: 56, background: "var(--color-accent-100)", flexShrink: 0 }} />
                )}
                <span className="flex-1 min-w-0">
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>
                    P{String(i + 1).padStart(2, "0")} · {p.fotos.length} foto{p.fotos.length === 1 ? "" : "s"}
                  </span>
                  <span className="block" style={{ fontSize: 12.5, opacity: p.descripcion ? 0.85 : 0.5 }}>
                    {p.descripcion || "Sin descripción"}
                  </span>
                  {p.recomendacion && (
                    <span className="block" style={{ fontSize: 12, color: "var(--color-danger)" }}>
                      ⚠️ {p.recomendacion}
                    </span>
                  )}
                </span>
              </button>
              <span className="flex flex-col gap-1">
                <button className="btn btn-ghost" style={{ minHeight: 28, padding: "0 8px" }} disabled={i === 0 || ocupado} onClick={ejecutar(() => onMover(p, -1))} aria-label="Subir">
                  ↑
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ minHeight: 28, padding: "0 8px" }}
                  disabled={i === ordenados.length - 1 || ocupado}
                  onClick={ejecutar(() => onMover(p, 1))}
                  aria-label="Bajar"
                >
                  ↓
                </button>
              </span>
            </div>
          ))}
        </div>

        <button className="btn btn-ghost btn-block" disabled={ocupado} onClick={ejecutar(onAgregar)}>
          + Agregar punto
        </button>
        <button className="btn btn-primary btn-block" disabled={ocupado} onClick={ejecutar(onExportar)}>
          Exportar ZIP para el informe
        </button>
      </div>
    </>
  );
}

// ---------------- Punto ----------------

function PantallaPunto({
  punto,
  onVolver,
  onCambiar,
  onBorrar,
  avisar,
}: {
  punto: Punto;
  onVolver: () => void;
  onCambiar: (c: Partial<Punto>, inmediato?: boolean) => void;
  onBorrar: () => Promise<void>;
  avisar: (t: string) => void;
}) {
  const [ocupado, setOcupado] = useState(false);

  async function agregarFotos(archivos: FileList | null) {
    if (!archivos?.length) return;
    setOcupado(true);
    try {
      const nuevas: string[] = [];
      for (const f of Array.from(archivos)) {
        const jpg = await compressPhoto(f);
        const url = await datos.subirArchivo(punto.auditoria_id, jpg, "jpg");
        if (url) nuevas.push(url);
      }
      onCambiar({ fotos: [...punto.fotos, ...nuevas] }, true);
      if (nuevas.length < archivos.length) avisar(`${archivos.length - nuevas.length} foto(s) no se pudieron subir`);
    } finally {
      setOcupado(false);
    }
  }

  async function alGrabar(audio: Blob, durationSecs: number) {
    setOcupado(true);
    try {
      const url = await datos.subirArchivo(punto.auditoria_id, audio, datos.extensionAudio(audio.type));
      const audios = url ? [...punto.audios, { url, durationSecs, recordedAt: new Date().toISOString() }] : punto.audios;
      const r = await datos.procesarConIA({ audio, anterior: punto.transcripcion });
      onCambiar({ audios, transcripcion: r.transcripcion, descripcion: r.descripcion, recomendacion: r.recomendacion }, true);
    } catch (e) {
      avisar(`No se pudo procesar el audio: ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  }

  async function redactarDeNuevo() {
    setOcupado(true);
    try {
      const r = await datos.procesarConIA({ texto: punto.transcripcion });
      onCambiar({ descripcion: r.descripcion, recomendacion: r.recomendacion }, true);
    } catch (e) {
      avisar(`No se pudo redactar: ${(e as Error).message}`);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <Encabezado titulo={`Punto ${String(punto.orden).padStart(2, "0")}`} sub={punto.remitente && punto.remitente !== "app" ? "Cargado por WhatsApp" : undefined} onVolver={onVolver} />
      <div className="p-4 flex flex-col gap-4">
        <div>
          <h5>Fotos ({punto.fotos.length})</h5>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {punto.fotos.map((url, i) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Foto ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
                <button
                  aria-label="Sacar foto"
                  onClick={() => {
                    if (!confirm("¿Sacar esta foto del punto?")) return;
                    onCambiar({ fotos: punto.fotos.filter((u) => u !== url) }, true);
                    datos.borrarArchivos([url]).catch(() => {});
                  }}
                  style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.6)", color: "#fff", width: 24, height: 24 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <label className="btn btn-ghost" style={{ opacity: ocupado ? 0.5 : 1 }}>
              📷 Cámara
              <input type="file" accept="image/*" capture="environment" hidden disabled={ocupado} onChange={(e) => agregarFotos(e.target.files).then(() => (e.target.value = ""))} />
            </label>
            <label className="btn btn-ghost" style={{ opacity: ocupado ? 0.5 : 1 }}>
              🖼️ Galería
              <input type="file" accept="image/*" multiple hidden disabled={ocupado} onChange={(e) => agregarFotos(e.target.files).then(() => (e.target.value = ""))} />
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h5>Audio</h5>
          <Grabadora ocupado={ocupado} onAudio={alGrabar} />
          {punto.audios.map((a, i) => (
            <audio key={a.url} controls src={a.url} style={{ width: "100%", height: 32 }} aria-label={`Audio ${i + 1}`} />
          ))}
        </div>

        <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
          Lo que dijo el técnico (transcripción)
          <textarea className="field-input" rows={3} value={punto.transcripcion} onChange={(e) => onCambiar({ transcripcion: e.target.value })} />
        </label>
        <button className="btn btn-ghost btn-block" disabled={ocupado || !punto.transcripcion.trim()} onClick={redactarDeNuevo}>
          ✨ Redactar de nuevo con IA
        </button>

        <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
          Descripción (hoja Descripción del informe)
          <textarea className="field-input" rows={3} value={punto.descripcion} onChange={(e) => onCambiar({ descripcion: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
          Recomendación (vacía = está bien, no va a Recomendaciones)
          <textarea className="field-input" rows={2} value={punto.recomendacion} onChange={(e) => onCambiar({ recomendacion: e.target.value })} />
        </label>

        <button className="btn btn-ghost btn-block" style={{ color: "var(--color-danger)" }} disabled={ocupado} onClick={() => onBorrar().catch((e) => avisar(`Error: ${e.message}`))}>
          Borrar punto
        </button>
      </div>
    </>
  );
}
