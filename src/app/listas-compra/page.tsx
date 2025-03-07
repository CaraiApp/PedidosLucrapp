"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { verificarLimiteAlcanzado } from "@/lib/supabase";
import AppLayout from "../components/AppLayout";
import { ListaCompra } from "@/types";

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export default function ListasCompraPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [listas, setListas] = useState<ListaCompra[]>([]);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);

  useEffect(() => {
    const cargarListas = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Verificar si se ha alcanzado el límite de listas
        const limiteExcedido = await verificarLimiteAlcanzado(
          "listas",
          sessionData.session.user.id
        );

        setLimiteAlcanzado(limiteExcedido);

        // Cargar listas de compra
        const { data, error } = await supabase
          .from("listas_compra")
          .select(`*`)
          .eq("usuario_id", sessionData.session.user.id)
          .order("fecha_creacion", { ascending: false });

        if (error) throw error;

        // Consulta adicional para contar los artículos de cada lista
        const listasConConteo = [];
        
        for (const lista of data || []) {
          // Contar artículos para cada lista
          const { count, error: countError } = await supabase
            .from("items_lista_compra")
            .select("*", { count: "exact", head: true })
            .eq("lista_id", lista.id);
            
          if (countError) {
            console.error("Error al contar artículos:", countError);
          }
          
          listasConConteo.push({
            ...lista,
            numero_articulos: count || 0
          });
        }

        setListas(listasConConteo);
      } catch (err: unknown) {
        const error = err as SupabaseError;
        console.error("Error al cargar listas:", error.message);
        setError(
          "No se pudieron cargar las listas de compra. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarListas();
  }, [router]);

  const handleCambiarEstado = async (id: string, nuevoEstado: ListaCompra['estado']) => {
    try {
      setLoading(true);

      // Actualizar estado de la lista
      const { error } = await supabase
        .from("listas_compra")
        .update({ estado: nuevoEstado })
        .eq("id", id);

      if (error) throw error;

      // Actualizar la lista en el estado
      setListas(listas.map(lista => 
        lista.id === id ? { ...lista, estado: nuevoEstado } : lista
      ));

      setMensaje(`Lista ${nuevoEstado === 'completada' ? 'marcada como completada' : 'actualizada'} correctamente`);

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error al actualizar la lista:", error.message);
      setError(
        "No se pudo actualizar la lista. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarLista = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar esta lista? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar lista
      const { error } = await supabase.from("listas_compra").delete().eq("id", id);

      if (error) throw error;

      // Actualizar la lista en el estado
      setListas(listas.filter((a) => a.id !== id));

      setMensaje("Lista eliminada correctamente");

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error al eliminar lista:", error.message);
      setError(
        "No se pudo eliminar la lista. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtrar listas
  const listasFiltradas = listas.filter(
    (lista) =>
      (lista.title?.toLowerCase().includes(filtro.toLowerCase()) ||
       lista.nombre_lista?.toLowerCase().includes(filtro.toLowerCase()) || 
       lista.nombre?.toLowerCase().includes(filtro.toLowerCase()) || 
       ''.includes(filtro.toLowerCase()))
  );

  // Función para formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Listas de Compra</h1>

          <div className="mt-4 sm:mt-0">
            <Link
              href="/listas-compra/nuevo"
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                limiteAlcanzado ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                if (limiteAlcanzado) {
                  e.preventDefault();
                  alert(
                    "Has alcanzado el límite de listas permitido en tu plan. Por favor, actualiza tu membresía para añadir más listas."
                  );
                }
              }}
            >
              Nueva Lista de Compra
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {mensaje}
          </div>
        )}

        {limiteAlcanzado && (
          <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Has alcanzado el límite de listas permitido en tu plan.
            <Link href="/membresias" className="underline ml-1">
              Actualiza tu membresía
            </Link>{" "}
            para añadir más listas.
          </div>
        )}

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                ></path>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar listas..."
              className="pl-10 p-2 border border-gray-300 rounded-md w-full sm:max-w-xs"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : listas.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No tienes listas de compra registradas.
            </p>
            {!limiteAlcanzado && (
              <Link
                href="/listas-compra/nuevo"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Añade tu primera lista de compra
              </Link>
            )}
          </div>
        ) : listasFiltradas.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontraron listas que coincidan con tu búsqueda.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Artículos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listasFiltradas.map((lista) => (
                    <tr key={lista.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/listas-compra/${lista.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {lista.title || lista.nombre_lista || lista.nombre || "Lista de compra"}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatearFecha(lista.fecha_creacion)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lista.numero_articulos}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/listas-compra/${lista.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/listas-compra/editar/${lista.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Editar
                        </Link>
                        
                        
                        <button
                          onClick={() => handleEliminarLista(lista.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}