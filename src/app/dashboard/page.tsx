// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppLayout from "../components/AppLayout";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Loading from "@/components/ui/Loading";
import MembershipStatus from "@/components/ui/MembershipStatus";

// Hooks y componentes
import { useAuth } from "@/hooks/useAuth";
import { useEstadisticas } from "@/hooks/useEstadisticas";
import DashboardStats from "@/app/dashboard/components/DashboardStats";
import RecentLists from "@/app/dashboard/components/RecentLists";
import { supabase } from "@/lib/supabase";
import { ListaCompra } from "@/types";
import { SUPER_ADMIN_EMAIL, createAdminToken } from "@/lib/admin/auth";
import { MembershipService } from "@/lib/membership-service";

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { loading: statsLoading } = useEstadisticas();
  
  const [loading, setLoading] = useState(true);
  const [listasRecientes, setListasRecientes] = useState<ListaCompra[]>([]);
  const [membership, setMembership] = useState<any>(null);

  useEffect(() => {
    // Si hay usuario, cargar las listas recientes y membresía
    if (user) {
      console.log("Usuario autenticado:", user.email);
      loadRecentLists(user.id);
      loadMembershipStatus(user.id);
    } else if (!authLoading) {
      // Si no hay usuario y ya terminó de cargar, establecer listasRecientes como vacío
      setLoading(false);
      setListasRecientes([]);
    }
  }, [authLoading, user, router]);
  
  // Cargar información de membresía
  const loadMembershipStatus = async (userId: string) => {
    try {
      const membershipData = await MembershipService.getActiveMembership(userId);
      console.log("Membresía cargada:", membershipData);
      setMembership(membershipData);
    } catch (err) {
      console.error("Error al cargar membresía:", err);
    }
  };

  const loadRecentLists = async (userId: string) => {
    try {
      setLoading(true);
      
      interface ListaResponse {
        id: string;
        nombre: string;
        fecha_creacion: string;
        estado: string;
        proveedor_id?: string;
        proveedor?: { nombre: string } | null;
        articulos_lista: { count: number }[];
      }

      // Verificar primero si la tabla 'listas_compra' existe
      try {
        const { data: tableExists, error: tableError } = await supabase
          .from('listas_compra')
          .select('id')
          .limit(1);
          
        if (tableError) {
          console.error('Error al verificar tabla de listas:', tableError);
          // Si la tabla no existe, devolver una lista vacía
          setListasRecientes([]);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error al verificar tabla de listas:', err);
        setListasRecientes([]);
        setLoading(false);
        return;
      }

      // Obtener listas recientes
      const { data, error } = await supabase
        .from("listas_compra")
        .select(`
          id,
          title,
          fecha_creacion,
          estado,
          proveedor_id,
          proveedor:proveedores(nombre)
        `)
        .eq("usuario_id", userId)
        .order("fecha_creacion", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error al obtener listas_compra:", error);
        throw new Error(`Error al obtener listas: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || data.length === 0) {
        setListasRecientes([]);
        setLoading(false);
        return;
      }

      // Transformar los datos para el componente
      const listasFormateadas = [];
      
      for (const lista of data) {
        // Comprobamos que todos los campos necesarios existan
        if (!lista || !lista.id) {
          console.error("Lista incompleta:", lista);
          continue;
        }
        
        // Contar artículos para cada lista
        const { count, error: countError } = await supabase
          .from("items_lista_compra")
          .select("*", { count: "exact", head: true })
          .eq("lista_id", lista.id);
          
        if (countError) {
          console.error("Error al contar artículos para lista:", lista.id, countError);
        }
        
        listasFormateadas.push({
          id: lista.id,
          usuario_id: userId,
          nombre: lista.title || "Sin nombre",
          fecha_creacion: lista.fecha_creacion || new Date().toISOString(),
          estado: (lista.estado || 'borrador') as 'borrador' | 'enviada' | 'completada' | 'cancelada',
          proveedor_id: lista.proveedor_id,
          proveedor: lista.proveedor && 
            typeof lista.proveedor === 'object' && 
            'nombre' in lista.proveedor && 
            lista.proveedor.nombre ? { 
              id: lista.proveedor_id || "", 
              nombre: lista.proveedor.nombre as string,
              usuario_id: userId,
              created_at: ""
            } : undefined,
          items: [],
          numero_articulos: count || 0
        });
      }

      setListasRecientes(listasFormateadas);
    } catch (error) {
      console.error("Error al cargar listas recientes:", error);
      // No mostrar error al usuario, simplemente dejamos la lista vacía
      setListasRecientes([]);
    } finally {
      setLoading(false);
    }
  };

  // Verificar si el usuario es superadmin
  const isSuperAdmin = user && user.email === SUPER_ADMIN_EMAIL;

  // Función para acceder al panel de administración
  const handleAdminAccess = () => {
    try {
      // Crear token seguro para admin
      const adminToken = createAdminToken(SUPER_ADMIN_EMAIL);
      
      // Establecer cookies seguras
      document.cookie = `adminToken=${adminToken}; path=/admin; max-age=14400; secure; samesite=strict`;
      document.cookie = `adminSuperAccess=true; path=/admin; max-age=3600; secure; samesite=strict`;
      
      // Redireccionar al panel de admin
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Error al acceder al panel de admin:', error);
      alert('Error al acceder al panel de administración');
    }
  };

  if (authLoading || statsLoading || loading) {
    return (
      <AppLayout>
        <Loading text="Cargando dashboard..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-4 sm:py-10">
        <header>
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-gray-900">
                Dashboard
              </h1>
              
              {/* Botón de acceso admin exclusivo para superadmin */}
              {isSuperAdmin && (
                <button
                  onClick={handleAdminAccess}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Panel Admin
                </button>
              )}
            </div>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {/* Membership Status Warning (if needed) */}
            <MembershipStatus 
              membership={membership} 
              isAdmin={user && user.email === SUPER_ADMIN_EMAIL}
            />
            
            {/* Dashboard Stats */}
            <div className="px-2 sm:px-4 py-6 sm:py-8 sm:px-0">
              <DashboardStats />
            </div>

            {/* Recent Lists */}
            <div className="px-2 sm:px-4 py-6 sm:py-8 sm:px-0">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Listas recientes
                </h2>
                <Button href="/listas-compra" variant="outline" size="sm">
                  Ver todas
                </Button>
              </div>
              <RecentLists listas={listasRecientes} />
            </div>

            {/* Quick Actions */}
            <div className="px-2 sm:px-4 py-6 sm:py-8 sm:px-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
                Acciones rápidas
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card.Resource
                  title="Nueva lista de compra"
                  subtitle="Crea una nueva lista para realizar pedidos"
                  icon={
                    <svg
                      className="h-6 w-6 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  }
                  onClick={() => router.push("/listas-compra/nuevo")}
                />

                <Card.Resource
                  title="Nuevo proveedor"
                  subtitle="Añade un nuevo proveedor a tu catálogo"
                  icon={
                    <svg
                      className="h-6 w-6 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                      />
                    </svg>
                  }
                  onClick={() => router.push("/proveedores/nuevo")}
                />

                <Card.Resource
                  title="Nuevo artículo"
                  subtitle="Añade un nuevo artículo a tu catálogo"
                  icon={
                    <svg
                      className="h-6 w-6 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                      />
                    </svg>
                  }
                  onClick={() => router.push("/articulos/nuevo")}
                />
              </div>
            </div>
            
            {/* App Installation Guide */}
            <div className="mt-8 px-2 sm:px-4 py-6 sm:py-8 sm:px-0">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-indigo-800 mb-2">¡Instala LucrApp en tu dispositivo!</h3>
                <p className="text-sm text-indigo-700 mb-4">
                  Para una mejor experiencia, instala nuestra app en tu dispositivo móvil. 
                  Te permitirá acceder rápidamente y trabajar sin conexión.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 border border-indigo-200 rounded-md p-3 bg-white">
                    <h4 className="font-medium text-indigo-800 mb-1">En iPhone/iPad</h4>
                    <p className="text-xs text-gray-600">
                      Pulsa en el botón "Compartir" y luego en "Añadir a pantalla de inicio"
                    </p>
                  </div>
                  <div className="flex-1 border border-indigo-200 rounded-md p-3 bg-white">
                    <h4 className="font-medium text-indigo-800 mb-1">En Android</h4>
                    <p className="text-xs text-gray-600">
                      Pulsa en el menú (⋮) de Chrome y selecciona "Añadir a pantalla de inicio"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
