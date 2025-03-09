// Layout para la sección de administración
'use client';

import { AdminAuthProvider } from "./auth";
import { AdminMiddleware } from "./middleware";

// Completamente client-side, sin SSR
export const dynamic = 'force-dynamic';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Envolver en un div para asegurar que no haya problemas de hidratación
  return (
    <div className="admin-layout">
      <AdminAuthProvider>
        {/* Middleware que protege todas las rutas de admin */}
        <AdminMiddleware />
        {children}
      </AdminAuthProvider>
    </div>
  );
}