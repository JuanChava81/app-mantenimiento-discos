# Handoff: App de control de mantenimiento (Disco / Devoto)

## Qué es esto

Prototipo de una app móvil para el control periódico de mantenimiento de locales
de supermercado en Uruguay (cadenas Disco y Devoto). Reemplaza el flujo actual
—sacar fotos, mandarlas por WhatsApp, bajarlas en la computadora y ordenarlas a
mano— por una carga directa en el celular: en cada local se recorren las 5
familias de equipos, se marca estado y verificaciones, se saca foto, se graba una
nota de voz, y al final se genera el reporte y se descargan las fotos ordenadas.

## Sobre los archivos de este paquete

`App Mantenimiento.dc.html` es una **referencia de diseño funcional**, no código de
producción. Se abre en el navegador y funciona de verdad (cámara, audio, export
ZIP). La tarea es **recrear este diseño y este comportamiento en la app real**
(Next.js + Supabase, ver `GUIA_PASO_A_PASO.md`) usando los patrones de ese
proyecto, no copiar el HTML tal cual.

## Fidelidad

**Alta fidelidad (hi-fi).** Colores, tipografías, espaciados e interacciones son
definitivos. La UI debería recrearse fielmente.

---

## Pantallas

### 1. Plan de visitas (home)

- **Propósito:** elegir el local a relevar.
- **Cabecera** a sangre en rojo oscuro `#4a0a0d`, texto blanco: kicker "CONTROL DE
  MANTENIMIENTO · URUGUAY" (10.5px, uppercase, letter-spacing .11em, opacidad .6),
  título "Plan de visitas" (Barlow Condensed 600, 31px), y una fila con el mes
  a la izquierda y "<completados>/<planificados> completados" a la derecha.
- Debajo, sobre fondo blanco: buscador (por sucursal, nombre o dirección), un
  segmentado **Este mes / Todos** y un segmentado **Todos / Disco / Devoto**.
- **Fila de local** (alto mínimo 58px, separador hairline):
  - Cuadrado 40×40 con borde rojo y el código de sucursal (`D 03`, `DV 24`).
    Disco = relleno rojo con texto blanco; Devoto = fondo transparente con texto
    `#a8171f`.
  - Nombre (Barlow Condensed 600, 16px), dirección (11.5px, 55% del texto), barra
    de progreso de 3px (máx. 110px).
  - A la derecha: chip de estado y contador "<revisados>/<total> revisados".
- **Estados del chip:** `Completo` (todo revisado sin fallas, tag-accent),
  `<n> no OK` (todo revisado con fallas, tag-outline), `En progreso`, `Pendiente`.
- Si el filtro no devuelve nada: "No hay locales para este filtro."

### 2. Detalle del local

- Cabecera clara con flecha volver; kicker "<SUC> · <cadena>" y el nombre.
- Chips de cadena y sucursal + dirección; barra de progreso de 6px; línea
  "<n> OK · <n> con falla · <n> pendientes".
- **Fecha de visita** editable (AAAA-MM-DD, por defecto hoy) y, al lado,
  **Visitas planificadas** (solo lectura: los meses del plan, ej. "Ene · Jul").
- Grilla de 2 columnas con las 5 tarjetas de categoría: borde hairline + marcas de
  registro + borde superior rojo de 3px, badge 38×38 con fondo `#fdecec` e ícono
  `#a8171f`, título 16px, "<n>/<n> revisados", mini barra, y chip "<n> no OK" si
  corresponde.
- Botón primario ancho "Ver resumen de visita".

### 3. Lista de equipos de una categoría

- Encabezado "EQUIPOS RELEVADOS".
- **Fila:** miniatura 46×46 (primera foto, o ícono de cámara al 35% si no hay),
  subtipo en versalitas 10px, código (Barlow Condensed 600, 16px), y una línea de
  metadatos con "<n> fotos" y, si hay grabación, un ícono de micrófono + "audio".
  A la derecha, chip de estado con ícono, y botón de papelera 32×32.
