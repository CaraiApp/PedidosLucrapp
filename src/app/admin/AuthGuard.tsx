"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from "@/components/ui/Loading";
import { useAdminAuth } from './auth';

// Componente de protección para rutas de administración
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <Loading text="Verificando acceso..." fullScreen />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export default AdminAuthGuard;