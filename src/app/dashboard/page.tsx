"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// Importamos componentes que usaremos más adelante
import DashboardStats from "./components/DashboardStats";
import RecentLists from "./components/RecentLists";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProveedores: 0,
    totalArticulos: 0,
    totalListas: 0,
    membresia: {
      nombre: "",
      limiteProveedores: 0,
      limiteArticulos: 0,
      limiteListas: 0,
      fechaFin: "",
    },
  });

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

      setUser(userData);

      // Obtener estadísticas del usuario
      await loadStats(session.user.id);

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
          limiteProveedores: membresia?.tipo_membresia?.limite_proveedores || 0,
          limiteArticulos: membresia?.tipo_membresia?.limite_articulos || 0,
          limiteListas: membresia?.tipo_membresia?.limite_listas || 0,
          fechaFin: membresia?.fecha_fin || "No disponible",
        },
      });
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-indigo-600">
                  LucrApp
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/proveedores"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Proveedores
                </Link>
                <Link
                  href="/articulos"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Artículos
                </Link>
                <Link
                  href="/listas"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Listas de Compra
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="ml-3 relative">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-700 mr-2">
                    {user?.username || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-white p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="sr-only">Cerrar sesión</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                type="button"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-expanded="false"
              >
                <span className="sr-only">Abrir menú</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
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
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-4 md:p-6">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Proveedores */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
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
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Proveedores
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                {stats.totalProveedores} /{" "}
                                {stats.membresia.limiteProveedores || "∞"}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <Link
                          href="/proveedores"
                          className="font-medium text-indigo-600 hover:text-indigo-900"
                        >
                          Ver todos
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Artículos */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
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
                              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Artículos
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                {stats.totalArticulos} /{" "}
                                {stats.membresia.limiteArticulos || "∞"}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <Link
                          href="/articulos"
                          className="font-medium text-indigo-600 hover:text-indigo-900"
                        >
                          Ver todos
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Listas de Compra */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
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
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Listas de Compra
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                {stats.totalListas} /{" "}
                                {stats.membresia.limiteListas || "∞"}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <Link
                          href="/listas"
                          className="font-medium text-indigo-600 hover:text-indigo-900"
                        >
                          Ver todas
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Membresía */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
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
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-5 w-0 flex-1">
                          <dl>
                            <dt className="text-sm font-medium text-gray-500 truncate">
                              Plan Actual
                            </dt>
                            <dd>
                              <div className="text-lg font-medium text-gray-900">
                                {stats.membresia.nombre}
                              </div>
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                      <div className="text-sm">
                        <Link
                          href="/membresias"
                          className="font-medium text-indigo-600 hover:text-indigo-900"
                        >
                          Actualizar plan
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Lists */}
            <div className="px-4 py-8 sm:px-0">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Listas recientes
              </h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {/* Renderizaremos listas aquí más adelante */}
                  <li>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          No hay listas de compra recientes
                        </p>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          Crea tu primera lista para empezar a gestionar tus
                          compras
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
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
    </div>
  );
}