- Botón primario ancho "+ Agregar equipo": crea uno con el número siguiente al
  mayor de la categoría y abre su detalle.

### 4. Detalle / carga del equipo

Todo dentro de una tarjeta con marcas de registro, en este orden:

1. **Solo aires acondicionados:** selector de tipo (Split / Rooftop / Chiller /
   Manejadora) y campo "N° equipo". El código se recalcula como
   `AC-<número con 3 dígitos>`.
2. **Fotos** (múltiples). Grilla de 3 columnas de miniaturas 1:1 con una X en la
   esquina para borrar cada una, más un cuadro punteado "+ Agregar". Estado vacío:
   marco 16:9 con ícono de cámara, "Sin fotos todavía", botón primario "Tomar
   fotos" y un botón fantasma "Elegir de la galería". Contador "<n> fotos" arriba
   a la derecha.
   **Importante: las fotos NO llevan tratamiento duotono** — se muestran en color
   real, porque el técnico necesita ver óxido, aceite y agua.
3. **Verificaciones** de la categoría (ver tabla más abajo): una fila por ítem con
   la etiqueta a la izquierda y un segmentado a la derecha.
4. **Mediciones** de la categoría: campos numéricos con la unidad sobreimpresa a
   la derecha del input.
5. **Observación:** textarea (mín. 80px).
6. **Nota de voz:** botón "Grabar nota de voz". Mientras graba, una barra roja
   `#4a0a0d` con punto blanco, "Grabando… M:SS" y botón "Detener". Cada nota
   guardada aparece como fila con etiqueta "Nota <n> · M:SS", un `<audio controls>`
   y papelera. Se pueden guardar varias por equipo. Si falla el permiso:
   "No se pudo acceder al micrófono. Revisá los permisos."
7. **Estado general:** segmentado OK / No OK / Pendiente.
8. Marca de tiempo automática ("Hoy · HH:MM") que se actualiza en cada edición.

Al pie: botón primario "Guardar y volver" y botón fantasma "Eliminar equipo".
En la cabecera, ícono de reloj → modal de historial.

#### Cámara integrada (pantalla completa)

Requisito explícito del usuario: **sacar varias fotos seguidas sin salir de la
app**. El input `<input type="file" capture>` no sirve (una foto por invocación).
Implementado con `getUserMedia`:

- Overlay a pantalla completa sobre fondo `#0b0b0c`.
- Barra superior: "Cancelar" · "<n> fotos tomadas" · botón primario
  "Listo · usar <n>".
- Visor: `<video autoplay playsinline muted>` con `facingMode:'environment'`,
  `object-fit:cover`.
- Tira de miniaturas 52×52 con scroll horizontal sobre `#141415` (solo si ya hay
  tomas).
- Barra inferior: "Deshacer" · obturador redondo de 70px (relleno rojo, borde
  blanco de 4px) · contador grande.
- Cada disparo dibuja el frame en un canvas y lo guarda como JPEG calidad 0.9.
- "Listo" agrega todas las tomas al equipo de una vez; "Cancelar" descarta.
- Si `getUserMedia` no está disponible o se rechaza, cae al selector de archivos
  (que acepta selección múltiple de galería).

### 5. Resumen de visita

- Chips de cadena y sucursal + nombre; "Visitado el DD/MM/AAAA".
- Tres tarjetas de estadística OK / No OK / Pendientes. La de No OK se rellena en
  `#4a0a0d` con texto blanco cuando hay al menos una.
- "Fallas detectadas": una tarjeta por equipo en falla (código, categoría,
  comentario); al tocarla navega directo a ese equipo.
- Acciones: "Exportar fotos y audios por equipo" (secundario), "Generar reporte
  PDF" (primario), "Volver a locales" (fantasma).

#### Export ZIP (implementado y funcionando)

"Exportar fotos y audios" genera un ZIP real (escritor ZIP store-only con CRC32,
sin dependencias) y lo descarga:

