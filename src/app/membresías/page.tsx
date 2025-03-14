// src/app/membresias/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "../components/AppLayout";

interface TipoMembresia {
  id: string;
  nombre: string;
  precio: number;
  duracion_meses: number;
  limite_articulos: number | null;
  limite_proveedores: number | null;
  limite_listas: number | null;
  descripcion: string | null;
}

interface MembresiaActual {
  id: string;
  tipo_membresia: TipoMembresia;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export default function MembresiasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tiposMembresia, setTiposMembresia] = useState<TipoMembresia[]>([]);
  const [membresiaActual, setMembresiaActual] =
    useState<MembresiaActual | null>(null);
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

        // Cargar tipos de membresía
        const { data: membresiasData, error: membresiasError } = await supabase
          .from("membresia_tipos")
          .select("*")
          .order("precio", { ascending: true });

        if (membresiasError) throw membresiasError;

        // Cargar membresía actual del usuario
        const { data: usuarioData, error: usuarioError } = await supabase
          .from("usuarios")
          .select(
            `
            membresia_activa: membresias_usuarios!inner(
              *,
              tipo_membresia: membresia_tipos(*)
            )
          `
          )
          .eq("id", sessionData.session.user.id)
          .single();

        if (usuarioError) throw usuarioError;

        setTiposMembresia(membresiasData || []);
        // Check if data exists and reshape it to match MembresiaActual type if needed
        if (usuarioData?.membresia_activa) {
          const membresiaActiva = Array.isArray(usuarioData.membresia_activa) 
            ? usuarioData.membresia_activa[0] 
            : usuarioData.membresia_activa;
            
          setMembresiaActual(membresiaActiva);
        } else {
          setMembresiaActual(null);
        }
      } catch (err: unknown) {
        const error = err as SupabaseError;
        console.error("Error al cargar datos:", error.message);
        setError(
          "No se pudieron cargar los datos. Por favor, intenta nuevamente."
        );
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [router]);

  const handleActualizarMembresia = async (tipoMembresiaId: string) => {
    try {
      setLoading(true);

      // Verificar sesión
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      // En un sistema real, aquí implementarías la integración con un sistema de pagos
      // Por ahora, simplemente actualizaremos la membresía directamente

      // Obtener información del tipo de membresía seleccionado
      const tipoSeleccionado = tiposMembresia.find(
        (tipo) => tipo.id === tipoMembresiaId
      );
      if (!tipoSeleccionado) {
        throw new Error("Tipo de membresía no encontrado");
      }

      // Calcular fecha de fin
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + tipoSeleccionado.duracion_meses);

      // Cambiar estado de la membresía actual a "cancelada"
      if (membresiaActual) {
        await supabase
          .from("membresias_usuarios")
          .update({ estado: "cancelada" })
          .eq("id", membresiaActual.id);
      }

      // Crear nueva membresía
      const { data: nuevaMembresia, error: membresiaError } = await supabase
        .from("membresias_usuarios")
        .insert({
          usuario_id: sessionData.session.user.id,
          tipo_membresia_id: tipoMembresiaId,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
          estado: "activa",
        })
        .select()
        .single();

      if (membresiaError) throw membresiaError;

      // Actualizar la membresía activa en el perfil del usuario
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ membresia_activa_id: nuevaMembresia.id })
        .eq("id", sessionData.session.user.id);

      if (updateError) throw updateError;

      // Recargar la página para ver los cambios
      window.location.reload();
    } catch (err: unknown) {
      const error = err as SupabaseError;
      console.error("Error al actualizar membresía:", error.message);
      setError(
        "No se pudo actualizar la membresía. Por favor, intenta nuevamente."
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

  // Función para formatear fecha
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <AppLayout>
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-6">Planes de Membresía</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Membresía Actual */}
            {membresiaActual && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-lg font-semibold mb-4">
                  Tu Membresía Actual
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Plan:</p>
                    <p className="font-medium">
                      {membresiaActual.tipo_membresia.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Precio:</p>
                    <p className="font-medium">
                      {formatearPrecio(membresiaActual.tipo_membresia.precio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha de inicio:</p>
                    <p className="font-medium">
                      {formatearFecha(membresiaActual.fecha_inicio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Fecha de vencimiento:</p>
                    <p className="font-medium">
                      {formatearFecha(membresiaActual.fecha_fin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Estado:</p>
                    <p className="font-medium capitalize">
                      {membresiaActual.estado}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <h3 className="font-medium mb-2">Límites:</h3>
                  <ul className="list-disc pl-5">
                    <li>
                      Proveedores:{" "}
                      {membresiaActual.tipo_membresia.limite_proveedores
                        ? membresiaActual.tipo_membresia.limite_proveedores
                        : "Ilimitados"}
                    </li>
                    <li>
                      Artículos:{" "}
                      {membresiaActual.tipo_membresia.limite_articulos
                        ? membresiaActual.tipo_membresia.limite_articulos
                        : "Ilimitados"}
                    </li>
                    <li>
                      Listas de compra:{" "}
                      {membresiaActual.tipo_membresia.limite_listas
                        ? membresiaActual.tipo_membresia.limite_listas
                        : "Ilimitadas"}
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Planes disponibles */}
            <h2 className="text-xl font-semibold mb-4">Planes Disponibles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tiposMembresia.map((tipo) => (
                <div
                  key={tipo.id}
                  className={`bg-white p-6 rounded-lg shadow-md border-2 ${
                    membresiaActual?.tipo_membresia.id === tipo.id
                      ? "border-indigo-500"
                      : "border-transparent"
                  }`}
                >
                  <h3 className="text-lg font-bold mb-2">{tipo.nombre}</h3>
                  <p className="text-2xl font-bold text-indigo-600 mb-4">
                    {formatearPrecio(tipo.precio)}
                    <span className="text-sm text-gray-500 font-normal">
                      {" "}
                      / {tipo.duracion_meses}{" "}
                      {tipo.duracion_meses === 1 ? "mes" : "meses"}
                    </span>
                  </p>

                  {tipo.descripcion && (
                    <p className="text-gray-600 mb-4">{tipo.descripcion}</p>
                  )}

                  <div className="mt-2 mb-6">
                    <h4 className="font-medium mb-2">Incluye:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>
                        {tipo.limite_proveedores
                          ? `Hasta ${tipo.limite_proveedores} proveedores`
                          : "Proveedores ilimitados"}
                      </li>
                      <li>
                        {tipo.limite_articulos
                          ? `Hasta ${tipo.limite_articulos} artículos`
                          : "Artículos ilimitados"}
                      </li>
                      <li>
                        {tipo.limite_listas
                          ? `Hasta ${tipo.limite_listas} listas de compra`
                          : "Listas de compra ilimitadas"}
                      </li>
                      <li>Soporte por email</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleActualizarMembresia(tipo.id)}
                    disabled={
                      loading || membresiaActual?.tipo_membresia.id === tipo.id
                    }
                    className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors ${
                      membresiaActual?.tipo_membresia.id === tipo.id
                        ? "bg-green-500 cursor-default"
                        : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {membresiaActual?.tipo_membresia.id === tipo.id
                      ? "Plan Actual"
                      : "Seleccionar Plan"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
