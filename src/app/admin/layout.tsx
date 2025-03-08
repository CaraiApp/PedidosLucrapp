// Layout para la sección de administración
'use client';

import { AdminAuthProvider } from "./auth";

// Estos son los valores que se deben exportar para evitar problemas con Server Components
// pero eliminamos "viewport" ya que causa problemas con generateViewport
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
        {children}
      </AdminAuthProvider>
    </div>
  );
}