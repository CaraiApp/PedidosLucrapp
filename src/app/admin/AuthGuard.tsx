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

  // Efecto para verificar autenticación - versión reforzada
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Verificar URL para saber si hay que forzar una redirección
        // Esto protege contra accesos directos a URLs internas
        const currentPath = window.location.pathname;
        // Si estamos en una ruta protegida pero no en la página principal de admin
        const isProtectedRoute = currentPath.startsWith('/admin/') || (currentPath !== '/admin' && currentPath !== '/admin');
        
        // Primero verifica si hay un parámetro de emergencia
        const urlParams = new URLSearchParams(window.location.search);
        const adminKey = urlParams.get('adminKey');
        const hasEmergencyAccess = adminKey === 'luisAdmin2025';
        
        if (hasEmergencyAccess) {
          setIsVerified(true);
          setDebugInfo("Acceso de emergencia concedido");
          
          // Establecer cookie de emergencia para futuras verificaciones
          document.cookie = "adminEmergencyAccess=granted; path=/admin; max-age=3600; secure; samesite=strict";
          
          // Almacenar en localStorage/sessionStorage
          try {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem("adminEmergencyAccess", "granted");
            }
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem("adminEmergencyAccess", "granted");
            }
          } catch (e) {
            console.error("Error al guardar acceso de emergencia:", e);
          }
          return;
        }
        
        // Verificar cookie de emergencia
        const hasCookieEmergencyAccess = document.cookie
          .split('; ')
          .find(row => row.startsWith('adminEmergencyAccess=granted'));
        
        if (hasCookieEmergencyAccess) {
          setIsVerified(true);
          setDebugInfo("Acceso de emergencia por cookie");
          return;
        }
        
        // Verificar datos de autenticación en almacenamiento
        let hasValidAuth = false;
        let authSource = 'none';
        
        // 1. Verificar en todas las fuentes posibles
        try {
          // Verificar sessionStorage (principal)
          if (typeof sessionStorage !== 'undefined') {
            if (sessionStorage.getItem("adminAuth")) {
              hasValidAuth = true;
              authSource = 'sessionStorage';
            } else if (sessionStorage.getItem("adminAccess") === "granted") {
              hasValidAuth = true;
              authSource = 'sessionStorage/simple';
            }
          }
          
          // Verificar localStorage (respaldo)
          if (!hasValidAuth && typeof localStorage !== 'undefined') {
            if (localStorage.getItem("adminAuth")) {
              hasValidAuth = true;
              authSource = 'localStorage';
            } else if (localStorage.getItem("adminAccess") === "granted") {
              hasValidAuth = true;
              authSource = 'localStorage/simple';
            }
          }
          
          // Verificar cookies (último respaldo)
          if (!hasValidAuth && typeof document !== 'undefined') {
            const hasAuthCookie = document.cookie
              .split('; ')
              .find(row => row.startsWith('adminAuth='));
            
            if (hasAuthCookie) {
              hasValidAuth = true;
              authSource = 'cookie';
            }
            
            // También verificar cookie de superacceso
            const hasSuperAccess = document.cookie
              .split('; ')
              .find(row => row.startsWith('adminSuperAccess=granted'));
            
            if (hasSuperAccess) {
              hasValidAuth = true;
              authSource = 'cookie/super';
            }
          }
          
          setDebugInfo(`Auth check: ${hasValidAuth ? "Valid" : "Invalid"} (${authSource}), isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}, Protected: ${isProtectedRoute}`);
        } catch (e) {
          console.error("Error accediendo al almacenamiento:", e);
        }
        
        // Si ya está autenticado según el contexto, permitir acceso
        if (!isLoading && isAuthenticated) {
          setIsVerified(true);
          setDebugInfo(debugInfo + ", Autenticado por contexto");
          return;
        }
        
        // Si tiene alguna autenticación válida en almacenamiento
        if (hasValidAuth) {
          setIsVerified(true);
          setDebugInfo(debugInfo + `, Autenticado por ${authSource}`);
          return;
        }
        
        // Si no está autenticado, verificar si es superadmin
        const superAdminResult = await checkSuperAdmin();
        
        if (superAdminResult) {
          setIsVerified(true);
          setDebugInfo(debugInfo + ", Superadmin detectado");
          
          // Establecer cookie para futuras verificaciones
          document.cookie = "adminSuperAccess=granted; path=/admin; max-age=86400; secure; samesite=strict";
          return;
        }
        
        // Si llegamos aquí, no hay autenticación válida y no es superadmin
        console.error("No hay autenticación válida, redirigiendo al login");
        setIsVerified(false);
        
        // Aplicar redirección forzada
        if (isProtectedRoute) {
          router.replace('/admin');
        }
      } catch (error) {
        console.error("Error en AuthGuard:", error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
        // En caso de error, no mostrar contenido y redireccionar
        setIsVerified(false);
        router.replace('/admin');
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