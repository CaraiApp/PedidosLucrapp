// src/app/admin/dashboard/usuarios/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Usuario, Mensaje } from "@/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";

export default function PerfilUsuario() {
  const { isAdmin } = useAuth();
  const params = useParams();
  const userId = params.id as string;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const cargarDatosUsuario = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("usuarios")
        .select(`
          *,
          membresia_activa: membresias_usuarios!membresia_activa_id(
            id,
            tipo_membresia:membresia_tipos(id, nombre, descripcion, precio, periodo),
            fecha_inicio,
            fecha_fin,
            estado
          )
        `)
        .eq("id", userId)
        .single();

      if (error) throw error;

      setUsuario(data);
    } catch (err) {
      console.error("Error al cargar datos del usuario:", err);
      setMensaje({
        texto: "No se pudieron cargar los datos del usuario",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    // Verificar si el usuario es administrador
    if (!isAdmin()) {
      setMensaje({
        texto: "No tienes permisos para acceder a esta página",
        tipo: "error"
      });
      return;
    }
    
    // Cargar datos del usuario
    cargarDatosUsuario();
  }, [isAdmin, userId, cargarDatosUsuario]);

  const asignarMembresiaGratuita = async () => {
    try {
      setLoading(true);
      
      // Verificar si ya tiene una membresía activa
      if (usuario?.membresia_activa) {
        setMensaje({
          texto: "El usuario ya tiene una membresía activa",
          tipo: "advertencia"
        });
        return;
      }
      
      // Calcular fechas
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Plan gratuito por 1 año
      
      // Crear registro de membresía
      const { data: membresia, error: membresiaError } = await supabase
        .from("membresias_usuarios")
        .insert({
          usuario_id: userId,
          membresia_id: "13fae609-2679-47fa-9731-e2f1badc4a61", // ID de la membresía gratuita
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin.toISOString(),
          estado: "activa"
        })
        .select()
        .single();
        
      if (membresiaError) throw membresiaError;
      
      // Actualizar el usuario para establecer esta membresía como la activa
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ membresia_activa_id: membresia.id })
        .eq("id", userId);
        
      if (updateError) throw updateError;
      
      // Recargar datos
      await cargarDatosUsuario();
      
      setMensaje({
        texto: "Membresía gratuita asignada correctamente",
        tipo: "exito"
      });
    } catch (err) {
      console.error("Error al asignar membresía gratuita:", err);
      setMensaje({
        texto: "No se pudo asignar la membresía gratuita",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return <Loading text="Cargando información del usuario..." />;
  }

  if (!usuario) {
    return (
      <div className="p-6">
        <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No se encontró el usuario solicitado.</p>
            <Button href="/admin/dashboard/usuarios">
              Volver a la lista de usuarios
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Perfil de Usuario
        </h1>
        <div className="flex space-x-2">
          <Button 
            href={`/admin/dashboard/usuarios/editar/${userId}`}
            variant="outline"
          >
            Editar
          </Button>
          <Button 
            href="/admin/dashboard/usuarios"
            variant="secondary"
          >
            Volver
          </Button>
        </div>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Información básica */}
        <Card title="Información básica" className="md:col-span-2">
          <div className="flex items-center mb-6">
            <div className="h-20 w-20 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-3xl font-medium text-indigo-800">
                {usuario.username?.[0]?.toUpperCase() || usuario.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-6">
              <h2 className="text-xl font-medium text-gray-900">{usuario.username}</h2>
              <p className="text-sm text-gray-500">{usuario.email}</p>
              <p className="text-sm text-gray-500 mt-1">
                Registrado el {formatearFecha(usuario.created_at)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-200 pt-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Nombre completo</h3>
              <p className="mt-1 text-sm text-gray-900">{usuario.nombre && usuario.apellidos ? `${usuario.nombre} ${usuario.apellidos}` : "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Teléfono</h3>
              <p className="mt-1 text-sm text-gray-900">{usuario.telefono || "No especificado"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Empresa</h3>
              <p className="mt-1 text-sm text-gray-900">{usuario.empresa || "No especificado"}</p>
            </div>
          </div>
        </Card>

        {/* Información de membresía */}
        <Card title="Membresía" className="md:col-span-1">
          {usuario.membresia_activa ? (
            <div>
              <div className="mb-4">
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                  {usuario.membresia_activa.tipo_membresia.nombre}
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha de inicio</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatearFecha(usuario.membresia_activa.fecha_inicio)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Fecha de vencimiento</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatearFecha(usuario.membresia_activa.fecha_fin)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Estado</h3>
                  <p className="mt-1 text-sm text-gray-900 capitalize">
                    {usuario.membresia_activa.estado}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Precio</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {usuario.membresia_activa.tipo_membresia.precio}€ / {usuario.membresia_activa.tipo_membresia.duracion_meses} meses
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button 
                  href={`/admin/dashboard/membresias/editar/${usuario.membresia_activa.id}`}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Gestionar membresía
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">El usuario no tiene una membresía activa.</p>
              <Button 
                onClick={asignarMembresiaGratuita}
                className="w-full"
              >
                Asignar membresía gratuita
              </Button>
            </div>
          )}
        </Card>

        {/* Datos de facturación */}
        <Card title="Datos de facturación" className="md:col-span-3">
          {usuario.razon_social || usuario.cif ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Razón social</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.razon_social || "No especificado"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">CIF/NIF</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.cif || "No especificado"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Dirección fiscal</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.direccion_fiscal || "No especificado"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Código postal</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.codigo_postal || "No especificado"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Ciudad</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.ciudad || "No especificado"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Provincia</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.provincia || "No especificado"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">País</h3>
                <p className="mt-1 text-sm text-gray-900">{usuario.pais || "No especificado"}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">No hay datos de facturación registrados.</p>
            </div>
          )}
        </Card>

        {/* Acciones adicionales */}
        <Card title="Acciones" className="md:col-span-3">
          <div className="flex flex-wrap gap-2">
            <Button 
              href={`/admin/dashboard/usuarios/editar/${userId}`}
              variant="outline"
            >
              Editar perfil
            </Button>
            {usuario.membresia_activa ? (
              <Button 
                href={`/admin/dashboard/membresias/editar/${usuario.membresia_activa.id}`}
                variant="outline"
              >
                Gestionar membresía
              </Button>
            ) : (
              <Button 
                onClick={asignarMembresiaGratuita}
                variant="primary"
              >
                Asignar membresía gratuita
              </Button>
            )}
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm("¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer y eliminará todos sus datos asociados.")) {
                  // Implementar lógica para eliminar usuario
                }
              }}
            >
              Eliminar usuario
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}