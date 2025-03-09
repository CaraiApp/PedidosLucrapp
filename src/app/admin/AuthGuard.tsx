'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loading from "@/components/ui/Loading";
import { useAdminAuth } from './auth';
import { supabase } from '@/lib/supabase';

// Componente de protección para rutas de administración
export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  // Función para verificar si es un superadmin
  const checkSuperAdmin = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const isSuperAdmin = data?.session?.user?.email === "luisocro@gmail.com";
      setIsSuperAdmin(isSuperAdmin);
      return isSuperAdmin;
    } catch (error) {
      console.error("Error verificando superadmin:", error);
      return false;
    }
  };

  // Efecto para verificar autenticación
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Primero verifica si hay una cookie o parámetro de emergencia
        const urlParams = new URLSearchParams(window.location.search);
        const adminKey = urlParams.get('adminKey');
        const hasEmergencyAccess = adminKey === 'luisAdmin2025';
        
        if (hasEmergencyAccess) {
          setIsVerified(true);
          setDebugInfo("Acceso de emergencia concedido");
          return;
        }
        
        // Verificar datos de autenticación en almacenamiento
        let authData: string | null = null;
        
        try {
          // Intentar obtener datos de todas las fuentes posibles
          if (typeof sessionStorage !== 'undefined') {
            authData = sessionStorage.getItem("adminAuth");
          }
          
          if (!authData && typeof localStorage !== 'undefined') {
            authData = localStorage.getItem("adminAuth");
          }
          
          if (!authData && typeof document !== 'undefined') {
            const cookieValue = document.cookie
              .split('; ')
              .find(row => row.startsWith('adminAuth='))
              ?.split('=')[1];
            
            if (cookieValue) {
              authData = decodeURIComponent(cookieValue);
            }
          }
          
          setDebugInfo(`Auth Data: ${authData ? "Exists" : "Missing"}, isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}`);
        } catch (e) {
          console.error("Error accediendo al almacenamiento:", e);
        }
        
        // Si ya está autenticado según el contexto, permitir acceso
        if (!isLoading && isAuthenticated) {
          setIsVerified(true);
          return;
        }
        
        // Si no está autenticado, verificar si es superadmin
        if (!isLoading && !isAuthenticated) {
          const superAdminResult = await checkSuperAdmin();
          
          if (superAdminResult) {
            setIsVerified(true);
            setDebugInfo(debugInfo + ", Superadmin detectado");
            return;
          }
          
          // Si no es superadmin y no está autenticado, redirigir
          router.replace('/admin');
          return;
        }
      } catch (error) {
        console.error("Error en AuthGuard:", error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
        // En caso de error, no mostrar contenido
        setIsVerified(false);
      }
    };

    verifyAccess();
  }, [isAuthenticated, isLoading, router, debugInfo]);

  // Mostrar pantalla de carga durante la verificación
  if (isLoading || (!isVerified && !isSuperAdmin)) {
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

  // Si no está autenticado y la verificación ha terminado, mostrar mensaje de acceso denegado
  if (!isAuthenticated && !isSuperAdmin && !isVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-center text-xl font-semibold text-red-600">Acceso Denegado</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            No tiene permisos para acceder a esta sección.
          </p>
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => router.replace('/admin')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Volver a inicio
            </button>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs whitespace-pre-wrap overflow-auto">
              {debugInfo}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Solo mostrar los hijos si está autenticado o es superadmin
  return isVerified || isSuperAdmin ? <>{children}</> : null;
}

export default AdminAuthGuard;