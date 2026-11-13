# Prompt para armar un sistema como el de HERRERÍA (WhatsApp + app) para otro trabajo

> Cómo usarlo: creá un repo nuevo y vacío en GitHub y abrí una sesión nueva de Claude
> Code sobre ese repo. Completá la PARTE A con los datos del trabajo nuevo (lo que no
> sepas, dejalo en blanco: Claude te lo va a preguntar). Después copiá TODO desde la
> línea "--- COPIAR DESDE ACÁ ---" y pegalo como primer mensaje.

--- COPIAR DESDE ACÁ ---

Hola. Soy Juan, de Creative Engineering (Uruguay). No soy desarrollador: explicame todo
simple y en español, hacé vos los cambios, probalos antes de subir y decime exactamente qué
tengo que hacer yo, paso a paso. Cuando el paso sea en Meta, Vercel o Supabase, dame UN paso
por vez y esperá mi captura antes del siguiente.

Ya tengo funcionando con Claude un sistema para las auditorías de herrería en cubierta
(sistemas anticaída) de los supermercados Disco/Devoto: un WhatsApp donde los técnicos
mandan fotos + un audio por cada punto, una IA que redacta el texto del informe, y una app
para revisar, corregir y exportar. Quiero **el mismo sistema, de la misma forma**, para otro
trabajo. Abajo van los datos del trabajo nuevo (PARTE A) y cómo está hecho el de herrería
con todo lo que aprendimos (PARTE B). Usá la PARTE B como receta: copiá cómo funciona y
evitá los errores que ya resolvimos.

## PARTE A — El trabajo nuevo (completar)

- Nombre del trabajo / cliente: ______________________
  (ej. "Auditoría de extintores en locales de la cadena X")
- Qué se revisa en cada visita y qué es un "punto" (un elemento revisado con sus fotos):
  ______________________
- Lista de sitios: pegá una tabla o adjuntá un Excel/CSV con código, nombre, rótulo
  (cómo va en el informe), nombre de archivo del informe, dirección y mes de visita.
  ______________________
- Cada cuánto se audita cada sitio y cuándo arranca el ciclo (herrería: anual, de mayo a
  abril): ______________________
- Cómo tiene que escribir la IA cada punto. Herrería usa dos textos:
  "descripción" (UNA oración: elemento + ubicación + estado) y "recomendación" (UNA
  oración que empieza con un verbo en infinitivo; vacía si está bien). ¿Igual o distinto?
  Pegá 5 ejemplos reales de cómo se escriben en tus informes: ______________________
- Cómo es el informe final (adjuntá uno viejo si hay) y con qué lo armo (herrería: skill de
  Claude Cowork que lee el ZIP que exporta la app): ______________________
- Cuántos técnicos van a mandar mensajes (número de prueba de Meta: máx. 5): ____
- Nombre de la app en el celular, color e ícono: ______________________

## PARTE B — Cómo está hecho el sistema de herrería (la receta)

### Las piezas
1. **Bot de WhatsApp**: Vercel serverless (Node ESM, función `api/webhook.js`) + WhatsApp
   Cloud API de Meta (número PROPIO para este trabajo) + @vercel/kv (Upstash Redis) para el
   estado de cada técnico + Supabase (tablas y bucket de archivos) + Groq: Whisper para
   transcribir audios y un modelo de texto para redactar descripción + recomendación.
2. **App web PWA** (Next.js en Vercel, se instala en el celular con ícono propio): plan del
   año, auditoría, punto y exportar.
3. **Supabase** plan gratis: tablas propias + un bucket para fotos y audios.
4. **Informe**: la app exporta un ZIP con formato fijo; con eso armo el informe final.

### Tablas (Supabase)
- `sitios`: id, cod (único, ej. 'DV23'), nombre (para la app y la lista de WhatsApp),
  rotulo (cómo va en el informe), archivo (cómo va en el nombre del informe), direccion,
  mes (mes de la auditoría), activo.
