// src/app/admin/dashboard/membresias/nuevo/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface FormData {
  nombre: string;
  precio: string;
  duracion_meses: string;
  limite_proveedores: string;
  limite_articulos: string;
  limite_listas: string;
  descripcion: string;
}

interface MembresiaData {
  nombre: string;
  precio: number;
  duracion_meses: number;
  limite_proveedores: number | null;
  limite_articulos: number | null;
  limite_listas: number | null;
  descripcion: string | null;
}

interface SupabaseError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export default function NuevaMembresiaPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    precio: "",
    duracion_meses: "1",
    limite_proveedores: "",
    limite_articulos: "",
    limite_listas: "",
    descripcion: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones básicas
    if (!formData.nombre.trim()) {
      setError("El nombre del plan es obligatorio");
      return;
    }

    if (
      !formData.precio.trim() ||
      isNaN(Number(formData.precio)) ||
      Number(formData.precio) < 0
    ) {
      setError("Por favor ingrese un precio válido");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Preparar los datos para insertar
      const membresiaData: MembresiaData = {
        nombre: formData.nombre.trim(),
        precio: parseFloat(formData.precio),
        duracion_meses: parseInt(formData.duracion_meses),
        limite_proveedores: formData.limite_proveedores.trim()
          ? parseInt(formData.limite_proveedores)
          : null,
        limite_articulos: formData.limite_articulos.trim()
          ? parseInt(formData.limite_articulos)
          : null,
        limite_listas: formData.limite_listas.trim()
          ? parseInt(formData.limite_listas)
          : null,
        descripcion: formData.descripcion.trim() || null,
      };

      // Insertar en la base de datos
      const { error: insertError } = await supabase
        .from("membresia_tipos")
        .insert(membresiaData);

      if (insertError) throw insertError;

      // Redireccionar a la lista de membresías
      router.push("/admin/dashboard/membresias");
    } catch (err: unknown) {
      const supabaseError = err as SupabaseError;
      console.error("Error al crear plan de membresía:", supabaseError.message);
      setError(
        "No se pudo crear el plan de membresía. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Crear Nuevo Plan de Membresía
        </h1>
        <Link
          href="/admin/dashboard/membresias"
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

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label
                htmlFor="nombre"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre del Plan <span className="text-red-500">*</span>
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

            <div>
              <label
                htmlFor="precio"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Precio (€) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.precio}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label
                htmlFor="duracion_meses"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Duración (meses) <span className="text-red-500">*</span>
              </label>
              <select
                id="duracion_meses"
                name="duracion_meses"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.duracion_meses}
                onChange={handleInputChange}
                required
              >
                <option value="1">1 mes</option>
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
                <option value="24">24 meses</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="limite_proveedores"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Límite de Proveedores
              </label>
              <input
                type="number"
                id="limite_proveedores"
                name="limite_proveedores"
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.limite_proveedores}
                onChange={handleInputChange}
                placeholder="Dejar en blanco para ilimitado"
              />
            </div>

            <div>
              <label
                htmlFor="limite_articulos"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Límite de Artículos
              </label>
              <input
                type="number"
                id="limite_articulos"
                name="limite_articulos"
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.limite_articulos}
                onChange={handleInputChange}
                placeholder="Dejar en blanco para ilimitado"
              />
            </div>

            <div>
              <label
                htmlFor="limite_listas"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Límite de Listas de Compra
              </label>
              <input
                type="number"
                id="limite_listas"
                name="limite_listas"
                min="0"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.limite_listas}
                onChange={handleInputChange}
                placeholder="Dejar en blanco para ilimitado"
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
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Describe las características de este plan"
              ></textarea>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Guardando...
                </span>
              ) : (
                "Guardar Plan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
