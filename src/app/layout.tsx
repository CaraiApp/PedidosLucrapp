import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LucrApp - Gestión de Compras a Proveedores",
  description: "Plataforma para gestionar pedidos a proveedores de forma eficiente",
  manifest: '/manifest.json',
  icons: {
    apple: [
      { url: '/icons/icon-192x192.png' },
    ],
  },
};

// Configuración viewport para toda la aplicación excepto /admin
// que tiene su propia configuración
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-gray-100">
      <head>
        <meta name="application-name" content="LucrApp" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LucrApp" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} h-full`}>{children}</body>
    </html>
  );
}
