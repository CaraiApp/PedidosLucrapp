'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from "@/components/ui/Loading";
import { useAdminAuth } from './auth';
import { supabase } from '@/lib/supabase';

// Componente de protección para rutas de administración
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = React.useState<string>("");

  useEffect(() => {
    try {
      // Para depuración en producción
      const authData = sessionStorage?.getItem("adminAuth");
      setDebugInfo(`Auth Data: ${authData ? "Exists" : "Missing"}, isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
      
      if (!isLoading && !isAuthenticated) {
        // Comprobar si el email es de superadmin
        const checkSuperAdmin = async () => {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user?.email === "luisocro@gmail.com") {
            console.log("Superadmin detectado, permitiendo acceso");
            // No redirigir
            return;
          }
          router.push('/admin');
        };
        
        checkSuperAdmin();
      }
    } catch (error) {
      console.error("Error en AuthGuard:", error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <>
        <Loading text="Verificando acceso..." fullScreen />
        {process.env.NODE_ENV !== 'production' && (
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-2 text-xs">
            Debug: {debugInfo}
          </div>
        )}
      </>
    );
  }

  // Si es el email superadmin, permitir acceso independientemente de isAuthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-center text-xl font-semibold">Verificando credenciales</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Por favor espere mientras verificamos sus credenciales...
          </p>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs whitespace-pre-wrap overflow-auto">
              {debugInfo}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AdminAuthGuard;