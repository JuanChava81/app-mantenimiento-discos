# Contexto del proyecto (para retomar en una sesión nueva de Claude Code)

Dueño: Juan (Uruguay, habla español, no es desarrollador — explicarle todo
simple, hacer los cambios uno mismo y probarlos antes de subir).

## Los dos sistemas

1. **App web** — este repo (`JuanChava81/app-mantenimiento-discos`).
   Next.js (PWA) en Vercel, lee y escribe Supabase. Plan de visitas de las
   52 sucursales Disco/Devoto, equipos por categoría (AC con subtipos
   Split/Rooftop/Chiller/Multi/UE/UI, gas, UPS, generador, tablero, CG),
   fotos, audios, checklist, export ZIP y informe Excel.
   Se trabaja en la rama `claude/fotos-proyecto-disco-p7u9rk` y después se
   pasa a `main` (fast-forward) para que Vercel publique.

2. **Bot de WhatsApp** — repo `JuanChava81/wpp-mantenimiento`.
   Vercel serverless (Node ESM) + WhatsApp Cloud API + @vercel/kv (Upstash)
   + Supabase + Groq Whisper para transcribir audios. Se pushea directo a
   `main`.
   Flujo del técnico: manda el código de sucursal (`D24`, `DV23`), después
   por cada equipo las fotos/audios y al final el código del equipo
   (`S`, `R`, `CH`, `M`, `UE`, `UI`, `GEN`, `TAB`, `GAS`, `UPS`, `CG` +
   número opcional, ej. `R02`). `Fin D24` cierra la visita. `codigos`
   devuelve la lista de códigos.
   - Lo pendiente (sin código todavía) se guarda en listas de Redis POR
     SUCURSAL Y POR TÉCNICO (`pendientes:<tipo>:<suc>:<remitente>`), así
     el código de un técnico no se lleva las fotos del otro.
   - La subida a Supabase se hace fuera del lock de la sucursal; si un
     mensaje falla el webhook responde 500 para que WhatsApp lo reintente.
   - Al cerrar, lo suelto de cada técnico va a SU último equipo.
   - `Fin D24` cierra solo la parte de quien lo manda (se le confirma lo
     que cargó); la sucursal se cierra del todo, con el resumen a
     WPP_NOTIFY_TO, cuando manda Fin el último técnico (`sesion.participantes`).
     `FIN D24 TODO` la cierra para todos en el momento.
     El cron de inactividad cierra todo. Si alguien manda material sin
     visita abierta, el bot le avisa (máx. un aviso cada 5 min).
   - Al mandar el código de sucursal, le contesta "🔓 Se abrió la visita de
     D24" con los comentarios guardados de cada equipo (una vez por técnico
     por visita).
   - `CAMBIAR S10 S07` pasa lo cargado a S10 en la visita abierta a S07
     (si S07 tenía algo, intercambia). `BORRAR S07` saca lo cargado a S07 en
     la visita abierta. `BORRAR` solo descarta lo mandado sin
     código. El equipo se re-busca en Supabase en cada código (si se borró
     en la app, se crea otro).
   - Confirma "✅ R_02 cargado (N fotos · M audios)" al técnico y avisa si
     alguna foto/audio no se pudo subir (límite de 38 s por tanda, Vercel
     corta a los 60 s). El resumen de cierre va al número de WPP_NOTIFY_TO.
   - Equipo con material cargado pasa a OK solo; si el audio (pasado por un
     modelo de Groq, `pulirObservacion`) reporta una falla, queda No OK.
     `S07 FALLA` / `S07 OK` lo cambian a mano.
   - Visitas por período (`lib/visitas.js`): al empezar el mes de visita
     siguiente se archiva la visita en `equipment_history` y el equipo
     queda limpio; los comentarios viejos (visita anterior o `'informe'`)
     se siguen viendo hasta que llega el PRIMER comentario nuevo de la visita
     a cualquier equipo del local: ahí se borran todos los viejos del local
     (`borrarComentariosViejos`). Abrir la sucursal no borra nada. No se reinicia un equipo cargado
     en los últimos 20 días (se adopta el período). Las fotos se comprimen.
   - Limpieza del Storage (`limpiarStorage`, cron diario; plan gratis 1 GB):
     desde el día 10 de cada mes se borran fotos/audios de meses anteriores
     SOLO de locales exportados después de subirlos; todo lo anterior al
     01/09/2026 (confirmado por Juan) y los archivos huérfanos. Nunca lo
     subido en las últimas 24 h. Usa `archivos_storage()`
     (`supabase/limpiar_storage.sql`).
   - Crons diarios: cerrar sesiones inactivas (3 h) y keepalive de
     Supabase (el plan gratis se pausa si no hay actividad).
   - Es un número de prueba de Meta: máx. 5 destinatarios permitidos, no se
     le puede cambiar la foto de perfil.

## Herrería (sistema aparte, desde 10/2026)

Auditoría anual de herrería en cubierta (sistemas anticaída) en 57 sitios
(52 Disco/Devoto + D29 Libertad + depósitos CD80/CD81/CD82 + Géant G01).
NO comparte nada con mantenimiento salvo el Supabase, el Redis y la clave
de Groq. Regla: no tocar nada de mantenimiento al cambiar herrería.