- `auditorias`: id, sitio_id, ciclo (ej. '2026-2027'), fecha, estado
  ('abierta' | 'cerrada' | 'exportada'), comentario_general, actividad_at (último mensaje),
  cerrada_at, exportada_at, archivos_borrados, created_at.
- `puntos`: id, auditoria_id (on delete cascade), orden (1, 2, 3…), fotos text[] (URLs del
  bucket), audios jsonb ([{url, durationSecs, recordedAt}]), transcripcion, descripcion,
  recomendacion, remitente (teléfono del técnico o 'app'), created_at, updated_at.
- Función `nuevo_punto(...)` que inserta con el orden siguiente SIN repetir números aunque
  dos técnicos manden a la vez (lock con `pg_advisory_xact_lock`).
- RLS con políticas públicas (la app usa la clave anon) y bucket público.

### Flujo del técnico en WhatsApp
1. **Cualquier mensaje sin auditoría abierta** → lista interactiva de WhatsApp con los sitios
   del mes que faltan (sin exportar en el ciclo), máx. 10 filas (títulos de 24 caracteres,
   descripciones de 72), + "Otro sitio" → escribe código o parte del nombre y se busca (si
   hay varios, otra lista para elegir). Una sola lista por ráfaga de mensajes. Un saludo
   suelto no se guarda; fotos/audios mandados antes de elegir el sitio NO se pierden: van al
   primer punto.
2. Al elegir el sitio: "🔩 Auditoría abierta: DV23 (Cnel. Mora) · 14/10/26. Mandá las fotos
   de cada punto y después el audio contando qué es y cómo está."
3. **Por cada punto**: fotos (se juntan en una "bolsa" por técnico en Redis) y después UN
   audio (o texto) → transcripción + IA → punto nuevo. Contesta
   "✅ Punto 4 · 3 fotos · <descripción>" y, si hay, "⚠️ Recomendación: …". Antes de armar el
   punto espera ~1,5 s por si la última foto todavía está entrando.
4. Un audio/texto **sin fotos nuevas** se suma al último punto del técnico (se rehace el
   texto); si todavía no tiene puntos, va al comentario general.
5. **Comandos** (mayúsculas/minúsculas y tildes dan igual):
   - `AYUDA` (también `CODIGOS`, `COMANDOS`): cómo se usa.
   - `GENERAL <texto>`: agrega al comentario general.
   - `BORRAR`: si hay fotos sin audio las descarta; si no, borra el último punto del técnico
     (y sus archivos).
   - `CORREGIR <texto>`: reemplaza el texto del último punto y lo vuelve a redactar.
   - `FIN` (también `FIN D25`, `FIN TODO`): cierra la parte del técnico; las fotos sueltas
     quedan como un punto sin texto. Cuando cierra el último (o con TODO), la auditoría queda
     cerrada y llega el resumen al número de aviso: "🔩 DV23 cerrada: 11 puntos, 3 con
     recomendación, 38 fotos."
6. **Varios técnicos**: si otro ya tiene abierta la auditoría del sitio, se suma a la misma.
7. **Una auditoría por sitio por ciclo**: si se cerró con FIN y se vuelve otro día, al elegir
   el sitio se retoma ("retomada · Ya tiene 3 puntos; lo que mandes sigue desde el 4"). Solo
   después de exportarla se crea otra.