```
D-03_Arenal-Grande_2026-07-30.zip
└── D-03_Arenal-Grande_2026-07-30/
    ├── Aires-acondicionados/
    │   ├── AC-031_foto1.jpg
    │   ├── AC-031_foto2.jpg
    │   └── AC-031_nota1.webm
    ├── Generador-electrico/
    │   └── GEN-031_foto1.jpg
    └── informe.txt
```

`informe.txt` lleva local, dirección, fecha, y por equipo: categoría, subtipo,
código, estado, observación, cada verificación con su **etiqueta en español** y
cada medición con su **unidad** (ej. "Tanque de combustible: 55 %"), más el conteo
de fotos y notas. En la app real conviene generarlo del lado del servidor.

### 6. Historial de un equipo (modal)

Lista de visitas anteriores con fecha, chip de estado y comentario. En el prototipo
son datos de ejemplo; en la app real sale de la tabla `inspections`.

---

## Categorías, verificaciones y mediciones

Tomadas de la planilla de registro de visita del usuario. Son fijas por categoría
y aplican a todos los locales.

| id | Categoría | Prefijo | Subtipos | Verificaciones (segmentado) | Mediciones |
|---|---|---|---|---|---|
| `ac` | Aires acondicionados | `AC` | Split, Rooftop, Chiller, Manejadora | Filtro · Desagüe · Intercambiador (OK/No OK) | — |
| `gas` | Cañerías de gas | `GAS` | Tramo | Flexibles autorizados · Sistema de corte por pánico (OK/No OK) | — |
| `ups` | UPS | `UPS` | UPS | UPS en línea (OK/No OK) · Aire acondicionado dedicado (Sí/No) · Estado de carga de baterías (OK/No OK) | Carga (%) · Autonomía (texto) |
| `gen` | Generador eléctrico | `GEN` | Generador | Batería · Líquido refrigerante · Lubricante · Correa (OK/No OK) | Tanque de combustible (%) · Horas de equipo (h) · Voltaje (V) |
| `sub` | Subestación y tablero | `TAB` | Tablero | Objetos extraños · Filtraciones de agua · Tableros eléctricos · Bancos de condensadores (OK/No OK) | Factor de potencia |

## Locales y plan de visitas

52 sucursales reales extraídas del archivo `Calendario de visitas.xlsx`
(28 Disco `D 01`…`D 28`, 24 Devoto `DV 01`…`DV 25`, sin `DV 17`), con código,
nombre, dirección y meses de visita. Están en la constante `RAW_LOCATIONS` del
prototipo — copiala como semilla de la tabla `locations`.

Cada local se visita 2 veces al año, y por mes salen 8 o 9 locales.

> ⚠ **Dato a confirmar antes de cargar la base.** En la planilla, la grilla de
> meses de la hoja "Plan con formato" **no coincide** con el listado que calcula la
> hoja "Mes". Julio está verificado contra la hoja "Mes" y son estos 8:
> `D 03, D 12, D 21, D 22, DV 03, DV 10, DV 19, DV 24` (en el prototipo, la
> constante `JULIO`). Los otros 11 meses salen de la grilla y **pueden estar mal**.
> Hay que validarlos con el usuario, mes por mes, antes de cargarlos.

## Interacciones

- Navegación por pila con botón volver: Plan → Local → Categoría → Equipo. El
  resumen se apila sobre el local. Desde una falla del resumen se salta al equipo
  reconstruyendo la pila completa.
- Todo cambio se guarda al instante y actualiza la marca de tiempo. "Guardar y
  volver" solo navega.
- Los contadores y barras de progreso se recalculan solos en los tres niveles.
- Eliminar un equipo lo saca de la lista y de los contadores, con toast de
  confirmación (2,2 s). Si estabas en su detalle, vuelve atrás.
- Toast: fondo `#4a0a0d`, texto blanco, abajo centrado, 2,2 s.
- Foco de teclado: contorno rojo de 2px (`:focus-visible`), nunca el azul del
  navegador.

## Estado / modelo de datos

Estado del prototipo (traducirlo a tablas):