- **Supabase** (`supabase/herreria_v1.sql`): `herreria_sitios` (cod, nombre,
  rotulo, archivo, direccion, mes), `herreria_auditorias` (ciclo mayo-abril
  '2026-2027', fecha, estado abierta/cerrada/exportada, comentario_general,
  actividad_at, archivos_borrados), `herreria_puntos` (orden, fotos, audios,
  transcripcion, descripcion, recomendacion, remitente), función
  `herreria_nuevo_punto` (orden sin repetir), bucket `herreria`.
- **Bot** (repo wpp-mantenimiento): `api/webhook-herreria.js` + `lib/herreria/`.
  Otro número/app de Meta: variables `HER_WPP_TOKEN`, `HER_PHONE_NUMBER_ID`,
  `HER_VERIFY_TOKEN`, `HER_NOTIFY_TO`, `HER_GRAPH_VERSION`. Redis `her:*`.
  Flujo: cualquier mensaje sin auditoría → lista interactiva de sitios del
  mes (sin exportada en el ciclo) + "Otro sitio" (busca por cod/nombre/
  rótulo); se suma a la auditoría abierta del sitio de los últimos 2 días.
  Fotos → bolsa del técnico; el audio/texto siguiente arma el punto (IA:
  descripción + recomendación, prompt propio en `lib/herreria/ia.js` y
  `src/herreria/prompt.ts` — mantener iguales). Audio sin fotos se suma al
  último punto (o al comentario general). Comandos: GENERAL, BORRAR,
  CORREGIR <texto>, FIN, FIN TODO, AYUDA. Cron (keepalive, aislado):
  cierra auditorías sin actividad en 3 h y borra fotos/audios de las
  exportadas hace +30 días.
- **App** `/herreria` (mismo repo y Vercel; manifest propio id/scope
  `/herreria`, ícono escalera en gris pizarra): plan anual, auditoría,
  punto, export. `/api/herreria/procesar` (Whisper + IA) necesita
  `GROQ_API_KEY` en el Vercel de la app. Grabadora propia (AudioRecorder de
  mantenimiento sube al bucket `audios`, por eso no se reusa).
- **Export (contrato con la skill de Cowork `informe-herreria`, no cambiar)**:
  `HER_<cod>_<AAAA-MM-DD>.zip` con `herreria.json` (version, sitio{cod,
  nombre,rotulo,archivo}, fecha, ciclo, comentario_general, puntos[{orden,
  descripcion, recomendacion, transcripcion, fotos}]), `herreria.txt`,
  `fotos/PNN_fotoN.jpg` (siempre JPG), `audios/PNN_audioN.<ext>` opcional.
  Puntos numerados 1..n por orden. Al exportar: estado exportada.
- Guía de técnicos: `GUIA_TECNICOS_HERRERIA.txt`.

## Cosas que vencen o tienen límite

- Token de WhatsApp (WPP_ACCESS_TOKEN): verificar que sea de usuario del
  sistema "Nunca vence" (si es de 60 días, hay que renovarlo).
- API de Meta v26.0 (~2 años de vida): cambiar con WPP_GRAPH_VERSION.
- Modelos de Groq: GROQ_WHISPER_MODEL / GROQ_CHAT_MODEL si los dan de baja.
- Supabase gratis: pausa por inactividad (keepalive diario) y 1 GB de
  Storage (limpiarStorage).

## Supabase

Tablas: `locations` (suc, months int[], exported_at, visit_date),
`equipment_state` (+ visit_period, comment_period), `equipment_history`,
`_keepalive`. Buckets `photos` y `audios`. Esquema completo en
`supabase/schema.sql`; las migraciones se corren a mano en el SQL Editor
(Claude no tiene acceso directo — hay que darle el SQL a Juan).

Storage: el 28/09/2026 se pasó del 1 GB gratis (1,94 GB). Juan corrió
`supabase/limpiar_storage.sql` y el cron a mano: bajó a ~525 MB (quedan
~446 MB de fotos de Setiembre, que se borran desde el 10/10 si el local
está exportado).

Comentarios de informes viejos: se cargan con `supabase/funcion_cargar_comentario.sql`
(`select cargar_comentario('D 01','ac','Rooftop',1,$c$texto$c$);`), que crea el
equipo si no existe. Con Supabase la app ya no muestra equipos de ejemplo.

Migraciones corridas por Juan hasta la v8 (`supabase/migrate_v8_visitas.sql`,
confirmado el 26/09/2026).

## Reglas de la app

- Un local figura **Completo** cuando se toca "Exportar fotos y audios por
  equipo" después del inicio de su mes de visita planificado más reciente
  (`src/lib/visit-completion.ts`).
- Calendario de visitas (2 meses por local): `src/lib/real-locations.ts` y
  `supabase/schema.sql`, confirmado contra el Excel de Juan.
- Fecha de la visita = `locations.visit_date` (la anota el bot), salvo que
  se cambie a mano en la pantalla del local. Historial real desde
  `equipment_history`.
- La app se re-sincroniza con Supabase cada 15 s y al volver a la
  pestaña (sin pisar equipos editados localmente en los últimos 15 s).
- Estilo: verde oscuro + rojo Disco (`src/app/globals.css`), logo del splash.

## Informes

Juan arma el informe mensual en Excel con la skill `mantenimiento-informes`
a partir del export de la app.
