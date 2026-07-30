# App de control de mantenimiento (Disco / Devoto)

App para el control mensual de mantenimiento de locales Disco/Devoto en
Uruguay. Reemplaza el flujo de fotos por WhatsApp por una carga directa desde
el celular.

## Estado actual

Etapa 1 de la construcción: esqueleto en Next.js con las 5 pantallas y datos
de ejemplo (sin base de datos todavía). El diseño y las especificaciones
completas están en [`design_handoff_app_mantenimiento/README.md`](design_handoff_app_mantenimiento/README.md).
Los próximos pasos están en [`design_handoff_app_mantenimiento/GUIA_PASO_A_PASO.md`](design_handoff_app_mantenimiento/GUIA_PASO_A_PASO.md).

## Desarrollo local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS.
