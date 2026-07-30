"use client";

import { useMemo, useRef, useState } from "react";
import { CATEGORIES, categoryById } from "@/lib/categories";
import { EQUIPMENT, INITIAL_EQUIPMENT_DATA, LOCATIONS } from "@/lib/mock-data";
import { CategoryId, Chain, Equipment, EquipmentData, EquipmentStatus } from "@/lib/types";
import { StatusChip } from "./StatusChip";
import { ProgressBar } from "./ProgressBar";
import {
  ArrowLeftIcon,
  CameraIcon,
  ClockIcon,
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

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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

export default function MantenimientoApp() {
  const [stack, setStack] = useState<View[]>([{ screen: "locations" }]);
  const [equipment, setEquipment] = useState<Equipment[]>(EQUIPMENT);
  const [data, setData] = useState<Record<string, EquipmentData>>(INITIAL_EQUIPMENT_DATA);
  const [visitDates, setVisitDates] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [chainFilter, setChainFilter] = useState<"Todos" | Chain>("Todos");
  const [toast, setToast] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const nextEquipmentSeq = useRef(1);

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
    setEquipment((eq) => [...eq, newEq]);
    setData((d) => ({
      ...d,
      [id]: { status: "pendiente", comment: "", photoUrl: null, updatedAt: nowLabel() },
    }));
    push({ screen: "equipment", locationId, categoryId, equipmentId: id });
  }

  function deleteEquipment(eqId: string, after?: () => void) {
    setEquipment((eq) => eq.map((e) => (e.id === eqId ? { ...e, active: false } : e)));
    showToast("Equipo eliminado");
    after?.();
  }

  function updateEquipmentData(eqId: string, patch: Partial<EquipmentData>) {
    setData((d) => ({
      ...d,
      [eqId]: { ...d[eqId], ...patch, updatedAt: nowLabel() },
    }));
  }

  const filteredLocations = useMemo(() => {
    return LOCATIONS.filter((loc) => {
      if (chainFilter !== "Todos" && loc.chain !== chainFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        loc.name.toLowerCase().includes(q) ||
        loc.address.toLowerCase().includes(q) ||
        String(loc.number).includes(q)
      );
    });
  }, [search, chainFilter]);

  const completedThisMonth = LOCATIONS.filter((l) => visitDates[l.id]).length;
  const now = new Date();
  const visitLabel = `Visita de ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      {view.screen === "locations" && (
        <LocationsScreen
          locations={filteredLocations}
          search={search}
          setSearch={setSearch}
          chainFilter={chainFilter}
          setChainFilter={setChainFilter}
          visitLabel={visitLabel}
          completedThisMonth={completedThisMonth}
          totalLocations={LOCATIONS.length}
          countsFor={countsFor}
          equipmentForLocation={equipmentForLocation}
          onOpen={(id) => push({ screen: "location", locationId: id })}
        />
      )}

      {view.screen === "location" && (() => {
        const location = LOCATIONS.find((l) => l.id === view.locationId)!;
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
        const location = LOCATIONS.find((l) => l.id === view.locationId)!;
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
            onChangeType={(subtype) =>
              setEquipment((list) =>
                list.map((e) => (e.id === eq.id ? { ...e, subtype } : e))
              )
            }
            onChangeNumber={(n) =>
              setEquipment((list) =>
                list.map((e) =>
                  e.id === eq.id
                    ? { ...e, number: n, code: `${cat.prefix}-${String(n).padStart(3, "0")}` }
                    : e
                )
              )
            }
            onChangeComment={(comment) => updateEquipmentData(eq.id, { comment })}
            onChangeStatus={(status) => updateEquipmentData(eq.id, { status })}
            onChangePhoto={(photoUrl) => updateEquipmentData(eq.id, { photoUrl })}
          />
        );
      })()}

      {view.screen === "summary" && (() => {
        const location = LOCATIONS.find((l) => l.id === view.locationId)!;
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
            onExport={() => showToast("Fotos exportadas (simulado)")}
            onGeneratePdf={() => showToast("Reporte PDF generado (simulado)")}
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

// ---------- Screen 1: Locales ----------

function LocationsScreen({
  locations,
  search,
  setSearch,
  chainFilter,
  setChainFilter,
  visitLabel,
  completedThisMonth,
  totalLocations,
  countsFor,
  equipmentForLocation,
  onOpen,
}: {
  locations: typeof LOCATIONS;
  search: string;
  setSearch: (v: string) => void;
  chainFilter: "Todos" | Chain;
  setChainFilter: (v: "Todos" | Chain) => void;
  visitLabel: string;
  completedThisMonth: number;
  totalLocations: number;
  countsFor: (list: Equipment[]) => { ok: number; falla: number; pendiente: number; total: number };
  equipmentForLocation: (id: string) => Equipment[];
  onOpen: (id: string) => void;
}) {
  return (
    <>
      <header className="header-hero">
        <div className="kicker">CONTROL DE MANTENIMIENTO · URUGUAY</div>
        <h1 style={{ fontSize: 32, marginTop: 4 }}>Locales</h1>
        <div className="flex justify-between mt-2" style={{ fontSize: 12, opacity: 0.8 }}>
          <span>{visitLabel}</span>
          <span>{completedThisMonth}/{totalLocations} completados</span>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-3">
        <div className="relative">
          <SearchIcon size={14} className="absolute" style={{ left: 10, top: 15 }} />
          <input
            className="field-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por nombre, dirección o número"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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

        <div className="hairline" style={{ borderLeft: "none", borderRight: "none", borderBottom: "none" }}>
          {locations.map((loc) => {
            const list = equipmentForLocation(loc.id);
            const counts = countsFor(list);
            const status =
              counts.total === 0
                ? "Pendiente"
                : counts.ok + counts.falla === counts.total
                ? "Completo"
                : counts.ok + counts.falla > 0
                ? "En progreso"
                : "Pendiente";
            const initials = loc.chain === "Disco" ? "DI" : "DE";
            return (
              <button
                key={loc.id}
                onClick={() => onOpen(loc.id)}
                className="w-full flex items-center gap-3 hairline-b text-left"
                style={{ minHeight: 56, padding: "8px 4px" }}
              >
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    border: "1.5px solid var(--color-accent-600)",
                    background: loc.chain === "Disco" ? "var(--color-accent-600)" : "transparent",
                    color: loc.chain === "Disco" ? "#fff" : "var(--color-accent-700)",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }} className="block truncate">
                    {loc.name}
                  </span>
                  <span style={{ fontSize: 11.5, opacity: 0.55 }} className="block truncate">
                    {loc.address}
                  </span>
                  <ProgressBar value={counts.ok + counts.falla} max={counts.total || 1} widthPx={120} />
                </span>
                <span className="flex flex-col items-end gap-1 shrink-0">
                  <span className="chip chip-pendiente">{status}</span>
                  <span style={{ fontSize: 11, opacity: 0.6 }}>
                    {counts.ok + counts.falla}/{counts.total}
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
  location: (typeof LOCATIONS)[number];
  counts: { ok: number; falla: number; pendiente: number; total: number };
  visitDate: string;
  onVisitDateChange: (v: string) => void;
  equipmentForCategory: (catId: CategoryId) => Equipment[];
  countsFor: (list: Equipment[]) => { ok: number; falla: number; pendiente: number; total: number };
  onBack: () => void;
  onOpenCategory: (catId: CategoryId) => void;
  onSummary: () => void;
}) {
  return (
    <>
      <TopBar title={location.name} onBack={onBack} />
      <div className="p-4 flex flex-col gap-4">
        <div>
          <span className="tag-outline">{location.chain}</span>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{location.address}</div>
          <ProgressBar value={counts.ok + counts.falla} max={counts.total || 1} height={6} />
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {counts.ok} OK · {counts.falla} con falla · {counts.pendiente} pendientes
          </div>
        </div>

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
                {c.falla > 0 && <span className="chip chip-falla">{c.falla} con falla</span>}
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
  location: (typeof LOCATIONS)[number];
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
      <TopBar title={`${location.name} · ${category.name}`} onBack={onBack} />
      <div className="p-4 flex flex-col gap-3">
        <h6>Equipos relevados</h6>
        <div>
          {list.map((eq) => {
            const eqData = data[eq.id];
            return (
              <div key={eq.id} className="flex items-center gap-3 hairline-b" style={{ minHeight: 56, padding: "8px 4px" }}>
                <span
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 44, height: 44, background: "var(--color-surface)" }}
                >
                  <CameraIcon size={18} className="opacity-35" />
                </span>
                <button className="flex-1 min-w-0 text-left" onClick={() => onOpenEquipment(eq.id)}>
                  <span style={{ fontSize: 10, textTransform: "uppercase" }} className="block opacity-60">
                    {eq.subtype}
                  </span>
                  <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 16 }} className="block">
                    {eq.code}
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
  onChangePhoto,
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
  onChangePhoto: (url: string | null) => void;
}) {
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

          <div
            className="flex flex-col items-center justify-center gap-2"
            style={{ aspectRatio: "1/1", background: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
          >
            {eqData.photoUrl ? (
              <img src={eqData.photoUrl} alt="Foto del equipo" className="w-full h-full object-cover" style={{ filter: "sepia(0.3) hue-rotate(-30deg) saturate(2)" }} />
            ) : (
              <>
                <CameraIcon size={28} className="opacity-40" />
                <span style={{ fontSize: 13, opacity: 0.6 }}>Sin foto todavía</span>
              </>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            id={`photo-${equipmentItem.id}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onChangePhoto(URL.createObjectURL(file));
            }}
          />
          {eqData.photoUrl ? (
            <div className="flex gap-2">
              <label htmlFor={`photo-${equipmentItem.id}`} className="btn btn-ghost" style={{ flex: 1 }}>
                Reemplazar foto
              </label>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => onChangePhoto(null)}>
                Quitar
              </button>
            </div>
          ) : (
            <label htmlFor={`photo-${equipmentItem.id}`} className="btn btn-primary btn-block">
              Tomar foto
            </label>
          )}

          <label className="flex flex-col gap-1" style={{ fontSize: 12 }}>
            Observación
            <textarea
              className="field-textarea"
              value={eqData.comment}
              onChange={(e) => onChangeComment(e.target.value)}
            />
          </label>

          <div className="seg">
            {(["ok", "falla", "pendiente"] as EquipmentStatus[]).map((st) => (
              <button
                key={st}
                className={`seg-opt ${eqData.status === st ? "active" : ""}`}
                onClick={() => onChangeStatus(st)}
              >
                {st === "ok" ? "OK" : st === "falla" ? "Falla" : "Pendiente"}
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
  location: (typeof LOCATIONS)[number];
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
          <span className="tag-outline">{location.chain}</span>
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
            <div style={{ fontSize: 11, opacity: 0.85 }}>Con falla</div>
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
          Exportar fotos por equipo
        </button>
        <button className="btn btn-primary btn-block" onClick={onGeneratePdf}>
          Generar reporte PDF
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

function TopBar({ title, onBack, action }: { title: string; onBack: () => void; action?: React.ReactNode }) {
  return (
    <div className="hairline-b flex items-center gap-3 p-4">
      <button onClick={onBack} aria-label="Volver">
        <ArrowLeftIcon />
      </button>
      <h5 className="flex-1 truncate">{title}</h5>
      {action}
    </div>
  );
}