```
locations         52 locales: suc, cadena, nombre, dirección, meses
categories        5 por local (fijas, definidas en CATEGORY_DEFS)
equipment         por categoría: id, prefijo, número, subtipo
equipmentData     override por equipo: estado, comentario, photos[], audios[],
                  checks{}, fields{}, subtipo, número, actualizado
addedEquipment    equipos agregados en campo
deletedEquipment  equipos eliminados
visitDates        fecha de visita por local
```

Modelo relacional sugerido para la app real:

```sql
locations   (id, chain, suc, name, address, months int[])
visits      (id, location_id, visit_date, technician_id, status, created_at)
equipment   (id, location_id, category, subtype, code, number, active)
inspections (id, visit_id, equipment_id, status, comment, checks jsonb,
             fields jsonb, updated_at)
photos      (id, inspection_id, storage_path, taken_at)
audios      (id, inspection_id, storage_path, duration_secs, recorded_at)
```

`inspections` es la tabla que da el historial: una fila por equipo y por visita.
`checks` y `fields` como `jsonb` permiten sumar verificaciones nuevas sin migrar.

## Design tokens

**Colores** (rojo Disco; el resto viene del sistema base)

| Token | Valor | Uso |
|---|---|---|
| fondo | `#ffffff` | fondo de la app |
| superficie | `#f7eded` | miniaturas, campos |
| texto | `#1d1f20` | texto principal |
| acento | `#d21f2b` | botones, íconos, barras, obturador |
| acento 100 | `#fdecec` | fondos suaves, chips |
| acento 200 | `#fad0d1` | |
| acento 300 | `#f2a3a6` | borde punteado "+ Agregar" |
| acento 400 | `#e8767a` | |
| acento 500 | `#dd4a50` | |
| acento 600 | `#b81a25` | hover del primario |
| acento 700 | `#a8171f` | íconos, texto en chips, código Devoto |
| acento 800 | `#7c1116` | texto sobre fondos claros |
| acento 900 | `#4a0a0d` | cabecera, tarjeta No OK, toast, barra de grabación |
| divisor | `rgba(29,31,32,.16)` | bordes hairline |
| negro cámara | `#0b0b0c` / `#141415` | overlay de cámara y tira de miniaturas |

**Tipografía:** Barlow Condensed 600 para títulos, Barlow 400/500/700 para texto
(Google Fonts). Escala: h1 42 · h2 32 · h3 25 · h4 20 · h5 16 · h6 13 (uppercase,
letter-spacing .08em). Cuerpo 15px, línea 1.55.

**Espaciado:** 3.4 · 6.8 · 10.2 · 13.6 · 20.4 · 27.2 px.

**Bordes:** esquinas rectas (radio 0) en todo. Tarjetas y botones con borde
hairline; las tarjetas llevan cuatro marcas de registro "+" en las esquinas.

**Sombras:** `sm 0 1px 2px rgba(43,43,45,.14)` · `md 0 3px 10px rgba(43,43,45,.16)`
· `lg 0 12px 32px rgba(43,43,45,.22)`.

**Íconos:** estilo Lucide, trazo 1.5. En la app real instalar `lucide-react` en
vez de copiar los SVG del prototipo.

**Área táctil:** mínimo 44px de alto en cualquier control tocable; los botones
principales usan 46px.

## Assets

- Sin imágenes propias: las fotos las saca el usuario.
- Los números de equipo del prototipo son de ejemplo; los códigos reales se cargan
  en la primera visita de cada local.
- El logo de Disco/Devoto no está incluido; usar los archivos oficiales de la
  empresa si se van a mostrar.

## Archivos incluidos

- `App Mantenimiento.dc.html` — el prototipo completo y funcional.
- `styles.css` — tokens y clases del sistema visual, con la paleta roja aplicada.
- `support.js` — runtime que necesita el prototipo para correr.
- `Calendario de visitas.xlsx` — la planilla original del plan de visitas.
- `GUIA_PASO_A_PASO.md` — cómo construir la app real vos mismo, paso a paso.
