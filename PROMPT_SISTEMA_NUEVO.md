# Prompt para armar el sistema completo (app + WhatsApp) para un trabajo nuevo

> Cómo usarlo: completá la PARTE A con los datos del trabajo nuevo (lo que no sepas,
> dejalo en blanco: Claude te lo va a preguntar). Después copiá TODO desde la línea
> "--- COPIAR DESDE ACÁ ---" y pegalo como primer mensaje en una sesión nueva de
> Claude Code, idealmente con un repo nuevo y vacío en GitHub ya creado.

--- COPIAR DESDE ACÁ ---

Hola. Soy Juan, de Creative Engineering (Uruguay). No soy desarrollador: explicame todo
simple y en español, hacé vos los cambios, probalos antes de subir y decime exactamente qué
tengo que hacer yo, paso a paso. Cuando el paso sea en Meta, Vercel o Supabase, dame UN paso
por vez y esperá mi captura antes del siguiente.

Ya armé con Claude un sistema igual para el mantenimiento de supermercados Disco/Devoto, y
funciona muy bien. Quiero el mismo sistema para otro trabajo. Abajo te paso los datos del
trabajo nuevo (PARTE A) y cómo está hecho el sistema que ya funciona, con todo lo que
aprendimos (PARTE B). Usá la PARTE B como receta: copiá las decisiones que funcionaron y
evitá los errores que ya resolvimos.

## PARTE A — El trabajo nuevo (completar)

- Nombre del trabajo / cliente: ______________________ (ej. "Mantenimiento de farmacias X")
- Qué se hace en cada visita: ______________________
- Lista de sitios: (pegá una tabla o adjuntá un Excel/CSV con: código, nombre, dirección,
  meses de visita) ______________________
- Cada cuánto se visita cada sitio (ej. 2 veces por año, mensual): __________
- Tipos de equipo / elementos que se revisan, y qué se chequea en cada uno
  (ej. "Aire acondicionado: filtro OK/No OK, desagüe OK/No OK"): ______________________
- Códigos cortos que van a mandar los técnicos por WhatsApp para cada equipo
  (ej. S = split, R = rooftop, GEN = generador) — si no sé, proponelos vos: __________
- ¿Es por equipos (como mantenimiento) o por "puntos" sin código (como herrería: fotos +
  audio = un punto)? __________
- Cómo es el informe final (adjuntar un informe viejo de ejemplo si hay): __________
- Cuántos técnicos van a mandar mensajes (Meta permite máx. 5 con número de prueba): ____
- A qué número llega el resumen cuando se cierra una visita: (me lo pedís cuando haga falta)
- Colores / logo de la app: __________

## PARTE B — Cómo está hecho el sistema que ya funciona (la receta)

### Las piezas
1. **Bot de WhatsApp** (repo propio, se sube directo a `main`): Vercel serverless (Node ESM,
   una función `api/webhook.js`) + WhatsApp Cloud API de Meta + @vercel/kv (Upstash Redis)
   para el estado de las visitas + Supabase (base de datos y archivos) + Groq (Whisper para
   transcribir audios y un modelo de texto para prolijar las observaciones).
2. **App web PWA** (otro repo): Next.js en Vercel, se instala en el celular como app. Lee y
   escribe Supabase. Se trabaja en una rama y se pasa a `main` con fast-forward para que
   Vercel publique.
3. **Supabase** plan gratis: tablas + Storage (buckets de fotos y audios).
4. **Informes**: la app exporta un ZIP (fotos/audios por equipo + texto) y un Excel; con eso
   armo el informe final en Claude Cowork (con una skill propia). El formato del export es un
   contrato con esa skill: una vez definido, no se cambia sin avisarme.

### Flujo del técnico en WhatsApp (modo "por equipos")
1. Manda el código del sitio (ej. `D24`). El bot contesta "🔓 Se abrió la visita de D24" y le
   muestra los comentarios guardados de la visita anterior de cada equipo.
2. Por cada equipo: manda las fotos y/o audios (o texto) y AL FINAL el código del equipo
   (ej. `R02`; sin número vale 01). El bot confirma "✅ R_02 cargado (N fotos · M audios)" y
   avisa si alguna foto no se pudo subir.
3. `FIN D24` cierra SU parte; cuando cierra el último técnico se cierra la visita y llega un
   resumen al número de aviso. `FIN D24 TODO` la cierra para todos. Si nadie la cierra, un
   cron la cierra por inactividad (3 h).
