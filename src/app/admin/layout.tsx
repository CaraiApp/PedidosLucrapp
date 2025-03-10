'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SUPER_ADMIN_EMAIL, decryptAdminData } from '@/lib/admin/auth';
import { AdminAuthProvider } from './auth';

// Completamente client-side, sin SSR
export const dynamic = 'force-dynamic';

// Componente interno de verificación de seguridad
function SecurityGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Verificación de seguridad al cargar el componente
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        // Si estamos en la página principal de admin, no necesitamos verificar
        if (currentPath === '/admin' || currentPath === '/admin/') {
          setIsVerifying(false);
          setIsAuthorized(true);
          return;
        }
        
        // Verificación 1: Superadmin por sesión de Supabase
        try {
          const { data } = await supabase.auth.getSession();
          const userEmail = data?.session?.user?.email;
          
          if (userEmail === SUPER_ADMIN_EMAIL) {
            console.log('Acceso verificado: Superadmin por sesión');
            setIsAuthorized(true);
            setIsVerifying(false);
            return;
          }
        } catch (sessionError) {
          console.error('Error verificando sesión:', sessionError);
        }
        
        // Verificación 2: Cookie de token admin
        try {
          const cookies = document.cookie.split('; ');
          const adminTokenCookie = cookies.find(row => row.startsWith('adminToken='));
          
          if (adminTokenCookie) {
            const adminToken = adminTokenCookie.split('=')[1];
            const adminData = decryptAdminData(adminToken);
            
            if (adminData && adminData.isAuthenticated && 
                adminData.email === SUPER_ADMIN_EMAIL &&
                Date.now() < adminData.expiresAt) {
              console.log('Acceso verificado: Token admin válido');
              setIsAuthorized(true);
              setIsVerifying(false);
              return;
            }
          }
        } catch (tokenError) {
          console.error('Error verificando token admin:', tokenError);
        }
        
        // Verificación 3: Cookie de superadmin o emergencia
        const hasSuperAccess = document.cookie.includes('adminSuperAccess=true');
        const hasEmergencyAccess = document.cookie.includes('adminEmergency=luis-2025-emergency');
        
        if (hasSuperAccess || hasEmergencyAccess) {
          console.log('Acceso verificado: Cookie especial');
          setIsAuthorized(true);
          setIsVerifying(false);
          return;
        }
        
        // Si ninguna verificación pasa
        console.error('Acceso denegado: No se encontró autorización válida');
        setIsAuthorized(false);
        setIsVerifying(false);
        
        // Redireccionar al login de admin
        router.replace('/admin');
      } catch (error) {
        console.error('Error crítico en verificación de seguridad:', error);
        setIsAuthorized(false);
        setIsVerifying(false);
        router.replace('/admin');
      }
    };
    
    verifyAccess();
  }, [router, currentPath]);
  
  // Mientras verifica, mostrar loading
  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <h2 className="mt-4 text-xl font-medium text-gray-900">Verificando acceso...</h2>
            <p className="mt-2 text-sm text-gray-500">Por favor espere mientras verificamos sus credenciales</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Si no está autorizado pero ya terminó la verificación, forzar redirección
  if (!isAuthorized && !isVerifying && currentPath !== '/admin' && currentPath !== '/admin/') {
    // Capturar posible renderizado adicional antes de la redirección
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-red-500">
          <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="mt-4 text-xl font-bold text-red-700">Acceso Denegado</h2>
            <p className="mt-2 text-sm text-gray-600">No tiene permisos para acceder a esta sección.</p>
            <button 
              onClick={() => router.replace('/admin')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Si está autorizado o está en la página principal, mostrar el contenido
  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <AdminAuthProvider>
        <SecurityGuard>
          {children}
        </SecurityGuard>
      </AdminAuthProvider>
    </div>
  );
}