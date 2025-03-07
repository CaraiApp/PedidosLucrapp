// src/app/articulos/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../components/AppLayout";

interface Articulo {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  unidad_id?: string;
  unidad?: {
    id: string;
    nombre: string;
    abreviatura?: string;
  };
  sku?: string;
  stock_actual?: number;
  stock_minimo?: number;
  created_at: string;
  usuario_id: string;
  proveedor?: {
    id: string;
    nombre: string;
  };
}

export default function DetalleArticuloPage() {
  const router = useRouter();
  const params = useParams();
  const articuloId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
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

        // Cargar datos del artículo
        const { data: articuloData, error: articuloError } = await supabase
          .from("articulos")
          .select(`
            *,
            proveedor:proveedor_id(
              id,
              nombre
            ),
            unidad:unidad_id(
              id,
              nombre,
              abreviatura
            )
          `)
          .eq("id", articuloId)
          .eq("usuario_id", sessionData.session.user.id)
          .single();

        if (articuloError) throw articuloError;

        // Si no se encontró el artículo, redirigir a la lista
        if (!articuloData) {
          router.push("/articulos");
          return;
        }

        setArticulo(articuloData);
      } catch (err: unknown) {
        console.error("Error al cargar datos:", err instanceof Error ? err.message : String(err));
        setError(
          "No se pudieron cargar los datos. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    if (articuloId) {
      cargarDatos();
    }
  }, [articuloId, router]);

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
        ) : !articulo ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontró el artículo o no tienes permiso para verlo.
            </p>
            <Link
              href="/articulos"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
            >
              Volver a la lista de artículos
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">{articulo.nombre}</h1>

              <div className="flex space-x-2 mt-4 sm:mt-0">
                <Link
                  href="/articulos"
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Volver
                </Link>
                <Link
                  href={`/articulos/editar/${articulo.id}`}
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

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">
                  Información del Artículo
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {articulo.proveedor && (
                    <div>
                      <p className="text-sm text-gray-500">Proveedor</p>
                      <p className="font-medium">
                        <Link
                          href={`/proveedores/${articulo.proveedor.id}`}
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {articulo.proveedor.nombre}
                        </Link>
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500">Precio</p>
                    <p className="font-medium">{formatearPrecio(articulo.precio)}</p>
                  </div>

                  {articulo.unidad && (
                    <div>
                      <p className="text-sm text-gray-500">Unidad</p>
                      <p className="font-medium">
                        {articulo.unidad.nombre}
                        {articulo.unidad.abreviatura && ` (${articulo.unidad.abreviatura})`}
                      </p>
                    </div>
                  )}

                  {articulo.sku && (
                    <div>
                      <p className="text-sm text-gray-500">Código/Referencia</p>
                      <p className="font-medium">{articulo.sku}</p>
                    </div>
                  )}

                  {/* Campos de stock ocultos */}

                  <div>
                    <p className="text-sm text-gray-500">Fecha de Alta</p>
                    <p className="font-medium">
                      {formatearFecha(articulo.created_at)}
                    </p>
                  </div>
                </div>

                {articulo.descripcion && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-2">Descripción</p>
                    <p className="whitespace-pre-line">{articulo.descripcion}</p>
                  </div>
                )}

                {/* Indicador de stock oculto */}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}