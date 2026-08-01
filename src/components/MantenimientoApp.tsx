"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, categoryById } from "@/lib/categories";
import { fetchAllEquipmentState, saveEquipmentState } from "@/lib/equipment-state";
import { exportVisitZip } from "@/lib/export";
import { generateVisitExcel } from "@/lib/excel-report";
import { generateEquipmentFor } from "@/lib/mock-data";
import { MONTH_NAMES } from "@/lib/real-locations";
import { supabaseConfigured } from "@/lib/supabase";
import { uploadToStorage } from "@/lib/storage";
import { AudioNote, CategoryId, Chain, Equipment, EquipmentData, EquipmentStatus, Location } from "@/lib/types";
import { StatusChip } from "./StatusChip";
import { ProgressBar } from "./ProgressBar";
import { AudioRecorder } from "./AudioRecorder";
import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
  MicIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "./icons";

type View =
  | { screen: "locations" }
  | { screen: "location"; locationId: string }
  | { screen: "category"; locationId: string; categoryId: CategoryId }
  | { screen: "equipment"; locationId: string; categoryId: CategoryId; equipmentId: string }
  | { screen: "summary"; locationId: string };

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nowLabel() {
  const d = new Date();
  return `Hoy · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const HISTORY_EXAMPLE = [
  { date: "2026-06-04", status: "ok" as EquipmentStatus, comment: "Sin novedades." },
  { date: "2026-05-03", status: "falla" as EquipmentStatus, comment: "Filtro sucio, se programó limpieza." },
  { date: "2026-04-02", status: "ok" as EquipmentStatus, comment: "Revisado, funciona correctamente." },
];

export default function MantenimientoApp({
  locations,
  dataSource,
}: {
  locations: Location[];
  dataSource: "supabase" | "mock";
}) {
  const initial = useMemo(() => generateEquipmentFor(locations), [locations]);
  const [stack, setStack] = useState<View[]>([{ screen: "locations" }]);
  const [equipment, setEquipment] = useState<Equipment[]>(initial.equipment);
  const [data, setData] = useState<Record<string, EquipmentData>>(initial.data);
  const [visitDates, setVisitDates] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState<"Todos" | Chain>("Todos");
  const [monthFilter, setMonthFilter] = useState<"Este mes" | "Todos">("Este mes");
  const [toast, setToast] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const nextEquipmentSeq = useRef(1);

  // Trae el estado real (fotos, audios, checklist, estado) guardado en
  // Supabase para que todos los dispositivos vean lo mismo. Si todavía no
  // hay nada guardado para un equipo, se queda con el dato de ejemplo hasta
  // que alguien lo edite (ahí se guarda por primera vez).
  useEffect(() => {
    if (dataSource !== "supabase") return;
    let cancelled = false;
    fetchAllEquipmentState().then((remote) => {
      if (cancelled || !remote) return;
      setEquipment((local) => {
        const byId = new Map(local.map((e) => [e.id, e]));
        for (const e of remote.equipment) byId.set(e.id, e);
        return Array.from(byId.values());
      });
      setData((local) => ({ ...local, ...remote.data }));
    });
    return () => {
      cancelled = true;
    };
  }, [dataSource]);

  const view = stack[stack.length - 1];

  function push(v: View) {
    setStack((s) => [...s, v]);
  }
  function back() {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function visitDateFor(locationId: string) {
    return visitDates[locationId] ?? todayISO();
  }

  function equipmentForLocation(locationId: string) {
    return equipment.filter((e) => e.locationId === locationId && e.active);
  }
  function equipmentForCategory(locationId: string, categoryId: CategoryId) {
    return equipment.filter(
      (e) => e.locationId === locationId && e.category === categoryId && e.active
    );
  }

  function countsFor(list: Equipment[]) {
    let ok = 0, falla = 0, pendiente = 0;
    for (const e of list) {
      const st = data[e.id]?.status ?? "pendiente";
      if (st === "ok") ok++;
      else if (st === "falla") falla++;
      else pendiente++;
    }
    return { ok, falla, pendiente, total: list.length };
  }

  function addEquipment(locationId: string, categoryId: CategoryId) {
    const cat = categoryById(categoryId);
    const existing = equipment.filter(
      (e) => e.locationId === locationId && e.category === categoryId
    );
    const nextNumber = existing.length
      ? Math.max(...existing.map((e) => e.number)) + 1
      : 1;
    const id = `${locationId}-${categoryId}-new-${nextEquipmentSeq.current++}`;
    const newEq: Equipment = {
      id,
      locationId,
      category: categoryId,
      subtype: cat.subtypes[0],
      number: nextNumber,
      code: `${cat.prefix}-${String(nextNumber).padStart(3, "0")}`,
      active: true,
    };
    const checks: Record<string, string> = {};
    for (const c of cat.checks) checks[c.id] = c.options[0];
    const fields: Record<string, string> = {};
    for (const f of cat.fields) fields[f.id] = "";
    const newData: EquipmentData = { status: "pendiente", comment: "", photos: [], audios: [], checks, fields, updatedAt: nowLabel() };
    setEquipment((eq) => [...eq, newEq]);
    setData((d) => ({ ...d, [id]: newData }));
    saveEquipmentState(newEq, newData);
    push({ screen: "equipment", locationId, categoryId, equipmentId: id });
  }

  function deleteEquipment(eqId: string, after?: () => void) {
    setEquipment((eq) => {
      const updated = eq.map((e) => (e.id === eqId ? { ...e, active: false } : e));
      const target = updated.find((e) => e.id === eqId);
      if (target && data[eqId]) saveEquipmentState(target, data[eqId]);
      return updated;
    });
    showToast("Equipo eliminado");
    after?.();
  }

  function updateEquipmentData(eqId: string, patch: Partial<EquipmentData>) {
    setData((d) => {
      const updated = { ...d[eqId], ...patch, updatedAt: nowLabel() };
      const eq = equipment.find((e) => e.id === eqId);
      if (eq) saveEquipmentState(eq, updated);
      return { ...d, [eqId]: updated };
    });
  }

  function updateEquipmentMeta(eqId: string, patch: Partial<Equipment>) {
    setEquipment((list) => {
      const updated = list.map((e) => (e.id === eqId ? { ...e, ...patch } : e));
      const eq = updated.find((e) => e.id === eqId);
      if (eq && data[eqId]) saveEquipmentState(eq, data[eqId]);
      return updated;
    });
  }

  const currentMonth = new Date().getMonth() + 1;

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      if (chainFilter !== "Todos" && loc.chain !== chainFilter) return false;
      if (monthFilter === "Este mes" && !loc.months.includes(currentMonth)) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        loc.suc.toLowerCase().includes(q)
      );
    });
  }, [locations, search, chainFilter, monthFilter, currentMonth]);

  const planificados = locations.filter((l) => l.months.includes(currentMonth));
  const completedThisMonth = planificados.filter((l) => visitDates[l.id]).length;
  const monthLabel = MONTH_NAMES[currentMonth - 1];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {view.screen === "locations" && (
        <LocationsScreen
          locations={filteredLocations}
          dataSource={dataSource}
          search={search}
          setSearch={setSearch}
          chainFilter={chainFilter}
          setChainFilter={setChainFilter}
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          monthLabel={monthLabel}
          completedThisMonth={completedThisMonth}
          totalPlanificados={planificados.length}
          countsFor={countsFor}
          equipmentForLocation={equipmentForLocation}
          onOpen={(id) => push({ screen: "location", locationId: id })}
        />
      )}

      {view.screen === "location" && (() => {
        const location = locations.find((l) => l.id === view.locationId)!;
        const list = equipmentForLocation(location.id);
        const counts = countsFor(list);
        return (
          <LocationScreen
            location={location}
            counts={counts}
            visitDate={visitDateFor(location.id)}
            onVisitDateChange={(v) => setVisitDates((d) => ({ ...d, [location.id]: v }))}
            equipmentForCategory={(catId) => equipmentForCategory(location.id, catId)}
            countsFor={countsFor}
            onBack={back}
            onOpenCategory={(catId) =>
              push({ screen: "category", locationId: location.id, categoryId: catId })
            }
            onSummary={() => push({ screen: "summary", locationId: location.id })}
          />
        );
      })()}

      {view.screen === "category" && (() => {
        const location = locations.find((l) => l.id === view.locationId)!;
        const cat = categoryById(view.categoryId);
        const list = equipmentForCategory(location.id, view.categoryId);
        return (
          <CategoryScreen
            location={location}
            category={cat}
            list={list}
            data={data}
            onBack={back}
            onOpenEquipment={(eqId) =>
              push({
                screen: "equipment",
                locationId: location.id,
                categoryId: view.categoryId,
                equipmentId: eqId,
              })
            }
            onAddEquipment={() => addEquipment(location.id, view.categoryId)}
            onDeleteEquipment={(eqId) => deleteEquipment(eqId)}
          />
        );
      })()}

      {view.screen === "equipment" && (() => {
        const cat = categoryById(view.categoryId);
        const eq = equipment.find((e) => e.id === view.equipmentId)!;
        const eqData = data[eq.id];
        return (
          <EquipmentScreen
            category={cat}
            equipmentItem={eq}
            eqData={eqData}
            onBack={back}
            onDelete={() => deleteEquipment(eq.id, back)}
            onOpenHistory={() => setHistoryFor(eq.id)}
            onChangeType={(subtype) => updateEquipmentMeta(eq.id, { subtype })}
            onChangeNumber={(n) =>
              updateEquipmentMeta(eq.id, { number: n, code: `${cat.prefix}-${String(n).padStart(3, "0")}` })
            }
            onChangeComment={(comment) => updateEquipmentData(eq.id, { comment })}
            onChangeStatus={(status) => updateEquipmentData(eq.id, { status })}
            onAddPhotos={(photos) => updateEquipmentData(eq.id, { photos: [...eqData.photos, ...photos] })}
            onRemovePhoto={(idx) =>
              updateEquipmentData(eq.id, { photos: eqData.photos.filter((_, i) => i !== idx) })
            }
            onSetPrimaryPhoto={(idx) => {
              const reordered = [eqData.photos[idx], ...eqData.photos.filter((_, i) => i !== idx)];
              updateEquipmentData(eq.id, { photos: reordered });
            }}
            onChangeCheck={(checkId, value) =>
              updateEquipmentData(eq.id, { checks: { ...eqData.checks, [checkId]: value } })
            }
            onChangeField={(fieldId, value) =>
              updateEquipmentData(eq.id, { fields: { ...eqData.fields, [fieldId]: value } })
            }
            onAddAudio={(audio) => updateEquipmentData(eq.id, { audios: [...eqData.audios, audio] })}
            onRemoveAudio={(id) =>
              updateEquipmentData(eq.id, { audios: eqData.audios.filter((a) => a.id !== id) })
            }
          />
        );
      })()}

      {view.screen === "summary" && (() => {
        const location = locations.find((l) => l.id === view.locationId)!;
        const list = equipmentForLocation(location.id);
        const counts = countsFor(list);
        const fallas = list.filter((e) => data[e.id]?.status === "falla");
        return (
          <SummaryScreen
            location={location}
            counts={counts}
            fallas={fallas}
            visitDate={visitDateFor(location.id)}
            onBackToLocations={() => setStack([{ screen: "locations" }])}
            onOpenFalla={(eq) =>
              setStack([
                { screen: "locations" },
                { screen: "location", locationId: location.id },
                { screen: "category", locationId: location.id, categoryId: eq.category },
                {
                  screen: "equipment",
                  locationId: location.id,
                  categoryId: eq.category,
                  equipmentId: eq.id,
                },
              ])
            }
            onExport={async () => {
              showToast("Generando ZIP…");
              try {
                await exportVisitZip(location, visitDateFor(location.id), list, data);
                showToast("ZIP descargado");
              } catch {
                showToast("No se pudo generar el ZIP");
              }
            }}
            onGeneratePdf={async () => {
              showToast("Generando informe…");
              try {
                await generateVisitExcel(location, visitDateFor(location.id), list, data);
                showToast("Informe descargado");
              } catch {
                showToast("No se pudo generar el informe");
              }
            }}
          />
        );
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-accent-900)] text-white px-4 py-2 text-sm shadow-lg z-50">
          {toast}
        </div>
      )}

      {historyFor && (
        <HistoryModal
          code={equipment.find((e) => e.id === historyFor)?.code ?? ""}
          onClose={() => setHistoryFor(null)}
        />
      )}
    </div>
  );
}

// ---------- Screen 1: Plan de visitas ----------

function LocationsScreen({
  locations,
  dataSource,
  search,
  setSearch,
  chainFilter,
  setChainFilter,
  monthFilter,
  setMonthFilter,
  monthLabel,
  completedThisMonth,
  totalPlanificados,
  countsFor,
  equipmentForLocation,
  onOpen,
}: {
  locations: Location[];
  dataSource: "supabase" | "mock";
  search: string;
  setSearch: (v: string) => void;
  chainFilter: "Todos" | Chain;
  setChainFilter: (v: "Todos" | Chain) => void;
  monthFilter: "Este mes" | "Todos";
  setMonthFilter: (v: "Este mes" | "Todos") => void;
  monthLabel: string;
  completedThisMonth: number;
  totalPlanificados: number;
  countsFor: (list: Equipment[]) => { ok: number; falla: number; pendiente: number; total: number };
  equipmentForLocation: (id: string) => Equipment[];
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <header className="header-hero">
        <div className="kicker">CONTROL DE MANTENIMIENTO · URUGUAY</div>
        <h1 style={{ fontSize: 31, marginTop: 4 }}>Plan de visitas</h1>
        <div className="flex justify-between mt-2" style={{ fontSize: 12, opacity: 0.8 }}>
          <span>{monthLabel}</span>
          <span>{completedThisMonth}/{totalPlanificados} completados</span>
        </div>
      </header>

      {dataSource === "mock" && (
        <div style={{ background: "var(--color-accent-100)", color: "var(--color-accent-800)", padding: "6px 16px", fontSize: 12 }}>
          Mostrando datos de ejemplo — conectá Supabase (corré <code>supabase/schema.sql</code>) para ver los locales reales.
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        <div className="relative">
          <SearchIcon size={14} className="absolute" style={{ left: 10, top: 15 }} />
          <input
            className="field-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por sucursal, nombre o dirección"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="seg" style={{ maxWidth: 240 }}>
          {(["Este mes", "Todos"] as const).map((opt) => (
            <button
              key={opt}
              className={`seg-opt ${monthFilter === opt ? "active" : ""}`}
              onClick={() => setMonthFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="seg" style={{ maxWidth: 320 }}>
          {(["Todos", "Disco", "Devoto"] as const).map((opt) => (
            <button
              key={opt}
              className={`seg-opt ${chainFilter === opt ? "active" : ""}`}
              onClick={() => setChainFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

        {locations.length === 0 && (
          <p style={{ fontSize: 13, opacity: 0.6, textAlign: "center", padding: "24px 0" }}>
            No hay locales para este filtro.
          </p>
        )}

        <div className="hairline" style={{ borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
          {locations.map((loc) => {
            const list = equipmentForLocation(loc.id);
            const counts = countsFor(list);
            const revisados = counts.ok + counts.falla;
            const status =
              counts.total === 0
                ? "Pendiente"
                : revisados === counts.total
                ? counts.falla > 0
                  ? `${counts.falla} no OK`
                  : "Completo"
                : revisados > 0
                ? "En progreso"
                : "Pendiente";
            return (
              <button
                key={loc.id}
                onClick={() => onOpen(loc.id)}
                className="w-full flex items-center gap-3 hairline-b text-left"
                style={{ minHeight: 58, padding: "8px 4px" }}
              >
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    border: "1.5px solid var(--color-accent-600)",
                    background: loc.chain === "Disco" ? "var(--color-accent-600)" : "transparent",
                    color: loc.chain === "Disco" ? "#fff" : "var(--color-accent-700)",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {loc.suc}
                </span>
                <span className="flex-1 min-w-0">
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }} className="block truncate">
                    {loc.name}
                  </span>
                  <span style={{ fontSize: 11.5, opacity: 0.55 }} className="block truncate">
                    {loc.address}
                  </span>
                  <ProgressBar value={revisados} max={counts.total || 1} widthPx={110} />
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <span className="chip chip-pendiente">{status}</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>
                    {revisados}/{counts.total} revisados
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ---------- Screen 2: Detalle del local ----------

function LocationScreen({
  location,
  counts,
  visitDate,
  onVisitDateChange,
  equipmentForCategory,
  countsFor,
  onBack,
  onOpenCategory,
  onSummary,
}: {
  location: Location;
  counts: { ok: number; falla: number; pendiente: number; total: number };
  visitDate: string;
  onVisitDateChange: (v: string) => void;
  equipmentForCategory: (catId: CategoryId) => Equipment[];
  countsFor: (list: Equipment[]) => { ok: number; falla: number; pendiente: number; total: number };
  onBack: () => void;
  onOpenCategory: (catId: CategoryId) => void;
  onSummary: () => void;
}) {
  const plannedMonths = location.months.map((m) => MONTH_NAMES[m - 1].slice(0, 3)).join(" · ");
  return (
    <>
      <TopBar title={location.name} kicker={`${location.suc} · ${location.chain}`} onBack={onBack} />
      <div className="p-4 flex flex-col gap-4">
        <div>
          <span className="tag-outline">{location.chain}</span>{" "}
          <span className="tag-outline">{location.suc}</span>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{location.address}</div>
          <ProgressBar value={counts.ok + counts.falla} max={counts.total || 1} height={6} />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {counts.ok} OK · {counts.falla} con falla · {counts.pendiente} pendientes
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            Fecha de visita
            <input
              type="date"
              className="field-input"
              style={{ maxWidth: 200 }}
              value={visitDate}
              onChange={(e) => onVisitDateChange(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            Visitas planificadas
            <div className="field-input" style={{ display: "flex", alignItems: "center", maxWidth: 200, opacity: 0.7 }}>
              {plannedMonths}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const list = equipmentForCategory(cat.id);
            const c = countsFor(list);
            return (
              <button
                key={cat.id}
                onClick={() => onOpenCategory(cat.id)}
                className="card-reg text-left p-3 flex flex-col gap-2"
              >
                <span
                  className="flex items-center justify-center"
                  style={{ width: 38, height: 38, background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
                >
                  {cat.prefix[0]}
                </span>
                <h5>{cat.name}</h5>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {c.ok + c.falla}/{c.total} revisados
                </span>
                <ProgressBar value={c.ok + c.falla} max={c.total || 1} />
                {c.falla > 0 && <span className="chip chip-falla">{c.falla} no OK</span>}
              </button>
            );
          })}
        </div>

        <button className="btn btn-primary btn-block" onClick={onSummary}>
          Ver resumen de visita
        </button>
      </div>
    </>
  );
}

// ---------- Screen 3: Lista de equipos ----------

function CategoryScreen({
  location,
  category,
  list,
  data,
  onBack,
  onOpenEquipment,
  onAddEquipment,
  onDeleteEquipment,
}: {
  location: Location;
  category: ReturnType<typeof categoryById>;
  list: Equipment[];
  data: Record<string, EquipmentData>;
  onBack: () => void;
  onOpenEquipment: (id: string) => void;
  onAddEquipment: () => void;
  onDeleteEquipment: (id: string) => void;
}) {
  return (
    <>
      <TopBar title={category.name} kicker={`${location.suc} · ${location.name}`} onBack={onBack} />
      <div className="p-4 flex flex-col gap-3">
        <h6>Equipos relevados</h6>
        <div>
          {list.map((eq) => {
            const eqData = data[eq.id];
            const firstPhoto = eqData?.photos[0];
            return (
              <div key={eq.id} className="flex items-center gap-3 hairline-b" style={{ minHeight: 56, padding: "8px 4px" }}>
                <span
                  className="flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ width: 46, height: 46, background: "var(--color-surface)" }}
                >
                  {firstPhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <CameraIcon size={18} className="opacity-35" />
                  )}
                </span>
                <button className="flex-1 min-w-0 text-left" onClick={() => onOpenEquipment(eq.id)}>
                  <span style={{ fontSize: 10, textTransform: "uppercase" }} className="block opacity-60">
                    {eq.subtype}
                  </span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }} className="block">
                    {eq.code}
                  </span>
                  <span className="flex items-center gap-2" style={{ fontSize: 11, opacity: 0.6 }}>
                    <span>{eqData?.photos.length ?? 0} fotos</span>
                    {(eqData?.audios.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <MicIcon size={11} /> audio
                      </span>
                    )}
                  </span>
                </button>
                <StatusChip status={eqData?.status ?? "pendiente"} />
                <button
                  aria-label="Eliminar equipo"
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 32, height: 32 }}
                  onClick={() => onDeleteEquipment(eq.id)}
                >
                  <TrashIcon size={16} className="opacity-60" />
                </button>
              </div>
            );
          })}
        </div>
        <button className="btn btn-primary btn-block" onClick={onAddEquipment}>
          <PlusIcon size={16} /> Agregar equipo
        </button>
      </div>
    </>
  );
}

// ---------- Screen 4: Detalle / carga del equipo ----------

function EquipmentScreen({
  category,
  equipmentItem,
  eqData,
  onBack,
  onDelete,
  onOpenHistory,
  onChangeType,
  onChangeNumber,
  onChangeComment,
  onChangeStatus,
  onAddPhotos,
  onRemovePhoto,
  onSetPrimaryPhoto,
  onChangeCheck,
  onChangeField,
  onAddAudio,
  onRemoveAudio,
}: {
  category: ReturnType<typeof categoryById>;
  equipmentItem: Equipment;
  eqData: EquipmentData;
  onBack: () => void;
  onDelete: () => void;
  onOpenHistory: () => void;
  onChangeType: (subtype: string) => void;
  onChangeNumber: (n: number) => void;
  onChangeComment: (comment: string) => void;
  onChangeStatus: (status: EquipmentStatus) => void;
  onAddPhotos: (photos: string[]) => void;
  onRemovePhoto: (index: number) => void;
  onSetPrimaryPhoto: (index: number) => void;
  onChangeCheck: (checkId: string, value: string) => void;
  onChangeField: (fieldId: string, value: string) => void;
  onAddAudio: (audio: AudioNote) => void;
  onRemoveAudio: (id: string) => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoFiles(files: FileList | null, input: HTMLInputElement | null) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    // Reset para poder volver a tomar/elegir sin recargar la página.
    if (input) input.value = "";

    if (supabaseConfigured) {
      const urls = await Promise.all(
        fileArray.map(async (f) => {
          const ext = f.type.includes("png") ? "png" : "jpg";
          const uploaded = await uploadToStorage("photos", equipmentItem.id, f, ext);
          return uploaded ?? URL.createObjectURL(f);
        })
      );
      onAddPhotos(urls);
    } else {
      onAddPhotos(fileArray.map((f) => URL.createObjectURL(f)));
    }
  }

  return (
    <>
      <TopBar title={equipmentItem.code} onBack={onBack} action={<button onClick={onOpenHistory}><ClockIcon size={18} /></button>} />
      <div className="p-4">
        <div className="card-reg p-4 flex flex-col gap-4">
          {category.id === "ac" && (
            <>
              <div className="seg">
                {category.subtypes.map((st) => (
                  <button
                    key={st}
                    className={`seg-opt ${equipmentItem.subtype === st ? "active" : ""}`}
                    onClick={() => onChangeType(st)}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
                N° de equipo
                <input
                  type="number"
                  min={1}
                  className="field-input"
                  value={equipmentItem.number}
                  onChange={(e) => onChangeNumber(Number(e.target.value) || 1)}
                />
              </label>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ fontSize: 12 }}>Fotos</label>
              <span style={{ fontSize: 11, opacity: 0.6 }}>{eqData.photos.length} fotos</span>
            </div>

            {eqData.photos.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-2"
                style={{ aspectRatio: "16/9", background: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
              >
                <CameraIcon size={26} className="opacity-40" />
                <span style={{ fontSize: 13, opacity: 0.6 }}>Sin fotos todavía</span>
                <div className="flex gap-2 mt-1">
                  <button className="btn btn-primary" style={{ minHeight: 38, padding: "0 14px", fontSize: 13 }} onClick={() => cameraInputRef.current?.click()}>
                    Tomar foto
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ minHeight: 38, padding: "0 14px", fontSize: 13 }}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    Elegir de la galería
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {eqData.photos.map((p, i) => (
                  <div key={i} className="relative" style={{ aspectRatio: "1/1", outline: i === 0 ? "2px solid var(--color-accent-600)" : undefined }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 ? (
                      <span
                        style={{
                          position: "absolute", bottom: 2, left: 2, fontSize: 10, fontWeight: 600,
                          background: "var(--color-accent-600)", color: "#fff", padding: "1px 5px",
                        }}
                      >
                        Principal
                      </span>
                    ) : (
                      <button
                        aria-label="Marcar como foto principal"
                        onClick={() => onSetPrimaryPhoto(i)}
                        style={{
                          position: "absolute", bottom: 2, left: 2, fontSize: 10,
                          background: "rgba(0,0,0,0.6)", color: "#fff", padding: "1px 5px",
                        }}
                      >
                        Marcar principal
                      </button>
                    )}
                    <button
                      aria-label="Quitar foto"
                      onClick={() => onRemovePhoto(i)}
                      style={{
                        position: "absolute", top: 2, right: 2, width: 20, height: 20,
                        background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  className="flex items-center justify-center"
                  style={{ aspectRatio: "1/1", border: "1px dashed var(--color-accent-300)", color: "var(--color-accent-600)" }}
                  onClick={() => cameraInputRef.current?.click()}
                  aria-label="Agregar foto"
                >
                  <PlusIcon size={18} />
                </button>
              </div>
            )}
            {eqData.photos.length > 0 && (
              <button
                className="mt-2"
                style={{ fontSize: 12, color: "var(--color-accent-700)" }}
                onClick={() => galleryInputRef.current?.click()}
              >
                Elegir de la galería
              </button>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files, cameraInputRef.current)}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handlePhotoFiles(e.target.files, galleryInputRef.current)}
            />
          </div>

          {category.checks.length > 0 && (
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: 12 }}>Verificaciones</label>
              {category.checks.map((check) => (
                <div key={check.id} className="flex items-center justify-between gap-2 hairline-b" style={{ padding: "6px 0" }}>
                  <span style={{ fontSize: 13 }}>{check.label}</span>
                  <div className="seg" style={{ maxWidth: 160 }}>
                    {check.options.map((opt) => (
                      <button
                        key={opt}
                        className={`seg-opt ${eqData.checks[check.id] === opt ? "active" : ""}`}
                        style={{ fontSize: 12, minHeight: 34 }}
                        onClick={() => onChangeCheck(check.id, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {category.fields.length > 0 && (
            <div className="flex flex-col gap-2">
              <label style={{ fontSize: 12 }}>Mediciones</label>
              {category.fields.map((field) => (
                <label key={field.id} className="flex flex-col gap-1" style={{ fontSize: 12 }}>
                  {field.label}
                  <div className="relative">
                    <input
                      className="field-input"
                      placeholder={field.placeholder}
                      value={eqData.fields[field.id] ?? ""}
                      onChange={(e) => onChangeField(field.id, e.target.value)}
                    />
                    {field.unit && (
                      <span className="absolute" style={{ right: 10, top: 12, fontSize: 12, opacity: 0.5 }}>
                        {field.unit}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            Observación
            <textarea
              className="field-textarea"
              value={eqData.comment}
              onChange={(e) => onChangeComment(e.target.value)}
            />
          </label>

          <AudioRecorder audios={eqData.audios} equipmentId={equipmentItem.id} onAdd={onAddAudio} onRemove={onRemoveAudio} />

          <div className="seg">
            {(["ok", "falla", "pendiente"] as EquipmentStatus[]).map((st) => (
              <button
                key={st}
                className={`seg-opt ${eqData.status === st ? "active" : ""}`}
                onClick={() => onChangeStatus(st)}
              >
                {st === "ok" ? "OK" : st === "falla" ? "No OK" : "Pendiente"}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, opacity: 0.55 }}>{eqData.updatedAt}</div>

          <button className="btn btn-primary btn-block" onClick={onBack}>
            Guardar y volver
          </button>
          <button className="btn btn-ghost btn-block" onClick={onDelete}>
            Eliminar equipo
          </button>
        </div>
      </div>
    </>
  );
}

// ---------- Screen 5: Resumen de visita ----------

function SummaryScreen({
  location,
  counts,
  fallas,
  visitDate,
  onBackToLocations,
  onOpenFalla,
  onExport,
  onGeneratePdf,
}: {
  location: Location;
  counts: { ok: number; falla: number; pendiente: number; total: number };
  fallas: Equipment[];
  visitDate: string;
  onBackToLocations: () => void;
  onOpenFalla: (eq: Equipment) => void;
  onExport: () => void;
  onGeneratePdf: () => void;
}) {
  const [dd, mm, yyyy] = [
    visitDate.slice(8, 10),
    visitDate.slice(5, 7),
    visitDate.slice(0, 4),
  ];
  return (
    <>
      <TopBar title="Resumen de visita" onBack={onBackToLocations} />
      <div className="p-4 flex flex-col gap-4">
        <div>
          <span className="tag-outline">{location.chain}</span>{" "}
          <span className="tag-outline">{location.suc}</span>
          <h3 style={{ marginTop: 4 }}>{location.name}</h3>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Visitado el {dd}/{mm}/{yyyy}</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="card-reg p-3 text-center">
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>{counts.ok}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>OK</div>
          </div>
          <div
            className="card-reg p-3 text-center"
            style={counts.falla > 0 ? { background: "var(--color-accent-900)", color: "#fff" } : undefined}
          >
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>{counts.falla}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>No OK</div>
          </div>
          <div className="card-reg p-3 text-center">
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 26 }}>{counts.pendiente}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>Pendientes</div>
          </div>
        </div>

        {fallas.length > 0 && (
          <div>
            <h5>Fallas detectadas</h5>
            <div className="flex flex-col gap-2 mt-2">
              {fallas.map((eq) => (
                <button key={eq.id} className="card-reg text-left p-3" onClick={() => onOpenFalla(eq)}>
                  <div style={{ fontFamily: "var(--font-heading)", fontWeight: 600 }}>{eq.code}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{categoryById(eq.category).name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn-ghost btn-block" onClick={onExport}>
          Exportar fotos y audios por equipo
        </button>
        <button className="btn btn-primary btn-block" onClick={onGeneratePdf}>
          Generar informe (Excel)
        </button>
        <button className="btn btn-ghost btn-block" onClick={onBackToLocations}>
          Volver a locales
        </button>
      </div>
    </>
  );
}

// ---------- Modal: historial ----------

function HistoryModal({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(29,31,32,0.4)" }} onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md p-4" style={{ boxShadow: "var(--shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
        <h5>Historial · {code}</h5>
        <div className="flex flex-col gap-2 mt-3">
          {HISTORY_EXAMPLE.map((h, i) => (
            <div key={i} className="hairline-b pb-2">
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 13, fontWeight: 500 }}>{h.date}</span>
                <StatusChip status={h.status} />
              </div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>{h.comment}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-block mt-3" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ---------- Shared: top bar ----------

function TopBar({ title, kicker, onBack, action }: { title: string; kicker?: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <div
      className="hairline-b flex items-center gap-3 p-4"
      style={{ paddingTop: "calc(var(--space-4) + env(safe-area-inset-top))" }}
    >
      <button onClick={onBack} aria-label="Volver" style={{ minWidth: 44, minHeight: 44 }}>
        <ArrowLeftIcon />
      </button>
      <span className="flex-1 min-w-0">
        {kicker && <span className="kicker block" style={{ color: "var(--color-text)", opacity: 0.5 }}>{kicker}</span>}
        <h5 className="truncate">{title}</h5>
      </span>
      {action}
    </div>
  );
}
