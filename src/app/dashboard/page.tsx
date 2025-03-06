// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AppLayout from "../components/AppLayout";

// Importamos componentes
import DashboardStats from "./components/DashboardStats";
import RecentLists from "./components/RecentLists";

interface User {
  id: string;
  email: string;
  username: string;
  membresia_activa?: {
    id: string;
    fecha_inicio: string;
    fecha_fin: string;
    estado: string;
    tipo_membresia: {
      id: string;
      nombre: string;
      precio: number;
      duracion_meses: number;
      limite_proveedores: number | null;
      limite_articulos: number | null;
      limite_listas: number | null;
      descripcion: string | null;
    };
  };
}

interface Stats {
  totalProveedores: number;
  totalArticulos: number;
  totalListas: number;
  membresia: {
    nombre: string;
    limiteProveedores: number | null;
    limiteArticulos: number | null;
    limiteListas: number | null;
    fechaFin: string;
  };
}

interface Lista {
  id: string;
  fecha_creacion: string;
  estado: string;
  numero_articulos: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalProveedores: 0,
    totalArticulos: 0,
    totalListas: 0,
    membresia: {
      nombre: "",
      limiteProveedores: null,
      limiteArticulos: null,
      limiteListas: null,
      fechaFin: "",
    },
  });
  const [listasRecientes, setListasRecientes] = useState<Lista[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select(
          `
          *,
          membresia_activa: membresias_usuarios!inner(
            *,
            tipo_membresia: membresia_tipos(*)
          )
        `
        )
        .eq("id", session.user.id)
        .single();

      if (userError || !userData) {
        console.error("Error al obtener datos del usuario:", userError);
        return;
      }

      setUser(userData as User);

      // Obtener estadísticas del usuario
      await loadStats(session.user.id);
      await loadRecentLists(session.user.id);

      setLoading(false);
    };

    checkUser();
  }, [router]);

  const loadStats = async (userId: string) => {
    try {
      // Obtener total de proveedores
      const { count: totalProveedores } = await supabase
        .from("proveedores")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", userId);

      // Obtener total de artículos
      const { count: totalArticulos } = await supabase
        .from("articulos")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", userId);

      // Obtener total de listas
      const { count: totalListas } = await supabase
        .from("listas_compra")
        .select("*", { count: "exact", head: true })
        .eq("usuario_id", userId);

      // Obtener detalles de membresía
      const { data: membresia } = await supabase
        .from("membresias_usuarios")
        .select(
          `
          *,
          tipo_membresia: membresia_tipos(*)
        `
        )
        .eq("usuario_id", userId)
        .eq("estado", "activa")
        .single();

      setStats({
        totalProveedores: totalProveedores || 0,
        totalArticulos: totalArticulos || 0,
        totalListas: totalListas || 0,
        membresia: {
          nombre: membresia?.tipo_membresia?.nombre || "No disponible",
          limiteProveedores:
            membresia?.tipo_membresia?.limite_proveedores || null,
          limiteArticulos: membresia?.tipo_membresia?.limite_articulos || null,
          limiteListas: membresia?.tipo_membresia?.limite_listas || null,
          fechaFin: membresia?.fecha_fin || "No disponible",
        },
      });
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const loadRecentLists = async (userId: string) => {
    try {
      interface ListaResponse {
        id: string;
        fecha_creacion: string;
        estado: string;
        articulos_lista: { count: number }[];
      }

      // Obtener listas recientes
      const { data, error } = await supabase
        .from("listas_compra")
        .select(
          `
          id,
          fecha_creacion,
          estado,
          articulos_lista(count)
        `
        )
        .eq("usuario_id", userId)
        .order("fecha_creacion", { ascending: false })
        .limit(5);

      if (error) throw error;

      // Transformar los datos para el componente
      const listasFormateadas = (data as ListaResponse[]).map((lista) => ({
        id: lista.id,
        fecha_creacion: lista.fecha_creacion,
        estado: lista.estado,
        numero_articulos:
          lista.articulos_lista.length > 0
            ? lista.articulos_lista[0]?.count
            : 0,
      }));

      setListasRecientes(listasFormateadas);
    } catch (error) {
      console.error("Error al cargar listas recientes:", error);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">
              Dashboard
            </h1>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            {/* Dashboard Stats */}
            <div className="px-4 py-8 sm:px-0">
              <DashboardStats stats={stats} />
            </div>

            {/* Recent Lists */}
            <div className="px-4 py-8 sm:px-0">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Listas recientes
              </h2>
              <RecentLists listas={listasRecientes} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-8 sm:px-0">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Acciones rápidas
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-white"
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
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href="/listas/nueva" className="focus:outline-none">
                      <span
                        className="absolute inset-0"
                        aria-hidden="true"
                      ></span>
                      <p className="text-sm font-medium text-gray-900">
                        Nueva lista de compra
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        Crea una nueva lista para realizar pedidos
                      </p>
                    </Link>
                  </div>
                </div>

                <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-white"
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
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href="/proveedores/nuevo"
                      className="focus:outline-none"
                    >
                      <span
                        className="absolute inset-0"
                        aria-hidden="true"
                      ></span>
                      <p className="text-sm font-medium text-gray-900">
                        Nuevo proveedor
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        Añade un nuevo proveedor a tu catálogo
                      </p>
                    </Link>
                  </div>
                </div>

                <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg
                        className="h-6 w-6 text-white"
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
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href="/articulos/nuevo"
                      className="focus:outline-none"
                    >
                      <span
                        className="absolute inset-0"
                        aria-hidden="true"
                      ></span>
                      <p className="text-sm font-medium text-gray-900">
                        Nuevo artículo
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        Añade un nuevo artículo a tu catálogo
                      </p>
                    </Link>
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
