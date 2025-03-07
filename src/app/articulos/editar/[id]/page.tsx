// src/app/articulos/editar/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../../components/AppLayout";
import { Unidad } from "@/types";

interface Proveedor {
  id: string;
  nombre: string;
}

interface Articulo {
  id: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  unidad_id?: string;
  sku?: string;
  stock_actual?: number;
  stock_minimo?: number;
  proveedor_id?: string;
  usuario_id: string;
  created_at: string;
}

export default function EditarArticuloPage() {
  const router = useRouter();
  const params = useParams();
  const articuloId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [articulo, setArticulo] = useState<Articulo | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    proveedor_id: "",
    precio: "",
    unidad_id: "",
    sku: "",
    stock_actual: "0",
    stock_minimo: "0",
  });
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

        // Cargar el artículo
        const { data: articuloData, error: articuloError } = await supabase
          .from("articulos")
          .select("*")
          .eq("id", articuloId)
          .eq("usuario_id", sessionData.session.user.id)
          .single();

        if (articuloError) throw articuloError;

        if (!articuloData) {
          router.push("/articulos");
          return;
        }

        setArticulo(articuloData);

        // Inicializar el formulario con los datos del artículo
        setFormData({
          nombre: articuloData.nombre || "",
          descripcion: articuloData.descripcion || "",
          proveedor_id: articuloData.proveedor_id || "",
          precio: articuloData.precio?.toString() || "0",
          unidad_id: articuloData.unidad_id || "",
          sku: articuloData.sku || "",
          stock_actual: articuloData.stock_actual?.toString() || "0",
          stock_minimo: articuloData.stock_minimo?.toString() || "0",
        });

        // Cargar proveedores y unidades en paralelo
        const [proveedoresResponse, unidadesResponse] = await Promise.all([
          supabase
            .from("proveedores")
            .select("id, nombre")
            .eq("usuario_id", sessionData.session.user.id)
            .order("nombre"),
          
          supabase
            .from("unidades")
            .select("id, nombre, abreviatura")
            .order("nombre")
        ]);

        if (proveedoresResponse.error) throw proveedoresResponse.error;
        if (unidadesResponse.error) throw unidadesResponse.error;

        setProveedores(proveedoresResponse.data || []);
        setUnidades(unidadesResponse.data || []);
      } catch (err: any) {
        console.error("Error al cargar datos:", err.message);
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

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      setError("El nombre del artículo es obligatorio");
      return;
    }

    if (!formData.proveedor_id) {
      setError("Debes seleccionar un proveedor");
      return;
    }

    try {
      setGuardando(true);
      setError(null);

      // Verificar sesión
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      // Actualizar artículo
      const precio = parseFloat(formData.precio) || 0;
      const stockActual = parseInt(formData.stock_actual) || 0;
      const stockMinimo = parseInt(formData.stock_minimo) || 0;

      const { error: updateError } = await supabase
        .from("articulos")
        .update({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
          proveedor_id: formData.proveedor_id || null,
          precio: precio,
          unidad_id: formData.unidad_id || null, // Cambiado a unidad_id
          sku: formData.sku.trim() || null,
          stock_actual: stockActual,
          stock_minimo: stockMinimo,
        })
        .eq("id", articuloId)
        .eq("usuario_id", sessionData.session.user.id);

      if (updateError) throw updateError;

      // Redireccionar a la lista de artículos
      router.push("/articulos");
    } catch (err: any) {
      console.error("Error al actualizar artículo:", err.message);
      setError(
        "No se pudo actualizar el artículo. Por favor, intenta nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Editar Artículo</h1>

          <Link
            href="/articulos"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : !articulo ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontró el artículo o no tienes permiso para editarlo.
            </p>
            <Link
              href="/articulos"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
            >
              Volver a la lista de artículos
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label
                    htmlFor="nombre"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nombre del Artículo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label
                    htmlFor="proveedor_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Proveedor <span className="text-red-500">*</span>
                  </label>
                  {proveedores.length === 0 ? (
                    <div className="text-gray-500 mb-2">
                      No tienes proveedores registrados.{" "}
                      <Link
                        href="/proveedores/nuevo"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Crear un proveedor
                      </Link>
                    </div>
                  ) : (
                    <select
                      id="proveedor_id"
                      name="proveedor_id"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.proveedor_id}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Seleccionar proveedor</option>
                      {proveedores.map((proveedor) => (
                        <option key={proveedor.id} value={proveedor.id}>
                          {proveedor.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="precio"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Precio
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">€</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      id="precio"
                      name="precio"
                      className="pl-7 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={formData.precio}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="unidad_id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Unidad de Compra
                  </label>
                  <select
                    id="unidad_id"
                    name="unidad_id"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.unidad_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Seleccionar unidad</option>
                    {unidades.map((unidad) => (
                      <option key={unidad.id} value={unidad.id}>
                        {unidad.nombre} {unidad.abreviatura ? `(${unidad.abreviatura})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="sku"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Código/Referencia
                  </label>
                  <input
                    type="text"
                    id="sku"
                    name="sku"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.sku}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Campos de stock ocultos */}

                <div className="col-span-2">
                  <label
                    htmlFor="descripcion"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={guardando || proveedores.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}