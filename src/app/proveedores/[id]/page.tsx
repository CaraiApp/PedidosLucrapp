// src/app/proveedores/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../components/AppLayout";

interface Proveedor {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  contacto?: string;
  direccion?: string;
  notas?: string;
  created_at: string;
  usuario_id: string;
}

interface Articulo {
  id: string;
  nombre: string;
  precio: number;
  unidad?: string;
  referencia?: string;
  created_at: string;
}

export default function DetalleProveedorPage() {
  const router = useRouter();
  const params = useParams();
  const proveedorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Cargar datos del proveedor
        const { data: proveedorData, error: proveedorError } = await supabase
          .from("proveedores")
          .select("*")
          .eq("id", proveedorId)
          .eq("usuario_id", sessionData.session.user.id)
          .single();

        if (proveedorError) throw proveedorError;

        // Si no se encontró el proveedor, redirigir a la lista
        if (!proveedorData) {
          router.push("/proveedores");
          return;
        }

        setProveedor(proveedorData);

        // Cargar artículos del proveedor
        const { data: articulosData, error: articulosError } = await supabase
          .from("articulos")
          .select("*")
          .eq("proveedor_id", proveedorId)
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (articulosError) throw articulosError;

        setArticulos(articulosData || []);
      } catch (err: any) {
        console.error("Error al cargar datos:", err.message);
        setError(
          "No se pudieron cargar los datos. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    if (proveedorId) {
      cargarDatos();
    }
  }, [proveedorId, router]);

  // Función para formatear fecha
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Función para formatear precio
  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(precio);
  };

  return (
    <AppLayout>
      <div className="py-8">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : !proveedor ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontró el proveedor o no tienes permiso para verlo.
            </p>
            <Link
              href="/proveedores"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
            >
              Volver a la lista de proveedores
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{proveedor.nombre}</h1>

              <div className="flex space-x-2 mt-4 sm:mt-0">
                <Link
                  href="/proveedores"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Volver
                </Link>
                <Link
                  href={`/proveedores/editar/${proveedor.id}`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Editar
                </Link>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Información del Proveedor
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {proveedor.contacto && (
                    <div>
                      <p className="text-sm text-gray-500">
                        Persona de Contacto
                      </p>
                      <p className="font-medium">{proveedor.contacto}</p>
                    </div>
                  )}

                  {proveedor.email && (
                    <div>
                      <p className="text-sm text-gray-500">
                        Correo Electrónico
                      </p>
                      <p className="font-medium">
                        <a
                          href={`mailto:${proveedor.email}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {proveedor.email}
                        </a>
                      </p>
                    </div>
                  )}

                  {proveedor.telefono && (
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="font-medium">
                        <a
                          href={`tel:${proveedor.telefono}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {proveedor.telefono}
                        </a>
                      </p>
                    </div>
                  )}

                  {proveedor.direccion && (
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-sm text-gray-500">Dirección</p>
                      <p className="font-medium">{proveedor.direccion}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500">Fecha de Alta</p>
                    <p className="font-medium">
                      {formatearFecha(proveedor.created_at)}
                    </p>
                  </div>
                </div>

                {proveedor.notas && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-2">Notas</p>
                    <p className="whitespace-pre-line">{proveedor.notas}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Catálogo de artículos */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    Catálogo de Artículos
                  </h2>

                  <Link
                    href={`/articulos/nuevo?proveedor=${proveedor.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                  >
                    Añadir Artículo
                  </Link>
                </div>

                {articulos.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">
                      No hay artículos registrados para este proveedor.
                    </p>
                    <Link
                      href={`/articulos/nuevo?proveedor=${proveedor.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Añadir el primer artículo
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nombre
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Referencia
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unidad
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {articulos.map((articulo) => (
                          <tr key={articulo.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Link
                                href={`/articulos/${articulo.id}`}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                {articulo.nombre}
                              </Link>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {articulo.referencia || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatearPrecio(articulo.precio)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {articulo.unidad || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Link
                                href={`/articulos/editar/${articulo.id}`}
                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                              >
                                Editar
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
