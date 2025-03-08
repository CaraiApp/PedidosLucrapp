// src/app/admin/dashboard/usuarios/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Usuario, Mensaje } from "@/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../../auth";

export default function PerfilUsuario() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [mostrarModalEmail, setMostrarModalEmail] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [contenido, setContenido] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [permisosVerificados, setPermisosVerificados] = useState(false);

  const cargarDatosUsuario = useCallback(async () => {
    try {
      setLoading(true);
      
      // Primero, obtenemos los datos básicos del usuario
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      
      // Ahora, si el usuario tiene una membresía activa, cargamos esos datos
      let membresia = null;
      if (userData.membresia_activa_id) {
        try {
          const { data: membresiaData, error: membresiaError } = await supabase
            .from("membresias_usuarios")
            .select("*, tipo_membresia:membresia_tipos(*)")
            .eq("id", userData.membresia_activa_id)
            .single();
            
          if (!membresiaError && membresiaData) {
            membresia = membresiaData;
          }
        } catch (membresiaErr) {
          console.warn("Error al cargar datos de membresía:", membresiaErr);
          // Continuamos aunque no se pueda cargar la membresía
        }
      }
      
      // Combinamos los datos
      setUsuario({
        ...userData,
        membresia_activa: membresia
      });
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
  
  // useEffect para verificar permisos y cargar datos (solo se ejecuta una vez)
  useEffect(() => {
    if (!permisosVerificados) {
      const verificarAcceso = async () => {
        try {
          // Simplificar la verificación para evitar problemas con las rutas dinámicas
          console.log("Accediendo a perfil de usuario con ID:", userId);
          
          // Intentamos cargar los datos del usuario directamente
          cargarDatosUsuario();
          setPermisosVerificados(true);
        } catch (error) {
          console.error("Error al verificar acceso:", error);
          setMensaje({
            texto: "Error al cargar datos del usuario",
            tipo: "error"
          });
          setLoading(false);
          setPermisosVerificados(true);
        }
      };
      
      verificarAcceso();
    }
  }, [permisosVerificados, userId, cargarDatosUsuario]);

  // Enviar correo al usuario
  const enviarCorreoUsuario = async () => {
    if (!usuario?.email || !asunto || !contenido) {
      setMensaje({
        texto: "Debes completar todos los campos",
        tipo: "error"
      });
      return;
    }
    
    setEnviandoEmail(true);
    setMensaje(null);
    
    try {
      // Obtener el token de autenticación
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("No se pudo obtener la sesión de usuario");
      }
      
      // Crear el contenido HTML con estilos
      const contenidoHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4f46e5;">${asunto}</h1>
          ${contenido.split('\n').map(parrafo => `<p>${parrafo}</p>`).join('')}
          <div style="margin-top: 30px; padding: 20px 0; border-top: 1px solid #eaeaea;">
            <p style="color: #666; font-size: 14px;">Saludos,<br>El equipo de Lucrapp</p>
          </div>
        </div>
      `;
      
      // Enviar el correo a través de la API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinatario: usuario.email,
          asunto: asunto,
          contenido: contenidoHtml,
          token: session.access_token,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Error al enviar el correo");
      }
      
      // Correo enviado con éxito
      setMensaje({
        texto: "Correo enviado correctamente",
        tipo: "success"
      });
      
      // Cerrar el modal y limpiar campos
      setMostrarModalEmail(false);
      setAsunto("");
      setContenido("");
    } catch (error: any) {
      console.error("Error al enviar correo:", error);
      setMensaje({
        texto: `Error al enviar correo: ${error.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

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
      
      // ID fijo del plan gratuito
      const tipoPlanGratuitoId = "13fae609-2679-47fa-9731-e2f1badc4a61";
      
      // Usar la API para evitar problemas con RLS
      const response = await fetch('/api/create-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          tipoMembresiaId: tipoPlanGratuitoId,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin.toISOString(),
          estado: 'activa'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al crear membresía gratuita");
      }
      
      // Recargar datos del usuario
      await cargarDatosUsuario();
      
      setMensaje({
        texto: "Membresía gratuita asignada correctamente",
        tipo: "exito"
      });
    } catch (err: any) {
      console.error("Error al asignar membresía gratuita:", err);
      setMensaje({
        texto: `No se pudo asignar la membresía gratuita: ${err.message || ''}`,
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
                    {usuario.membresia_activa.tipo_membresia.precio || 0}€ / {usuario.membresia_activa.tipo_membresia.duracion_meses || 0} meses
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button 
                  href={`/admin/dashboard/membresias/gestionar/${userId}`}
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
            <Button 
              href={`/admin/dashboard/membresias/gestionar/${userId}`}
              variant="outline"
            >
              Gestionar membresía
            </Button>
            <Button
              variant="outline"
              onClick={() => setMostrarModalEmail(true)}
            >
              Enviar correo
            </Button>
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

      {/* Modal para enviar correo */}
      {mostrarModalEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Enviar correo a {usuario?.email}
                </h3>
                <button 
                  onClick={() => setMostrarModalEmail(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="asunto" className="block text-sm font-medium text-gray-700 mb-1">
                    Asunto
                  </label>
                  <input
                    type="text"
                    id="asunto"
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={asunto}
                    onChange={(e) => setAsunto(e.target.value)}
                    placeholder="Asunto del correo"
                  />
                </div>
                
                <div>
                  <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-1">
                    Contenido
                  </label>
                  <textarea
                    id="contenido"
                    rows={8}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="Escribe el contenido del correo..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Puedes usar saltos de línea para separar párrafos.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setMostrarModalEmail(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={enviarCorreoUsuario}
                    isLoading={enviandoEmail}
                    disabled={enviandoEmail || !asunto || !contenido}
                  >
                    Enviar correo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}