"use client";

import React from 'react';
import Loading from "@/components/ui/Loading";
import { useAdminAuth } from './middleware';

// Componente de protección para rutas de administración
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isVerifying } = useAdminAuth();

  if (isVerifying) {
    return <Loading text="Verificando acceso..." fullScreen />;
  }

  return <>{children}</>;
}

export default AdminAuthGuard;