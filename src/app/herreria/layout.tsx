import type { Metadata, Viewport } from "next";

// La app Herrería tiene su propio manifest (nombre, ícono, id y scope
// /herreria) para instalarse en el celular como OTRA app, separada de la de
// mantenimiento.
export const metadata: Metadata = {
  title: "Herrería · Creative",
  description: "Auditorías anuales de herrería en cubierta (sistemas anticaída).",
  manifest: "/herreria/manifest.webmanifest",
  icons: {
    icon: "/herreria/favicon-32.png",
    apple: "/herreria/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Herrería",
  },
};

export const viewport: Viewport = {
  themeColor: "#1c2a33",
  viewportFit: "cover",
};

export default function HerreriaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
