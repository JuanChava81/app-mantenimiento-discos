# Handoff: App de control de mantenimiento (Disco / Devoto)

## Qué es esto

Prototipo de una app móvil para el control mensual de mantenimiento de locales de
supermercado en Uruguay. Reemplaza el flujo actual (sacar fotos → mandarlas por
WhatsApp → bajarlas en la computadora y ordenarlas a mano) por una carga directa
en el celular: en cada local se recorren las 5 familias de equipos, se marca
estado, se saca foto y se escribe la observación, y al final se genera el reporte.

## Sobre los archivos de este paquete

Los archivos HTML incluidos son **referencias de diseño**, no código de producción.
Muestran el aspecto y el comportamiento previstos. La tarea es **recrear estos
diseños en el entorno de la app real** (React / Next.js recomendado, ver
`GUIA_PASO_A_PASO.md`) usando los patrones y librerías de ese proyecto, no copiar
el HTML tal cual.

## Fidelidad

**Alta fidelidad (hi-fi).** Colores, tipografías, espaciados e interacciones son
definitivos. La UI debería recrearse fielmente.

---

## Pantallas

### 1. Locales (home)

- **Propósito:** elegir el local a relevar entre los 40 (20 Disco + 20 Devoto).
- **Layout:** cabecera roja a sangre (fondo `#4a0a0d`, texto blanco) con kicker
  "CONTROL DE MANTENIMIENTO · URUGUAY" (11px, uppercase, letter-spacing .1em,
  opacidad .65), título "Locales" (Barlow Condensed 600, 32px) y una fila con
  "Visita de <mes año>" a la izquierda y "<completados>/<total> completados" a la
  derecha (12px, opacidad .8).
- Debajo, sobre fondo blanco: campo de búsqueda (con ícono lupa a 10px del borde
  izquierdo, input con `padding-left:32px`), control segmentado Todos / Disco /
  Devoto, y la lista.
- **Fila de local** (alto mínimo 56px, separador inferior hairline):
  - Cuadrado 34×34 con borde rojo y las letras `DI` (relleno rojo, texto blanco)
    o `DE` (fondo transparente, texto `#a8171f`).
  - Nombre del local (Barlow Condensed 600, 16px), dirección (11.5px, 55% del
    color de texto), barra de progreso de 3px (máx. 120px de ancho).
  - A la derecha: chip de estado (Completo / En progreso / Pendiente) y contador
    "<revisados>/<total>".
- **Filtros:** búsqueda por nombre, dirección o número; filtro por cadena.

### 2. Detalle del local

- **Propósito:** ver el avance del local y entrar a cada familia de equipos.
- Cabecera clara con flecha "volver" + nombre del local.
- Bloque superior: chip de cadena, dirección, barra de progreso de 6px, línea
  "<n> OK · <n> con falla · <n> pendientes".
- **Campo "Fecha de visita"** editable (formato AAAA-MM-DD, por defecto hoy).
- Grilla de 2 columnas con las 5 tarjetas de categoría. Cada tarjeta: borde
  hairline + marcas de registro en las esquinas + borde superior rojo de 3px,
  badge de 38×38 con fondo `#fdecec` y el ícono en `#a8171f`, título (16px),
  "<n>/<n> revisados", mini barra de progreso y, si corresponde, chip
  "<n> con falla".
- Botón primario ancho "Ver resumen de visita" (alto mínimo 46px).

**Las 5 categorías (fijas en todos los locales):**

| id | Nombre | Prefijo de código | Subtipos |
|---|---|---|---|
| `ac` | Aires acondicionados | `AC` | Split, Rooftop, Chiller, Manejadora |
| `gas` | Cañerías de gas | `GAS` | Tramo |
| `ups` | UPS | `UPS` | UPS |
| `gen` | Generador eléctrico | `GEN` | Generador |
| `panel` | Tablero eléctrico | `TAB` | Tablero |

### 3. Lista de equipos de una categoría

- Encabezado de sección "EQUIPOS RELEVADOS" (h6, uppercase).
- **Fila de equipo:** miniatura 44×44 (foto si existe, si no ícono de cámara al
  35% de opacidad), subtipo en versalitas 10px arriba, código del equipo
  (Barlow Condensed 600, 16px) abajo, chip de estado con ícono a la derecha, y
  botón de papelera de 32×32 para eliminar el equipo.
- Botón primario ancho "+ Agregar equipo" al final de la lista.

### 4. Detalle / carga del equipo

Todo dentro de una tarjeta con marcas de registro:

- **Solo para aires acondicionados:** control segmentado de 4 opciones
  (Split / Rooftop / Chiller / Manejadora) y campo numérico "N° de equipo".
  Al cambiar el número, el código se recalcula como `AC-<número con 3 dígitos>`.
- **Foto:** cuadro 1:1. Sin foto → marco con ícono de cámara y "Sin foto todavía"
  + botón primario "Tomar foto". Con foto → la imagen con tratamiento duotono
  rojo + botones "Reemplazar foto" y "Quitar".
  El input es `<input type="file" accept="image/*" capture="environment">`, o sea
  abre la cámara directamente en el celular.
