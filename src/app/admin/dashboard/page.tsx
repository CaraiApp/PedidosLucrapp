// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalUsuarios: number;
  usuariosActivos: number;
  totalMembresias: number;
  ingresosMensuales: number;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsuarios: 0,
    usuariosActivos: 0,
    totalMembresias: 0,
    ingresosMensuales: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar acceso de admin al cargar el componente
    const verificarAcceso = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const hasAdminAccess = sessionStorage.getItem("adminAccess") === "granted";
        
        if (!session || !hasAdminAccess) {
          router.push("/admin");
          return;
        }
        
        cargarEstadisticas();
      } catch (err) {
        console.error("Error al verificar sesión:", err);
        router.push("/admin");
      }
    };
    
    verificarAcceso();
  }, [router]);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      
      // Obtener total de usuarios
      const { count: totalUsuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });
        
      if (usuariosError) throw usuariosError;
      
      // Obtener membresías activas
      const { count: membresiasActivas, error: membresiasError } = await supabase
        .from('membresias_usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activa');
        
      if (membresiasError) throw membresiasError;
      
      // Calcular ingresos (para demo, usamos un valor estimado)
      const ingresosMensuales = (membresiasActivas || 0) * 19.99;
      
      setStats({
        totalUsuarios: totalUsuarios || 0,
        usuariosActivos: totalUsuarios || 0, // Simplificación: asumimos que todos están activos
        totalMembresias: membresiasActivas || 0,
        ingresosMensuales
      });
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error al cargar estadísticas:", error.message);
      setError("No se pudieron cargar las estadísticas. Por favor, intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Formatear número como moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <>
          {/* Tarjetas de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Usuarios Totales</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalUsuarios}</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Usuarios Activos</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.usuariosActivos}</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Membresías Activas</h3>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalMembresias}</p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <h3 className="text-gray-500 text-sm font-medium">Ingresos Mensuales</h3>
              <p className="mt-1 text-3xl font-bold text-indigo-600">{formatCurrency(stats.ingresosMensuales)}</p>
            </div>
          </div>
          
          {/* Enlaces a secciones principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link 
              href="/admin/dashboard/usuarios" 
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestión de Usuarios</h3>
              <p className="text-gray-600">Administra los usuarios del sistema, verifica sus datos y gestiona sus permisos.</p>
            </Link>
            
            <Link 
              href="/admin/dashboard/membresias" 
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Planes de Membresía</h3>
              <p className="text-gray-600">Configura los diferentes planes de suscripción, precios y límites.</p>
            </Link>
            
            <Link 
              href="/admin/dashboard/reportes" 
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Reportes y Estadísticas</h3>
              <p className="text-gray-600">Consulta informes detallados sobre el uso de la plataforma y el rendimiento.</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}