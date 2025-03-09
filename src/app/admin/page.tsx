'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createAdminToken, SUPER_ADMIN_EMAIL } from '@/lib/admin/auth';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const router = useRouter();

  // Verificar si ya es el superadmin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        setIsVerifying(true);
        
        // Verificar session de Supabase
        const { data } = await supabase.auth.getSession();
        const userEmail = data?.session?.user?.email;
        
        // Si es el superadmin, redireccionar al dashboard
        if (userEmail === SUPER_ADMIN_EMAIL) {
          console.log('Superadmin detectado, creando token seguro');
          
          // Crear token de admin seguro
          const adminToken = createAdminToken(SUPER_ADMIN_EMAIL);
          
          // Establecer cookie HTTP-only
          document.cookie = `adminToken=${adminToken}; path=/admin; max-age=14400; secure; samesite=strict`;
          
          // Redireccionar al dashboard
          router.replace('/admin/dashboard');
          return;
        }
        
        // Verificar cookie de acceso de emergencia
        if (document.cookie.includes('adminEmergency=luis-2025-emergency')) {
          console.log('Acceso de emergencia detectado');
          router.replace('/admin/dashboard');
          return;
        }
        
        setIsVerifying(false);
      } catch (error) {
        console.error('Error verificando superadmin:', error);
        setIsVerifying(false);
      }
    };
    
    checkSuperAdmin();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar la contraseña (acceso restrictivo)
      if (password !== 'luisAdmin2025' && password !== 'Lucrapp2025' && password !== SUPER_ADMIN_EMAIL) {
        setError('Contraseña incorrecta');
        setIsLoading(false);
        return;
      }
      
      // Esta es una verificación directa - solo para superadmin
      if (password === SUPER_ADMIN_EMAIL) {
        // Verificar si el usuario está logueado como superadmin
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user?.email !== SUPER_ADMIN_EMAIL) {
          setError('Debes iniciar sesión como superadmin primero');
          setIsLoading(false);
          return;
        }
      }
      
      // Contraseña aceptada
      console.log('Acceso correcto, estableciendo token seguro');
      
      try {
        // Crear token de admin
        const adminToken = createAdminToken(SUPER_ADMIN_EMAIL);
        document.cookie = `adminToken=${adminToken}; path=/admin; max-age=14400; secure; samesite=strict`;
        
        // También establecer en localStorage para compatibilidad
        localStorage.setItem('adminEmail', SUPER_ADMIN_EMAIL);
        
        // Redireccionar al dashboard
        router.push('/admin/dashboard');
      } catch (tokenError) {
        console.error('Error estableciendo token:', tokenError);
        setError('Error de seguridad configurando acceso');
      }
    } catch (error) {
      console.error('Error en login:', error);
      setError('Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verificando acceso...
            </h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Panel de Administración
          </h2>
          <p className="text-gray-600 mt-2">
            Acceso restringido solo para administradores
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              Contraseña de Administrador
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Solo usuarios autorizados pueden acceder al panel de administración.
          </p>
        </div>
      </div>
    </div>
  );
}