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
     El cron de inactividad cierra todo. Si alguien manda material sin
     visita abierta, el bot le avisa (máx. un aviso cada 5 min).
   - Al mandar el código de sucursal, le contesta "🔓 Se abrió la visita de
     D24" con los comentarios guardados de cada equipo (una vez por técnico
     por visita).
   - Confirma "✅ R_02 cargado (N fotos · M audios)" al técnico; el resumen
     de cierre va al número de WPP_NOTIFY_TO.
   - Crons diarios: cerrar sesiones inactivas (3 h) y keepalive de
     Supabase (el plan gratis se pausa si no hay actividad).
   - Es un número de prueba de Meta: máx. 5 destinatarios permitidos, no se
     le puede cambiar la foto de perfil.

## Supabase

Tablas: `locations` (suc, months int[], exported_at), `equipment_state`,
`_keepalive`. Buckets `photos` y `audios`. Esquema completo en
`supabase/schema.sql`; las migraciones se corren a mano en el SQL Editor
(Claude no tiene acceso directo — hay que darle el SQL a Juan).

**Pendiente a septiembre 2026:** confirmar que Juan corrió
`supabase/migrate_v7_completado_al_exportar.sql` (agrega `exported_at` para
marcar "Completo" al exportar, e incluye el calendario de visitas completo).

## Reglas de la app

- Un local figura **Completo** cuando se toca "Exportar fotos y audios por
  equipo" después del inicio de su mes de visita planificado más reciente
  (`src/lib/visit-completion.ts`).
- Calendario de visitas (2 meses por local): `src/lib/real-locations.ts` y
  `supabase/schema.sql`, confirmado contra el Excel de Juan.
- Estilo: verde oscuro + rojo Disco (`src/app/globals.css`), logo del splash.

## Informes

Juan arma el informe mensual en Excel con la skill `mantenimiento-informes`
a partir del export de la app.
