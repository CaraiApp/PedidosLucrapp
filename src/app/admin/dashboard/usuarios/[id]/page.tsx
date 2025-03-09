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
      console.log("===== CARGANDO DATOS DE USUARIO Y MEMBRESÍA =====");
      console.log("ID de usuario:", userId);
      
      // ENFOQUE COMPLETO Y ROBUSTO:
      // 1. Realizamos una consulta SQL directa a través de una función RPC para obtener todos los datos
      //    relacionados con la membresía activa del usuario en una sola operación.
      
      // Primera opción: usar la función RPC si existe
      try {
        console.log("Intentando usar función RPC para obtener datos completos...");
        const { data: membershipData, error: rpcError } = await supabase
          .rpc('get_user_with_active_membership', { user_id: userId });
          
        if (!rpcError && membershipData) {
          console.log("Datos obtenidos correctamente mediante RPC:", membershipData);
          setUsuario(membershipData);
          setLoading(false);
          return;
        } else {
          console.log("La función RPC no está disponible, usando enfoque alternativo.");
        }
      } catch (rpcErr) {
        console.log("Error al usar RPC, continuando con método alternativo:", rpcErr);
      }
      
      // Si la función RPC no está disponible, usamos consultas regulares
      console.log("Usando consultas SQL estándar...");
      
      // Paso 1: Obtener datos básicos del usuario
      console.log("Obteniendo datos básicos del usuario...");
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error al obtener datos básicos del usuario:", userError);
        throw userError;
      }
      
      console.log("Datos básicos del usuario obtenidos correctamente.");
      
      // Paso 2: Consulta SQL directa para obtener membresía activa
      // Esta consulta garantiza consistencia incluso si el campo membresia_activa_id está desactualizado
      console.log("Buscando membresía activa mediante consulta directa...");
      
      const { data: membresiaActiva, error: membresiaError } = await supabase
        .from('membresias_usuarios')
        .select(`
          id,
          usuario_id,
          tipo_membresia_id,
          fecha_inicio,
          fecha_fin,
          estado,
          created_at,
          updated_at,
          tipo_membresia:membresia_tipos (
            id, 
            nombre, 
            descripcion, 
            precio, 
            limite_listas,
            limite_proveedores,
            limite_articulos,
            duracion_meses,
            tiene_ai
          )
        `)
        .eq('usuario_id', userId)
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();  // maybeSingle no lanza error si no hay resultados
      
      if (membresiaError) {
        console.error("Error al consultar membresía activa:", membresiaError);
      } else if (membresiaActiva) {
        console.log("Membresía activa encontrada:", membresiaActiva.id);
      } else {
        console.log("No se encontró membresía activa en la tabla membresias_usuarios.");
      }
      
      // Paso 3: Como respaldo, intentamos cargar usando el ID almacenado en el usuario
      let membresiaPorId = null;
      if (userData.membresia_activa_id) {
        console.log("Intentando cargar membresía utilizando ID almacenado:", userData.membresia_activa_id);
        
        const { data: membresiaDatos, error: membresiaIdError } = await supabase
          .from('membresias_usuarios')
          .select(`
            id,
            usuario_id,
            tipo_membresia_id,
            fecha_inicio,
            fecha_fin,
            estado,
            created_at,
            updated_at,
            tipo_membresia:membresia_tipos (
              id, 
              nombre, 
              descripcion, 
              precio, 
              limite_listas,
              limite_proveedores,
              limite_articulos,
              duracion_meses,
              tiene_ai
            )
          `)
          .eq('id', userData.membresia_activa_id)
          .maybeSingle();
          
        if (membresiaIdError) {
          console.error("Error al cargar membresía por ID almacenado:", membresiaIdError);
        } else if (membresiaDatos) {
          console.log("Membresía encontrada por ID almacenado:", membresiaDatos);
          membresiaPorId = membresiaDatos;
        } else {
          console.log("No se encontró membresía usando el ID almacenado.");
        }
      }
      
      // Paso 4: Decidir qué membresía usar y corregir inconsistencias
      let membresiaFinal = null;
      
      // Si encontramos una membresía activa, esa tiene prioridad
      if (membresiaActiva) {
        membresiaFinal = membresiaActiva;
        
        // Si el ID almacenado en el usuario no coincide con la membresía activa real,
        // actualizamos la referencia en el usuario
        if (userData.membresia_activa_id !== membresiaActiva.id) {
          console.log("Corrigiendo referencia de membresía en el usuario...");
          
          // Actualizar el campo membresia_activa_id en el usuario
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ membresia_activa_id: membresiaActiva.id })
            .eq('id', userId);
            
          if (updateError) {
            console.error("Error al actualizar referencia de membresía en usuario:", updateError);
          } else {
            console.log("Referencia de membresía en usuario actualizada correctamente.");
            // Actualizar el objeto userData en memoria también
            userData.membresia_activa_id = membresiaActiva.id;
          }
        }
      } 
      // Si no hay membresía activa pero hay una referenciada, verificamos su estado
      else if (membresiaPorId) {
        // Si la membresía referenciada no está activa, la activamos
        if (membresiaPorId.estado !== 'activa') {
          console.log("La membresía referenciada no está activa. Actualizando estado...");
          
          const { error: activateError } = await supabase
            .from('membresias_usuarios')
            .update({ estado: 'activa' })
            .eq('id', membresiaPorId.id);
            
          if (activateError) {
            console.error("Error al activar la membresía:", activateError);
          } else {
            console.log("Membresía activada correctamente.");
            membresiaPorId.estado = 'activa';
          }
        }
        
        membresiaFinal = membresiaPorId;
      } 
      // Si no hay membresía activa ni referenciada, limpiamos la referencia en el usuario
      else if (userData.membresia_activa_id) {
        console.log("No se encontró ninguna membresía válida, limpiando referencia en usuario...");
        
        const { error: clearError } = await supabase
          .from('usuarios')
          .update({ membresia_activa_id: null })
          .eq('id', userId);
          
        if (clearError) {
          console.error("Error al limpiar referencia de membresía:", clearError);
        } else {
          console.log("Referencia de membresía limpiada correctamente.");
          userData.membresia_activa_id = null;
        }
      }
      
      // Paso 5: Construir y devolver el objeto de usuario completo
      const usuarioCompleto = {
        ...userData,
        membresia_activa: membresiaFinal
      };
      
      console.log("Usuario completo con membresía:", 
        membresiaFinal ? `Activa (${membresiaFinal.id})` : "Sin membresía activa");
      
      setUsuario(usuarioCompleto);
    } catch (err) {
      console.error("Error general al cargar datos del usuario:", err);
      setMensaje({
        texto: "No se pudieron cargar los datos del usuario",
        tipo: "error"
      });
    } finally {
      setLoading(false);
      console.log("===== FIN DE CARGA DE DATOS =====");
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
        // Manejar específicamente el error de límite de tasa
        if (response.status === 429 || result.rateLimited) {
          throw new Error("Se ha excedido el límite de envío de correos. Por favor, espera unos minutos e intenta nuevamente.");
        } else {
          throw new Error(result.error || "Error al enviar el correo");
        }
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
      
      // Determinar el tipo de mensaje basado en el error
      let mensajeError = error.message || "Error desconocido";
      let tipoMensaje = "error";
      
      // Si es por límite de tasa, mostramos un mensaje más amigable
      if (mensajeError.includes("límite de envío") || 
          mensajeError.includes("rate limit") || 
          mensajeError.includes("exceeded")) {
        mensajeError = "Se ha alcanzado el límite de envío de correos. Por favor, espera unos minutos antes de intentar nuevamente.";
        tipoMensaje = "advertencia";
      }
      
      setMensaje({
        texto: mensajeError,
        tipo: tipoMensaje
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  // Estados para selección de membresía
  const [tiposMembresias, setTiposMembresias] = useState<any[]>([]);
  const [membresiaSeleccionada, setMembresiaSeleccionada] = useState<string>("");
  const [duracion, setDuracion] = useState<number>(12); // 12 meses por defecto
  const [mostrarModalMembresia, setMostrarModalMembresia] = useState(false);
  const [asignandoMembresia, setAsignandoMembresia] = useState(false);

  // Cargar tipos de membresías disponibles
  const cargarTiposMembresias = async () => {
    try {
      const { data, error } = await supabase
        .from("membresia_tipos")
        .select("*")
        .order("precio", { ascending: true });
        
      if (error) {
        console.error("Error al cargar tipos de membresías:", error);
        return;
      }
      
      setTiposMembresias(data || []);
      
      // Seleccionar la primera por defecto si no hay seleccionada
      if (data && data.length > 0 && !membresiaSeleccionada) {
        setMembresiaSeleccionada(data[0].id);
      }
    } catch (err) {
      console.error("Error al cargar tipos de membresías:", err);
    }
  };

  // Asignar membresía
  const asignarMembresia = async () => {
    if (!membresiaSeleccionada || !usuario) {
      setMensaje({
        texto: "Selecciona un tipo de membresía primero",
        tipo: "error"
      });
      return;
    }
    
    setAsignandoMembresia(true);
    setMensaje(null);
    
    try {
      // Primero desactivamos todas las membresías activas del usuario
      await fetch('/api/update-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          operation: 'deactivate-all'
        }),
      });
      
      // Calcular fechas
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + duracion);
      
      // Crear nueva membresía
      const response = await fetch('/api/create-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          tipoMembresiaId: membresiaSeleccionada,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin.toISOString(),
          estado: 'activa'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al crear membresía");
      }
      
      // Recargar datos del usuario
      await cargarDatosUsuario();
      
      setMensaje({
        texto: "Membresía asignada correctamente",
        tipo: "exito"
      });
      
      // Cerrar modal
      setMostrarModalMembresia(false);
    } catch (err: any) {
      console.error("Error al asignar membresía:", err);
      setMensaje({
        texto: `No se pudo asignar la membresía: ${err.message || ''}`,
        tipo: "error"
      });
    } finally {
      setAsignandoMembresia(false);
    }
  };

  // Método para mostrar modal y cargar tipos de membresías
  const mostrarModalAsignarMembresia = () => {
    cargarTiposMembresias();
    setMostrarModalMembresia(true);
  };

  // Asignar membresía gratuita
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
              
              <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                <Button 
                  onClick={mostrarModalAsignarMembresia}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  Cambiar membresía
                </Button>
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
              <div className="space-y-2">
                <Button 
                  onClick={mostrarModalAsignarMembresia}
                  className="w-full"
                >
                  Asignar membresía
                </Button>
                <Button 
                  onClick={asignarMembresiaGratuita}
                  variant="outline"
                  className="w-full"
                >
                  Asignar membresía gratuita
                </Button>
              </div>
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
      
      {/* Modal para asignar membresía */}
      {mostrarModalMembresia && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Asignar membresía a {usuario?.username || usuario?.email}
                </h3>
                <button 
                  onClick={() => setMostrarModalMembresia(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="tipo_membresia" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de membresía
                  </label>
                  <select
                    id="tipo_membresia"
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={membresiaSeleccionada}
                    onChange={(e) => setMembresiaSeleccionada(e.target.value)}
                  >
                    {tiposMembresias.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre} - {tipo.precio}€ / {tipo.duracion_meses} meses
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Detalles del plan seleccionado */}
                {membresiaSeleccionada && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="text-md font-medium text-gray-900 mb-2">Detalles del plan</h3>
                    
                    {tiposMembresias
                      .filter(tipo => tipo.id === membresiaSeleccionada)
                      .map(tipo => (
                        <div key={tipo.id}>
                          <p className="text-sm text-gray-600 mb-2">{tipo.descripcion}</p>
                          <ul className="space-y-1 text-sm text-gray-600">
                            <li>• Proveedores: {
                              tipo.nombre === "Plan Gratuito" 
                                ? "Hasta 5" 
                                : (tipo.limite_proveedores ? tipo.limite_proveedores : 'Ilimitados')
                            }</li>
                            <li>• Artículos: {
                              tipo.nombre === "Plan Gratuito" 
                                ? "Hasta 20" 
                                : (tipo.limite_articulos ? tipo.limite_articulos : 'Ilimitados')
                            }</li>
                            <li>• Listas: {
                              tipo.nombre === "Plan Gratuito" 
                                ? "Hasta 3" 
                                : (tipo.limite_listas ? tipo.limite_listas : 'Ilimitadas')
                            }</li>
                            {tipo.tiene_ai && (
                              <li className="text-green-600">• Incluye funciones de IA</li>
                            )}
                            {!tipo.tiene_ai && (
                              <li className="text-amber-600">• Sin funciones de IA</li>
                            )}
                          </ul>
                        </div>
                      ))}
                  </div>
                )}
                
                {/* Duración personalizada */}
                <div>
                  <label htmlFor="duracion" className="block text-sm font-medium text-gray-700 mb-1">
                    Duración (meses)
                  </label>
                  <input
                    type="number"
                    id="duracion"
                    min="1"
                    max="60"
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={duracion}
                    onChange={(e) => setDuracion(parseInt(e.target.value) || 1)}
                  />
                  <p className="mt-1 text-xs text-gray-500">La membresía se asignará por esta duración.</p>
                </div>
                
                {/* Aviso importante */}
                <div className="border-l-4 border-amber-400 bg-amber-50 p-4 rounded-r-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-amber-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-amber-700">
                        Esto asignará directamente la membresía seleccionada al usuario, sin pasar por el proceso de pago.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setMostrarModalMembresia(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={asignarMembresia}
                    isLoading={asignandoMembresia}
                    disabled={asignandoMembresia || !membresiaSeleccionada}
                  >
                    Asignar membresía
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