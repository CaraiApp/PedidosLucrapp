// src/app/articulos/nuevo/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../components/AppLayout";
import { verificarLimiteAlcanzado } from "@/lib/supabase";
import { Unidad } from "@/types";

interface Proveedor {
  id: string;
  nombre: string;
}

// Content component that uses searchParams
function NuevoArticuloContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proveedorIdParam = searchParams.get("proveedor");

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    proveedor_id: proveedorIdParam || "",
    precio: "",
    unidad_id: "",
    sku: "",
    // Campos de stock ocultos pero mantenidos en el estado
    stock_actual: "0",
    stock_minimo: "0",
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verificarLimites = async () => {
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

        if (limiteExcedido) {
          setError(
            "Has alcanzado el límite de artículos permitido en tu plan. Por favor, actualiza tu membresía para añadir más artículos."
          );
        }

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
      } catch (err: unknown) {
        const error = err as { message?: string };
        console.error("Error al verificar límites:", error.message || String(err));
        setError(
          "Error al cargar datos. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    verificarLimites();
  }, [router, proveedorIdParam]);

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

    // Verificar límite antes de guardar
    if (limiteAlcanzado) {
      setError("Has alcanzado el límite de artículos permitido en tu plan. Por favor, actualiza tu membresía para añadir más artículos.");
      router.push("/membresias");
      return;
    }

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

      // Crear nuevo artículo
      const precio = parseFloat(formData.precio) || 0;
      const stockActual = parseInt(formData.stock_actual) || 0;
      const stockMinimo = parseInt(formData.stock_minimo) || 0;

      const { error: insertError } = await supabase.from("articulos").insert({
        usuario_id: sessionData.session.user.id,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion.trim() || null,
        proveedor_id: formData.proveedor_id || null,
        precio: precio,
        unidad_id: formData.unidad_id || null, // Usamos unidad_id en lugar de unidad
        sku: formData.sku.trim() || null,
        stock_actual: stockActual,
        stock_minimo: stockMinimo,
      });

      if (insertError) throw insertError;

      // Redireccionar a la lista de artículos
      router.push("/articulos");
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("Error al crear artículo:", error.message || String(err));
      setError("No se pudo crear el artículo. Por favor, intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nuevo Artículo</h1>

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
        ) : limiteAlcanzado ? (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              Has alcanzado el límite de artículos permitido en tu plan
              actual.
            </p>
            <Link
              href="/membresias"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Actualizar Membresía
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
                  {guardando ? "Guardando..." : "Guardar Artículo"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// Main page component with Suspense boundary
export default function NuevoArticuloPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <NuevoArticuloContent />
    </Suspense>
  );
}