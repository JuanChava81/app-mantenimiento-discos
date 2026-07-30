# Guía paso a paso — construir la app vos mismo

Pensada para que la hagas vos con ayuda de una IA de programación (Claude Code),
sin ser desarrollador, y que después puedas seguir modificándola.

---

## 1. Qué stack usar y por qué

| Pieza | Elección | Por qué |
|---|---|---|
| App | **Next.js (React)** | Es lo que mejor conocen las IA de código; una sola base sirve para celular y laptop. |
| Base de datos + fotos + login | **Supabase** | Plan gratis, base de datos, almacenamiento de fotos y usuarios en un solo lado. |
| Publicación | **Vercel** | Gratis, se conecta a GitHub y publica solo con cada cambio. |
| Instalación en el celular | **PWA** | Se instala desde el navegador con ícono propio. Sin Play Store ni App Store, sin revisiones ni costos. |
| Código guardado | **GitHub** | Historial de cambios; es también lo que te permite modificarla en el futuro. |

Todo tiene plan gratuito suficiente para un equipo chico (los costos aparecen recién
con mucho tráfico o muchos GB de fotos).

## 2. Cuentas a crear (30 minutos)

1. **GitHub** — github.com
2. **Supabase** — supabase.com (creá un proyecto, anotá la *URL* y la *anon key*)
3. **Vercel** — vercel.com (entrá con la cuenta de GitHub)
4. **Claude Code** — la herramienta con la que le vas a pedir el código
   (claude.ai/code o la app de escritorio).

## 3. Orden de trabajo recomendado

Construí de a una etapa; probá cada una antes de seguir.

1. **Esqueleto y pantallas** — Next.js con las 5 pantallas y datos falsos, igual
   que el prototipo. Sin base de datos todavía.
2. **Base de datos** — crear las tablas en Supabase y conectar la app.
3. **Fotos** — subida a Supabase Storage desde la cámara del celular.
4. **Usuarios** — login por mail para vos y los técnicos.
5. **Offline** — que se pueda cargar sin señal y se sincronice al volver.
6. **Reportes** — PDF por visita y descarga de fotos ordenadas por equipo.
7. **Publicación y PWA** — subir a Vercel e instalar en el celular.

## 4. Tablas de Supabase

Pegale esto a Claude Code y que lo cree por vos (o corré el SQL en el editor de
Supabase):

```sql
create table locations (
  id uuid primary key default gen_random_uuid(),
  chain text not null,            -- 'Disco' | 'Devoto'
  number int not null,
  name text not null,
  address text
);

create table equipment (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  category text not null,         -- ac | gas | ups | gen | panel
  subtype text,                   -- Split | Rooftop | Chiller | Manejadora | ...
  code text not null,             -- AC-014
  number int,
  active boolean default true
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references locations(id) on delete cascade,
  visit_date date not null,
  technician_id uuid,
  status text default 'en_progreso',
  created_at timestamptz default now()
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete cascade,
  status text default 'pendiente', -- ok | falla | pendiente
  comment text,
  updated_at timestamptz default now()
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  storage_path text not null,
  taken_at timestamptz default now()
);
```

Clave: **una fila de `inspections` por equipo y por visita**. Eso es lo que te da
el historial de cada aire acondicionado mes a mes sin trabajo extra.

## 5. Cómo pedirle el trabajo a Claude Code

Abrí Claude Code en una carpeta vacía y arrancá con algo así:

> Tengo un prototipo en HTML de una app de control de mantenimiento (te paso la
> carpeta `design_handoff_app_mantenimiento`). Leé el `README.md`, que tiene la
> especificación completa de pantallas, colores y tipografías.
> Quiero construir la app real con Next.js (App Router), TypeScript, Tailwind y
> Supabase. Empecemos por la etapa 1: las pantallas con datos de ejemplo,
> respetando exactamente los colores y tipografías del README.
> Explicame cada paso en lenguaje simple, no asumas que sé programar.

Consejos que hacen la diferencia:

- **Una etapa por vez.** Si le pedís todo junto, se rompe y no sabés dónde.
- **Pedile que te explique** qué archivo tocó y para qué.
- **Guardá en GitHub al terminar cada etapa** ("hacé un commit con este avance").
  Así siempre podés volver atrás.
- Cuando algo se vea mal, sacá una captura y pasásela: entiende imágenes.

## 6. Instalarla en el celular y en la laptop

Una vez publicada en Vercel tenés un link (por ejemplo
`mantenimiento-locales.vercel.app`):

- **Android:** abrir el link en Chrome → menú ⋮ → "Instalar aplicación".
- **iPhone:** abrir en Safari → compartir → "Agregar a pantalla de inicio".
- **Laptop:** abrir el mismo link en el navegador (o instalarlo igual desde Chrome).

Como todo pasa por la misma base de datos de Supabase, lo que cargás en el celular
aparece en la laptop al instante. Pedile a Claude Code que agregue el
`manifest.json` y el service worker: eso es lo que la convierte en PWA instalable
y le permite funcionar sin señal.

## 7. Descargar las fotos ordenadas

El punto clave de tu flujo actual. Pedile a Claude Code:

> En la pantalla de resumen, el botón "Exportar fotos" tiene que generar un ZIP con
> las fotos de la visita, con los archivos nombrados
> `<Local>_<Fecha>_<CódigoEquipo>_<n>.jpg` y agrupados en carpetas por categoría.

Y para el reporte:

> El botón "Generar reporte PDF" tiene que armar un PDF con la portada del local y
> la fecha, y una página por equipo con la foto, el estado y el comentario.

## 8. Modificarla en el futuro

Como el código queda en GitHub, siempre podés abrir Claude Code en esa carpeta y
pedirle cambios en palabras normales: "agregá una categoría nueva de equipos",
"quiero que el técnico firme al final", "sumá un local nuevo en Maldonado".
Publica solo con hacer commit y push: Vercel actualiza la app y todos los
celulares reciben la versión nueva sin instalar nada.

Recomendación: no borres el prototipo. Sirve como referencia visual cada vez que
agregues una pantalla nueva y querés que quede en el mismo estilo.

## 9. Costos esperables

- Supabase gratis: 500 MB de base y 1 GB de fotos. Con 8-9 locales por mes y unas
  15 fotos por local, te alcanza para varios meses; después son unos USD 25/mes.
- Vercel gratis alcanza de sobra para uso interno.
- Dominio propio (opcional): unos USD 12 al año.
