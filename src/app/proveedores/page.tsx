// src/app/proveedores/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppLayout from "../components/AppLayout";
import { verificarLimiteAlcanzado } from "@/lib/supabase";

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

export default function ProveedoresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [limiteAlcanzado, setLimiteAlcanzado] = useState(false);

  useEffect(() => {
    const cargarProveedores = async () => {
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

        // Cargar proveedores
        const { data, error } = await supabase
          .from("proveedores")
          .select("*")
          .eq("usuario_id", sessionData.session.user.id)
          .order("nombre");

        if (error) throw error;

        setProveedores(data || []);
      } catch (err: any) {
        console.error("Error al cargar proveedores:", err.message);
        setError(
          "No se pudieron cargar los proveedores. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarProveedores();
  }, [router]);

  const handleEliminarProveedor = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este proveedor? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar proveedor
      const { error } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Actualizar la lista de proveedores
      setProveedores(proveedores.filter((p) => p.id !== id));

      setMensaje("Proveedor eliminado correctamente");

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al eliminar proveedor:", err.message);
      setError(
        "No se pudo eliminar el proveedor. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(
    (proveedor) =>
      proveedor.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
      (proveedor.email &&
        proveedor.email.toLowerCase().includes(filtro.toLowerCase())) ||
      (proveedor.contacto &&
        proveedor.contacto.toLowerCase().includes(filtro.toLowerCase()))
  );

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mis Proveedores</h1>

          <div className="mt-4 sm:mt-0">
            <Link
              href="/proveedores/nuevo"
              className={`px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                limiteAlcanzado ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={(e) => {
                if (limiteAlcanzado) {
                  e.preventDefault();
                  alert(
                    "Has alcanzado el límite de proveedores permitido en tu plan. Por favor, actualiza tu membresía para añadir más proveedores."
                  );
                }
              }}
            >
              Nuevo Proveedor
            </Link>
          </div>
        </div>
        
        {/* Guía de Uso */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Gestión de Proveedores</h2>
          <p className="text-sm text-blue-700 mb-2">
            Aquí puedes gestionar todos tus proveedores. Un buen catálogo de proveedores es el primer paso para organizar tus compras de forma eficiente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
            <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-1">1. Añadir Proveedores</h3>
              <p className="text-gray-600">Comienza registrando todos tus proveedores habituales con sus datos de contacto para facilitar la comunicación.</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-1">2. Organizar por Categorías</h3>
              <p className="text-gray-600">Utiliza el campo de notas para categorizar tus proveedores (alimentos, bebidas, materiales, etc.).</p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm border border-blue-100">
              <h3 className="font-medium text-blue-800 mb-1">3. Añadir Productos</h3>
              <p className="text-gray-600">Una vez creados los proveedores, podrás asignarles productos en la sección de Artículos.</p>
            </div>
          </div>
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 flex items-center"
            onClick={() => {
              const guia = document.getElementById('guia-proveedores');
              if (guia) guia.style.display = guia.style.display === 'none' ? 'block' : 'none';
            }}
          >
            Ver más detalles
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          <div id="guia-proveedores" className="mt-3 hidden">
            <h3 className="font-medium text-blue-800 mb-1">Consejos para gestionar proveedores:</h3>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              <li>Registra información completa: teléfono, email, dirección y persona de contacto</li>
              <li>Organiza tus proveedores por tipo/categoría para facilitar su búsqueda</li>
              <li>Utiliza el campo de notas para añadir información sobre condiciones de pago, mínimos de pedido, etc.</li>
              <li>Actualiza regularmente la información de contacto para mantenerla al día</li>
              <li>Estandariza los nombres de tus proveedores para evitar duplicados</li>
            </ul>
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
            Has alcanzado el límite de proveedores permitido en tu plan.
            <Link href="/membresias" className="underline ml-1">
              Actualiza tu membresía
            </Link>{" "}
            para añadir más proveedores.
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
              placeholder="Buscar proveedores..."
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
        ) : proveedores.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">
              No tienes proveedores registrados.
            </p>
            {!limiteAlcanzado && (
              <Link
                href="/proveedores/nuevo"
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Añade tu primer proveedor
              </Link>
            )}
          </div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              No se encontraron proveedores que coincidan con tu búsqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proveedoresFiltrados.map((proveedor) => (
              <div
                key={proveedor.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    {proveedor.nombre}
                  </h2>

                  <div className="space-y-2 text-sm text-gray-600">
                    {proveedor.contacto && (
                      <p>Contacto: {proveedor.contacto}</p>
                    )}
                    {proveedor.email && (
                      <p>
                        <a
                          href={`mailto:${proveedor.email}`}
                          className="hover:text-indigo-600"
                        >
                          {proveedor.email}
                        </a>
                      </p>
                    )}
                    {proveedor.telefono && (
                      <p>
                        <a
                          href={`tel:${proveedor.telefono}`}
                          className="hover:text-indigo-600"
                        >
                          {proveedor.telefono}
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                    <Link
                      href={`/proveedores/${proveedor.id}`}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Ver detalles
                    </Link>
                    <div className="flex space-x-2">
                      <Link
                        href={`/proveedores/editar/${proveedor.id}`}
                        className="text-gray-600 hover:text-gray-800"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleEliminarProveedor(proveedor.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