- **Observación:** textarea (mín. 90px de alto).
- **Estado:** control segmentado OK / Falla / Pendiente.
- **Marca de tiempo automática:** "Hoy · HH:MM" cada vez que se edita algo.
- Botón primario "Guardar y volver" + botón fantasma "Eliminar equipo".
- En la cabecera, ícono de reloj → historial del equipo.

### 5. Resumen de visita

- Chip de cadena + nombre del local + "Visitado el DD/MM/AAAA".
- Tres tarjetas de estadística (OK / Con falla / Pendientes). La de "Con falla"
  se rellena en rojo oscuro `#4a0a0d` con texto blanco cuando hay al menos una.
- Sección "Fallas detectadas": una tarjeta por equipo en falla con su código, la
  categoría y el comentario; al tocarla navega directo a ese equipo.
- Acciones: "Exportar fotos por equipo" (secundario) y "Generar reporte PDF"
  (primario) + "Volver a locales".

### 6. Historial de un equipo (modal)

Lista de las visitas anteriores con fecha, chip de estado y comentario. En el
prototipo son datos de ejemplo; en la app real sale de la tabla de inspecciones.

---

## Interacciones

- Navegación por pila (stack) con botón "volver": Locales → Local → Categoría →
  Equipo. El resumen se apila sobre el local. Desde una falla del resumen se salta
  directo al equipo reconstruyendo la pila completa.
- Todo cambio (estado, comentario, foto, tipo, número) se guarda al instante y
  actualiza la marca de tiempo — no hay botón de "guardar" real, "Guardar y volver"
  solo navega.
- Los contadores y barras de progreso de local y categoría se recalculan solos.
- Eliminar un equipo lo saca de la lista y de los contadores, y muestra un toast
  de confirmación (2,2 s).
- Agregar un equipo crea uno nuevo con el número siguiente al mayor existente de
  esa categoría y abre su pantalla de detalle.
- Estados de foco: contorno rojo de 2px (`:focus-visible`), nunca el azul del
  navegador.

## Estado / modelo de datos

Estado del prototipo (traducirlo a tablas):

```
locations            40 locales fijos: id, cadena, número, nombre, dirección
categories           5 por local (fijas)
equipment            por categoría: id, prefijo, número, subtipo
equipmentData        override por equipo: estado, comentario, foto, actualizado
addedEquipment       equipos agregados en campo
deletedEquipment     equipos eliminados
visitDates           fecha de visita por local
```

Modelo relacional sugerido para la app real:

```sql
locations   (id, chain, number, name, address)
visits      (id, location_id, visit_date, technician_id, status, created_at)
equipment   (id, location_id, category, subtype, code, number, active)
inspections (id, visit_id, equipment_id, status, comment, updated_at)
photos      (id, inspection_id, storage_path, taken_at)
```

`inspections` es la tabla que da el historial: una fila por equipo y por visita.

## Design tokens

**Colores**

| Token | Valor | Uso |
|---|---|---|
| fondo | `#ffffff` | fondo de la app |
| superficie | `#f7eded` | miniaturas, campos |
| texto | `#1d1f20` | texto principal |
| acento | `#d21f2b` | rojo Disco: botones, íconos, barras |
| acento 100 | `#fdecec` | fondos suaves, chips |
| acento 200 | `#fad0d1` | |
| acento 300 | `#f2a3a6` | |
| acento 400 | `#e8767a` | |
| acento 500 | `#dd4a50` | |
| acento 600 | `#d21f2b` | hover del primario |
| acento 700 | `#a8171f` | íconos, texto en chips |
| acento 800 | `#7c1116` | texto sobre fondos claros |
| acento 900 | `#4a0a0d` | cabecera home, tarjeta de fallas, toast |
| divisor | `rgba(29,31,32,.16)` | bordes hairline |

**Tipografía:** Barlow Condensed 600 para títulos, Barlow 400/500/700 para texto
(Google Fonts). Escala: h1 42 · h2 32 · h3 25 · h4 20 · h5 16 · h6 13 (uppercase,
letter-spacing .08em). Cuerpo 15px, línea 1.55.

**Espaciado:** 3.4 · 6.8 · 10.2 · 13.6 · 20.4 · 27.2 px.

**Bordes:** todo con esquinas rectas (radio 0). Tarjetas y botones con borde
hairline; las tarjetas llevan cuatro marcas de registro "+" en las esquinas.

**Sombras:** `sm 0 1px 2px rgba(43,43,45,.14)` · `md 0 3px 10px rgba(43,43,45,.16)`
· `lg 0 12px 32px rgba(43,43,45,.22)`.

**Íconos:** estilo Lucide, trazo 1.5. En la app real conviene instalar
`lucide-react` en vez de copiar los SVG del prototipo.

**Área táctil:** mínimo 44px de alto en cualquier control tocable.

## Assets

- Sin imágenes propias: las fotos las saca el usuario con la cámara.
- Las direcciones y números de equipo del prototipo son de ejemplo — hay que
  cargar los datos reales de los 40 locales.
- El logo de Disco/Devoto no está incluido; usar los archivos oficiales de la
  empresa si se van a mostrar.

## Archivos incluidos

- `App Mantenimiento.dc.html` — el prototipo completo (abrir en el navegador).
- `styles.css` — tokens y clases del sistema visual base.
- `support.js` — runtime que necesita el prototipo para correr.
- `GUIA_PASO_A_PASO.md` — cómo construir la app real vos mismo, paso a paso.