8. Todo lo que manda el bot empieza con el mismo emoji (en herrería 🔩).
9. Mensajes que no son foto/audio/texto: los avisos internos de WhatsApp ("unsupported", al
   mandar varias fotos juntas), reacciones y stickers se ignoran en silencio; videos,
   ubicaciones o contactos avisan "no se guarda" como mucho una vez cada 10 minutos. Una
   foto mandada como archivo (document con mime image/*) cuenta como foto. Un código de otro
   sistema mandado por error (ej. de mantenimiento) avisa que va al otro WhatsApp.

### La IA
- Whisper (Groq) transcribe; el modelo de texto devuelve JSON
  `{"descripcion": "...", "recomendacion": "..."}` con temperatura baja.
- El prompt tiene: quién redacta y para qué informe; las reglas de cada campo; "no inventes
  elementos, medidas ni defectos que el técnico no dijo; mantené los nombres que usó";
  español de Uruguay sin adornos; y 5 ejemplos reales de cada campo (los de la PARTE A).
- El mismo prompt está en el bot y en la app (dos archivos): si se cambia uno, cambiar el otro.
- Siempre con respaldo: si Groq falla o tarda (timeout ~15 s), se guarda la transcripción
  como descripción y la recomendación vacía. Nunca se pierde lo que dijo el técnico.

### La app
- **Plan del año**: "Este mes" / "Todos", buscador, estado de cada sitio en el ciclo
  (pendiente / en curso / cerrada / exportada) y cuántos van hechos en el mes.
- **Auditoría**: fecha editable, comentario general, puntos con miniatura, descripción y
  recomendación; reordenar con ↑↓; "+ Agregar punto"; "Exportar ZIP para el informe";
  "Borrar auditoría" (con confirmación, para las de prueba).
- **Punto**: fotos de cámara o galería (comprimidas), grabadora de audio propia (sube al
  bucket y manda a transcribir/redactar a una ruta `/api/procesar` de la app, que necesita
  `GROQ_API_KEY` en Vercel), transcripción, descripción y recomendación editables,
  "Redactar de nuevo con IA" y borrar punto.
- Se re-sincroniza con Supabase cada 15 s y al volver a la pestaña, sin pisar lo que se está
  editando. PWA con manifest e íconos propios; el service worker cachea solo lo estático.

### El export (contrato con quien arma el informe — una vez definido, no se cambia)
`<PREFIJO>_<cod>_<AAAA-MM-DD>.zip` con:
- `datos.json`: `{version, sitio:{cod, nombre, rotulo, archivo}, fecha, ciclo,
  comentario_general, puntos:[{orden, descripcion, recomendacion, transcripcion, fotos:[…]}]}`
  con los puntos numerados 1..n por su posición (sin huecos).
- `datos.txt`: lo mismo legible, con la lista de recomendaciones al final.
- `fotos/P01_foto1.jpg`… (siempre JPG, convertidas en el navegador si hace falta).
- `audios/P01_audio1.<ext>` (opcional).
Al exportar, la auditoría queda "exportada" y sale de la lista del mes del WhatsApp.

### Tareas automáticas (un cron diario, en Vercel Hobby máx. una vez por día)
- Cerrar auditorías sin actividad hace más de 3 h (con el resumen al número de aviso).
- Borrar del bucket las fotos/audios de auditorías exportadas hace más de 30 días (los textos
  quedan; marcar `archivos_borrados`).
- Keepalive de Supabase (el plan gratis se pausa si no hay actividad).

### Reglas técnicas que aprendimos (NO repetir estos errores)
**Meta / WhatsApp**
- Número propio desde el principio: crear un **portfolio comercial nuevo** en Meta y la app
  adentro de ese portfolio. Si se crea en un portfolio que ya tiene otra app con número de
  prueba, Meta reusa el MISMO número y dos bots reciben los mismos mensajes.
- Número de prueba: máx. 5 destinatarios; cada uno se agrega en "Paso 1. Pruébalo →
  Destinatario → Administrar lista" con el código que le llega por WhatsApp. Si en WhatsApp
  sale "Invitar", abrir el chat con `https://wa.me/<número sin +>` o mandar el "Hello World"
  desde el panel (necesita "Generar token" temporal ahí, que no reemplaza al permanente).
- Token permanente: usuario del sistema en el portfolio nuevo (Admin), asignarle la app
  ("Administrar app") y la cuenta de WhatsApp (acceso total), generar token con caducidad
  **"Nunca"** y permisos `whatsapp_business_messaging` + `whatsapp_business_management`. Va
  directo a Vercel como variable Secret: NUNCA pegarlo en el chat ni subirlo al repo.
- Variables del bot: token, Phone Number ID, verify token (la palabra, no el nombre de la
  variable), número de aviso, versión de la API de Meta, modelos de Groq. Después de cambiar
  una variable en Vercel hay que hacer Redeploy.
- Webhook: página Webhooks de la app → producto "Whatsapp Business Account" → URL + verify
  token → "Verificar y guardar" → suscribir `messages`.
- **Si verifica pero no llegan los mensajes** (en Vercel → Logs solo hay GET, ningún POST):
  en el Explorador de la API Graph (abrirlo con el ID de la app nueva en la URL,
  `/tools/explorer/<APP_ID>/`), generar token con los dos permisos y hacer
  `POST <ID de la cuenta de WhatsApp Business>/subscribed_apps`. Verificar con GET que en la
  lista aparezca el id de la app NUEVA.
- WhatsApp reenvía mensajes: deduplicar por `message.id` en Redis (set nx, 24 h). Procesar
  TODOS los mensajes de cada llamada, en orden; si alguno falla, responder 500 para que
  WhatsApp reintente solo lo que falló.
- Vercel corta a los 60 s: límite de ~38 s por tanda de subidas y avisar lo que no se subió.
  Fotos a JPG 1600 px calidad ~72 (sharp).

**Supabase (plan gratis)**
- 1 GB de Storage (por eso la limpieza a los 30 días) y pausa por inactividad (keepalive).
- Máx. 1000 filas por consulta: paginar con `range` donde pueda haber más.
- Claude no tiene acceso directo: el SQL me lo das como archivo en `supabase/` para pegar en
  el SQL Editor, que se pueda correr más de una vez (`if not exists`, `drop policy if exists`,
  `on conflict`), con los sitios cargados adentro y un `select count(*)` al final para
  comprobar. Probalo en un Postgres local antes de dármelo.

**App (Next.js / Vercel)**
- Next.js puede tener cambios respecto a lo que conocés: leé `node_modules/next/dist/docs/`
  antes de escribir código de Next.
- Vercel → proyecto → Logs para ver errores. Variables Secret no se pueden ver después.

**Cómo trabajar conmigo**
- Antes de escribir código, mostrame un plan corto (qué archivos, qué tengo que hacer yo) y
  esperá mi OK. Si hay una decisión que es mía, preguntame con opciones.
- Probá todo antes de subir: lint y build de la app; para el bot, simulaciones en node con
  mocks de Redis, Supabase y WhatsApp (carpeta temporal fuera del repo) corriendo el webhook
  real con mensajes de prueba (fotos, audio, lista, comandos, dos técnicos, FIN, retomar,
  cron); para la app, un celular simulado con Playwright y una captura. Si algo falla, no lo
  subas.
- Mantené al día un `CONTEXTO.md` (todo para retomar en una sesión nueva: piezas, IDs no
  secretos, variables, cosas que vencen) y una guía corta para los técnicos en un .txt.
- Commits claros en español. Si te pido volver atrás, revertí sin reescribir la historia.

## Qué te pido ahora
1. Leé la PARTE A. Si falta algo importante, preguntame (de a pocas preguntas, con opciones).
2. Proponé el diseño adaptado: tablas, prompt de la IA, textos del bot, pantallas y formato
   del export. Esperá mi OK.
3. Armá todo en este orden, probando cada parte:
   a. SQL de Supabase con los sitios (te lo pego yo).
   b. App (PWA) y su publicación en Vercel.
   c. Bot de WhatsApp: código y simulaciones; después la configuración de Meta conmigo paso a
      paso (portfolio nuevo, app, número de prueba, destinatarios, usuario del sistema y
      token, variables en Vercel, webhook, `subscribed_apps`) y una prueba real de punta a
      punta (hola → sitio → fotos + audio → ver el punto en la app → FIN → exportar).
   d. Cron diario (cierre por inactividad, limpieza a los 30 días, keepalive).
   e. Guía para los técnicos (.txt) y CONTEXTO.md completo.
