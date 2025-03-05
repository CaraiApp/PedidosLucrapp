import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LucrApp - Gestión de Compras a Proveedores",
  description:
    "Plataforma para gestionar pedidos a proveedores de forma eficiente",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full bg-gray-100">
      <body className={`${inter.className} h-full`}>{children}</body>
    </html>
  );
}
