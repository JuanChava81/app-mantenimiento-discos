import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Control de mantenimiento · Disco / Devoto",
  description: "App de control mensual de mantenimiento de locales Disco / Devoto.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mantenimiento",
  },
};

export const viewport: Viewport = {
  themeColor: "#4a0a0d",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