4. Comandos: `codigos` (lista de códigos), `BORRAR` (descarta lo mandado sin código),
   `BORRAR S07`, `CAMBIAR S10 S07` (pasa lo cargado de un equipo a otro, o los intercambia),
   `S07 FALLA` / `S07 OK` (estado a mano). Aceptar mayúsculas/minúsculas, con o sin tilde,
   con o sin espacio ("R 02", "r02"), y variantes ("Fin d25").
5. Equipo con material pasa a OK solo; si el audio (pasado por la IA) habla de una falla,
   queda No OK.

### Flujo alternativo "por puntos" (lo usamos para auditorías de herrería)
- Cualquier mensaje sin visita abierta → lista interactiva de WhatsApp con los sitios del mes
  (máx. 10 filas, títulos de 24 caracteres) + "Otro sitio" (busca por código o nombre).
- Fotos de un punto → después UN audio (o texto) contando qué es y cómo está → el bot arma el
  punto con IA (descripción + recomendación) y confirma "✅ Punto 4 · 3 fotos · …".
- Audio sin fotos nuevas se suma al último punto. Comandos: GENERAL, BORRAR, CORREGIR, FIN,
  FIN TODO, AYUDA (y "codigos"/"comandos" también muestran la ayuda).
- UNA auditoría por sitio por ciclo: si se cerró con FIN y se vuelve otro día, se retoma la
  misma (los puntos siguen numerándose); solo después de exportarla se crea otra.
- En la app se puede borrar una auditoría (para las de prueba).

### Reglas técnicas que aprendimos (NO repetir estos errores)
**WhatsApp / Meta**
- El número de prueba de Meta permite máx. 5 destinatarios y no deja cambiar la foto.
  Cada técnico se agrega en "Paso 1. Pruébalo → Destinatario → Administrar lista" y tiene
  que pasar el código que le llega por WhatsApp.
- Si el trabajo nuevo necesita su PROPIO número, crear un **portfolio comercial nuevo** en
  Meta y la app adentro de ese portfolio. Si la app se crea en el mismo portfolio, Meta
  reusa el mismo número de prueba y los dos bots reciben los mismos mensajes. Con el mismo
  número para dos sistemas (modo H/CM) funcionó, pero confundía: mejor números separados.
- Token permanente: usuario del sistema en el portfolio (Admin si deja, si no Empleado),
  asignarle la app ("Administrar app") y la cuenta de WhatsApp (acceso total), generar
  token con caducidad **"Nunca"** y permisos `whatsapp_business_messaging` +
  `whatsapp_business_management`. Va directo a Vercel como variable Secret: NUNCA pegarlo
  en el chat ni subirlo al repo.
- Webhook: verificación GET con `hub.verify_token` (la palabra que pongo en Vercel, no el
  nombre de la variable); suscribir el campo `messages`.
- **Si el webhook verifica pero no llegan mensajes** (en los Logs de Vercel solo aparecen GET
  y ningún POST): enganchar la cuenta de WhatsApp a la app con el Explorador de la API Graph,
  `POST <ID de la cuenta de WhatsApp Business>/subscribed_apps`, con la app NUEVA elegida y
  generando el token DESPUÉS de elegirla. Verificar con GET que aparezca el id de la app.
- Un número de prueba a veces sale como "Invitar" en WhatsApp: abrir el chat con
  `https://wa.me/<número sin +>` o mandar el mensaje "Hello World" desde el panel de Meta.
- WhatsApp puede reenviar el mismo mensaje: deduplicar por `message.id` en Redis (set nx).
- Procesar TODOS los mensajes de cada llamada, en orden; si alguno falla, responder 500
  para que WhatsApp reintente solo lo que falló.
