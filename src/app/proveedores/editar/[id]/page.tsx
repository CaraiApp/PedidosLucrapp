// src/app/proveedores/editar/[id]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../../../components/AppLayout";

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

export default function EditarProveedorPage() {
  const router = useRouter();
  const params = useParams();
  const proveedorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
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
    const cargarProveedor = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Cargar datos del proveedor
        const { data, error } = await supabase
          .from("proveedores")
          .select("*")
          .eq("id", proveedorId)
          .eq("usuario_id", sessionData.session.user.id)
          .single();

        if (error) throw error;

        if (!data) {
          router.push("/proveedores");
          return;
        }

        setProveedor(data);
        setFormData({
          nombre: data.nombre || "",
          email: data.email || "",
          telefono: data.telefono || "",
          contacto: data.contacto || "",
          direccion: data.direccion || "",
          notas: data.notas || "",
        });
      } catch (err: any) {
        console.error("Error al cargar proveedor:", err.message);
        setError(
          "No se pudo cargar la información del proveedor. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    if (proveedorId) {
      cargarProveedor();
    }
  }, [proveedorId, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      // Actualizar proveedor
      const { error: updateError } = await supabase
        .from("proveedores")
        .update({
          nombre: formData.nombre.trim(),
          email: formData.email.trim() || null,
          telefono: formData.telefono.trim() || null,
          contacto: formData.contacto.trim() || null,
          direccion: formData.direccion.trim() || null,
          notas: formData.notas.trim() || null,
        })
        .eq("id", proveedorId)
        .eq("usuario_id", sessionData.session.user.id);

      if (updateError) throw updateError;

      // Redireccionar a la lista de proveedores
      router.push("/proveedores");
    } catch (err: any) {
      console.error("Error al actualizar proveedor:", err.message);
      setError(
        "No se pudo actualizar el proveedor. Por favor, intenta nuevamente."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Editar Proveedor</h1>

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
        ) : !proveedor ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontró el proveedor o no tienes permiso para editarlo.
            </p>
            <Link
              href="/proveedores"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-800"
            >
              Volver a la lista de proveedores
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
                  {guardando ? "Guardando..." : "Actualizar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
