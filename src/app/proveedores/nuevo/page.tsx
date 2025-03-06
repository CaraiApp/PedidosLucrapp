// src/app/proveedores/nuevo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../components/AppLayout";
import { verificarLimiteAlcanzado } from "@/lib/supabase";

export default function NuevoProveedorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    contacto: "",
    direccion: "",
    notas: "",
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

        // Verificar si se ha alcanzado el límite de proveedores
        const limiteExcedido = await verificarLimiteAlcanzado(
          "proveedores",
          sessionData.session.user.id
        );

        setLimiteAlcanzado(limiteExcedido);

        if (limiteExcedido) {
          setError(
            "Has alcanzado el límite de proveedores permitido en tu plan. Por favor, actualiza tu membresía para añadir más proveedores."
          );
        }
      } catch (err: any) {
        console.error("Error al verificar límites:", err.message);
        setError(
          "Ocurrió un error al verificar los límites de tu cuenta. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    verificarLimites();
  }, [router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (limiteAlcanzado) {
      return;
    }

    if (!formData.nombre.trim()) {
      setError("El nombre del proveedor es obligatorio");
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

      // Crear nuevo proveedor
      const { error: insertError } = await supabase.from("proveedores").insert({
        usuario_id: sessionData.session.user.id,
        nombre: formData.nombre.trim(),
        email: formData.email.trim() || null,
        telefono: formData.telefono.trim() || null,
        contacto: formData.contacto.trim() || null,
        direccion: formData.direccion.trim() || null,
        notas: formData.notas.trim() || null,
      });

      if (insertError) throw insertError;

      // Redireccionar a la lista de proveedores
      router.push("/proveedores");
    } catch (err: any) {
      console.error("Error al crear proveedor:", err.message);
      setError("No se pudo crear el proveedor. Por favor, intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Nuevo Proveedor</h1>

          <Link
            href="/proveedores"
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
              Has alcanzado el límite de proveedores permitido en tu plan
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
                    Nombre del Proveedor <span className="text-red-500">*</span>
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
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label
                    htmlFor="telefono"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.telefono}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label
                    htmlFor="contacto"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    id="contacto"
                    name="contacto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.contacto}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-span-2">
                  <label
                    htmlFor="direccion"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Dirección
                  </label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.direccion}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="col-span-2">
                  <label
                    htmlFor="notas"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Notas Adicionales
                  </label>
                  <textarea
                    id="notas"
                    name="notas"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={formData.notas}
                    onChange={handleInputChange}
                  ></textarea>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {guardando ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