- Al mandar varias fotos juntas WhatsApp manda además un mensaje de tipo "unsupported":
  ignorarlo en silencio (no contestar "solo se guardan fotos" en cada foto). Una foto
  mandada "como archivo" (document con mime image/*) cuenta como foto.
- Lo pendiente sin código se guarda en Redis POR SITIO Y POR TÉCNICO, así el código de un
  técnico no se lleva las fotos del otro. Lock por sitio para escribir la sesión, pero la
  subida a Supabase va FUERA del lock.
- Vercel corta la función a los 60 s: límite de 38 s por tanda de subidas y avisar lo que
  no se subió. Comprimir fotos (sharp, JPG 1600 px, calidad ~72).
- Versión de la API de Meta y modelos de Groq en variables (`..._GRAPH_VERSION`,
  `GROQ_WHISPER_MODEL`, `GROQ_CHAT_MODEL`) para cambiarlos sin tocar código.
- La IA siempre con respaldo: si Groq falla o tarda, se guarda la transcripción tal cual.

**Supabase (plan gratis)**
- Se pausa si no hay actividad: cron diario de keepalive.
- 1 GB de Storage: limpieza automática diaria (borrar fotos/audios de visitas ya exportadas
  pasado un tiempo, archivos huérfanos, nunca lo subido en las últimas 24 h).
- Supabase devuelve máx. 1000 filas por consulta: paginar con `range` cuando pueda haber más.
- Claude no tiene acceso directo: las migraciones me las das como archivo SQL en
  `supabase/` para pegar en el SQL Editor, que se pueda correr más de una vez sin romper
  nada (`if not exists`, `drop policy if exists`, `on conflict`). Probalo en un Postgres
  local antes de dármelo.
- RLS con políticas públicas (la app usa la clave anon).
- Visitas por período: al empezar el mes de la visita siguiente, archivar la visita en una
  tabla de historial y dejar el equipo limpio; los comentarios viejos se ven hasta que llega
  el primer comentario nuevo de la visita.

**App (Next.js / Vercel)**
- Next.js puede tener cambios respecto a lo que conocés: leé `node_modules/next/dist/docs/`
  antes de escribir código de Next.
- PWA con manifest e íconos propios; si hay dos apps en el mismo dominio, cada una con su
  manifest (`id`/`scope` distintos). El service worker cachea solo lo estático (JS/CSS/
  íconos), nunca el HTML ni los datos.
- La app se re-sincroniza con Supabase cada 15 s y al volver a la pestaña, sin pisar lo que
  se está editando.
- Un sitio figura "Completo" cuando se exporta después del inicio de su mes de visita.
- Vercel Hobby: crons como mucho una vez por día. Variables Secret no se pueden ver después
  de guardadas; después de cambiar una variable hay que hacer Redeploy.
- Para ver errores: Vercel → proyecto → Logs.

**Cómo trabajar conmigo**
- Antes de escribir código, mostrame un plan corto (qué archivos, qué reusás, qué tengo que
  hacer yo) y esperá mi OK. Si hay una decisión que es mía, preguntame con opciones.
- Probá todo antes de subir: lint y build de la app; para el bot, simulaciones en node con
  mocks de Redis, Supabase y WhatsApp (en una carpeta temporal, fuera del repo) corriendo el
  webhook real con mensajes de prueba; para pantallas, un celular simulado con Playwright y
  una captura. Si algo falla, no lo subas.
- Mantené al día un `CONTEXTO.md` en el repo de la app (todo lo necesario para retomar en una
  sesión nueva) y un `RESUMEN_PARA_COWORK.txt` (lo que necesita Cowork para los informes).
- Commits claros en español. Si te pido volver atrás, revertí sin reescribir la historia.
- Cosas que vencen: token de Meta (verificar "Nunca vence"), versión de la API de Meta
  (~2 años), modelos de Groq, pausa y espacio de Supabase. Anotalas en CONTEXTO.md.

## Qué te pido ahora
1. Leé la PARTE A. Si falta algo importante, preguntame (de a pocas preguntas, con opciones).
2. Proponé el diseño adaptado al trabajo nuevo: tablas de Supabase, categorías y checklist,
   códigos de WhatsApp, pantallas de la app y formato del export. Esperá mi OK.
3. Armá todo en este orden, probando cada parte:
   a. SQL de Supabase (te lo pego yo).
   b. App (PWA) y su publicación en Vercel.
   c. Bot de WhatsApp: código, después la configuración de Meta conmigo paso a paso
      (portfolio, app, número de prueba, destinatarios, usuario del sistema y token,
      variables en Vercel, webhook, `subscribed_apps`), y una prueba real de punta a punta.
   d. Crons (cierre por inactividad, keepalive, limpieza de Storage).
   e. Guía corta para los técnicos (cómo se usa el WhatsApp), en un .txt.
4. Al final, dejame CONTEXTO.md y RESUMEN_PARA_COWORK.txt completos.
