// src/app/admin/dashboard/membresias/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface TipoMembresia {
  id: string;
  nombre: string;
  precio: number;
  duracion_meses: number;
  limite_proveedores: number | null;
  limite_articulos: number | null;
  limite_listas: number | null;
  descripcion: string | null;
  created_at: string;
}

export default function GestionMembresias() {
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    cargarTiposMembresia();
  }, []);

  const cargarTiposMembresia = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("membresia_tipos")
        .select("*")
        .order("precio", { ascending: true });

      if (error) throw error;

      setTiposMembresia(data || []);
    } catch (err: any) {
      console.error("Error al cargar tipos de membresía:", err.message);
      setError(
        "No se pudieron cargar los tipos de membresía. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarMembresia = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este tipo de membresía? Esta acción no se puede deshacer y puede afectar a usuarios activos."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Verificar si hay usuarios con esta membresía
      const { count: usuariosCount, error: countError } = await supabase
        .from("membresias_usuarios")
        .select("*", { count: "exact", head: true })
        .eq("tipo_membresia_id", id)
        .eq("estado", "activa");

      if (countError) throw countError;

      if (usuariosCount && usuariosCount > 0) {
        setError(
          `No se puede eliminar esta membresía porque hay ${usuariosCount} usuarios que la tienen activa.`
        );
        return;
      }

      // Eliminar tipo de membresía
      const { error } = await supabase
        .from("membresia_tipos")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Actualizar la lista
      setTiposMembresia(tiposMembresia.filter((tipo) => tipo.id !== id));
      setMensaje("Tipo de membresía eliminado correctamente");

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al eliminar tipo de membresía:", err.message);
      setError(
        "No se pudo eliminar el tipo de membresía. Por favor, intenta nuevamente."
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Gestión de Planes de Membresía
        </h1>
        <Link
          href="/admin/dashboard/membresias/nuevo"
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Crear nuevo plan
        </Link>
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

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : tiposMembresia.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-500 mb-4">
            No hay planes de membresía registrados.
          </p>
          <Link
            href="/admin/dashboard/membresias/nuevo"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Crear el primer plan
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tiposMembresia.map((tipo) => (
              <li key={tipo.id}>
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {tipo.nombre}
                    </h3>
                    <p className="text-xl font-semibold text-indigo-600">
                      {formatearPrecio(tipo.precio)}
                      <span className="text-sm text-gray-500 font-normal">
                        {" "}
                        / {tipo.duracion_meses}{" "}
                        {tipo.duracion_meses === 1 ? "mes" : "meses"}
                      </span>
                    </p>
                  </div>

                  <div className="mt-2">
                    <p className="text-gray-600">
                      {tipo.descripcion || "Sin descripción"}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">
                        Proveedores:
                      </span>{" "}
                      <span className="font-medium">
                        {tipo.limite_proveedores
                          ? tipo.limite_proveedores
                          : "Ilimitados"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Artículos:</span>{" "}
                      <span className="font-medium">
                        {tipo.limite_articulos
                          ? tipo.limite_articulos
                          : "Ilimitados"}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Listas:</span>{" "}
                      <span className="font-medium">
                        {tipo.limite_listas ? tipo.limite_listas : "Ilimitadas"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/admin/dashboard/membresias/editar/${tipo.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleEliminarMembresia(tipo.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
