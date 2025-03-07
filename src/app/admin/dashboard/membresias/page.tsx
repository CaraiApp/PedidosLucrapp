// src/app/admin/dashboard/membresias/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import { Mensaje, TipoMembresia } from "@/types";

export default function GestionMembresias() {
  const router = useRouter();
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

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
    } catch (err) {
      console.error("Error al cargar tipos de membresía:", err);
      setMensaje({
        texto: "No se pudieron cargar los tipos de membresía. Por favor, intenta nuevamente.",
        tipo: "error"
      });
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
        setMensaje({
          texto: `No se puede eliminar esta membresía porque hay ${usuariosCount} usuarios que la tienen activa.`,
          tipo: "error"
        });
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
      setMensaje({
        texto: "Tipo de membresía eliminado correctamente",
        tipo: "exito"
      });

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err) {
      console.error("Error al eliminar tipo de membresía:", err);
      setMensaje({
        texto: "No se pudo eliminar el tipo de membresía. Por favor, intenta nuevamente.",
        tipo: "error"
      });
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
        <Button 
          href="/admin/dashboard/membresias/nuevo"
        >
          Crear nuevo plan
        </Button>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      {loading ? (
        <Loading text="Cargando planes de membresía..." />
      ) : tiposMembresia.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900">
              No hay planes de membresía registrados
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Para comenzar, crea tu primer plan de membresía.
            </p>
            <div className="mt-6">
              <Button 
                onClick={() => router.push("/admin/dashboard/membresias/nuevo")}
              >
                Crear el primer plan
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {tiposMembresia.map((tipo) => (
            <Card key={tipo.id}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">
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

              <div className="mb-4">
                <p className="text-gray-600">
                  {tipo.descripcion || "Sin descripción"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 bg-gray-50 p-3 rounded-md">
                <div>
                  <span className="text-sm text-gray-500">
                    Proveedores:
                  </span>{" "}
                  <span className="font-medium">
                    {tipo.limite_proveedores === null || tipo.limite_proveedores === 0
                      ? "Ilimitados"
                      : tipo.limite_proveedores}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Artículos:</span>{" "}
                  <span className="font-medium">
                    {tipo.limite_articulos === null || tipo.limite_articulos === 0
                      ? "Ilimitados"
                      : tipo.limite_articulos}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Listas:</span>{" "}
                  <span className="font-medium">
                    {tipo.limite_listas === null || tipo.limite_listas === 0
                      ? "Ilimitadas"
                      : tipo.limite_listas}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/dashboard/membresias/editar/${tipo.id}`)}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleEliminarMembresia(tipo.id)}
                >
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
