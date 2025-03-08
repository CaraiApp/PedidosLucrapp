// src/app/articulos/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../components/AppLayout";
import { verificarLimiteAlcanzado } from "@/lib/supabase";

interface Articulo {
  id: string;
  nombre: string;
  precio: number;
  unidad_id?: string;
  unidad?: {
    id: string;
    nombre: string;
    abreviatura?: string;
  };
  sku?: string;
  created_at: string;
  proveedor: {
    id: string;
    nombre: string;
  };
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export default function ArticulosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);

  useEffect(() => {
    const cargarArticulos = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Verificar si se ha alcanzado el límite de artículos
        const limiteExcedido = await verificarLimiteAlcanzado(
          "articulos",
          sessionData.session.user.id
        );

        setLimiteAlcanzado(limiteExcedido);

        // Cargar artículos con información del proveedor y unidad
        const { data, error } = await supabase
          .from("articulos")
          .select(
            `
            *,
            proveedor:proveedor_id(id, nombre),
            unidad:unidad_id(id, nombre, abreviatura)
          `
          )
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (error) throw error;

        setArticulos(data || []);
      } catch (err: unknown) {
        const error = err as SupabaseError;
        console.error("Error al cargar artículos:", error.message);
        setError(
          "No se pudieron cargar los artículos. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarArticulos();
  }, [router]);

  const handleEliminarArticulo = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar artículo
      const { error } = await supabase.from("articulos").delete().eq("id", id);

      if (error) throw error;

      // Actualizar la lista de artículos
      setArticulos(articulos.filter((a) => a.id !== id));

      setMensaje("Artículo eliminado correctamente");

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error al eliminar artículo:", error.message);
      setError(
        "No se pudo eliminar el artículo. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear precio
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(precio);
  };

  // Filtrar artículos
  const articulosFiltrados = articulos.filter(
    (articulo) =>
      articulo.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (articulo.sku &&
        articulo.sku.toLowerCase().includes(filtro.toLowerCase())) ||
      (articulo.proveedor &&
        articulo.proveedor.nombre.toLowerCase().includes(filtro.toLowerCase())) ||
      (articulo.unidad && 
        articulo.unidad.nombre.toLowerCase().includes(filtro.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Artículos</h1>

          <div className="mt-4 sm:mt-0 flex space-x-2">
            <Link
              href="/articulos/nuevo"
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                limiteAlcanzado ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                if (limiteAlcanzado) {
                  e.preventDefault();
                  alert(
                    "Has alcanzado el límite de artículos permitido en tu plan. Por favor, actualiza tu membresía para añadir más artículos."
                  );
                }
              }}
            >
              Nuevo Artículo
            </Link>
            
            <Link
              href="/articulos/escanear-factura"
              className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Escanear Factura
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
            Has alcanzado el límite de artículos permitido en tu plan.
            <Link href="/membresias" className="underline ml-1">
              Actualiza tu membresía
            </Link>{" "}
            para añadir más artículos.
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
              placeholder="Buscar artículos..."
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
        ) : articulos.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No tienes artículos registrados.
            </p>
            {!limiteAlcanzado && (
              <Link
                href="/articulos/nuevo"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Añade tu primer artículo
              </Link>
            )}
          </div>
        ) : articulosFiltrados.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontraron artículos que coincidan con tu búsqueda.
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
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU/Referencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unidad de Compra
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {articulosFiltrados.map((articulo) => (
                    <tr key={articulo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/articulos/${articulo.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          {articulo.nombre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {articulo.proveedor ? (
                          <Link
                            href={`/proveedores/${articulo.proveedor.id}`}
                            className="text-gray-900 hover:text-indigo-600"
                          >
                            {articulo.proveedor.nombre}
                          </Link>
                        ) : (
                          <span className="text-gray-500">No asignado</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {articulo.sku || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatearPrecio(articulo.precio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {articulo.unidad ? 
                          `${articulo.unidad.nombre}${articulo.unidad.abreviatura ? ` (${articulo.unidad.abreviatura})` : ''}` 
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/articulos/editar/${articulo.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleEliminarArticulo(articulo.id)}
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
