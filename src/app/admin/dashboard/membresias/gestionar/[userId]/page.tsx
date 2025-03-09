// src/app/admin/dashboard/membresias/gestionar/[userId]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Usuario, TipoMembresia, Mensaje } from "@/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../../../auth";

export default function GestionarMembresia() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  // Estados
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [tiposMembresias, setTiposMembresias] = useState<TipoMembresia[]>([]);
  const [membresiaSeleccionada, setMembresiaSeleccionada] = useState<string>("");
  const [duracion, setDuracion] = useState<number>(12); // 12 meses por defecto
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [permisosVerificados, setPermisosVerificados] = useState(false);

  // Cargar datos del usuario - Versión robusta y optimizada
  const cargarDatosUsuario = useCallback(async () => {
    try {
      setLoading(true);
      console.log("===== INICIANDO CARGA DE DATOS EN GESTIÓN DE MEMBRESÍAS =====");
      console.log("ID de usuario:", userId);
      
      // PASO 1: Primero cargamos datos básicos del usuario
      console.log("Cargando datos básicos del usuario...");
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error al cargar datos básicos del usuario:", userError);
        throw userError;
      }
      
      console.log("Datos básicos del usuario cargados correctamente");
      
      // PASO 2: Obtener membresía activa actual mediante consulta directa
      // Esta consulta es más confiable que confiar solo en membresia_activa_id
      console.log("Buscando membresía activa por estado...");
      const { data: membresiaActiva, error: membresiaActivaError } = await supabase
        .from("membresias_usuarios")
        .select(`
          *,
          tipo_membresia:membresia_tipos(*)
        `)
        .eq("usuario_id", userId)
        .eq("estado", "activa")
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();  // No lanza error si no hay resultados
        
      if (membresiaActivaError) {
        console.error("Error al buscar membresía activa:", membresiaActivaError);
      } else if (membresiaActiva) {
        console.log("Membresía activa encontrada:", membresiaActiva.id);
      } else {
        console.log("No se encontró membresía activa por estado");
      }
      
      // PASO 3: Como respaldo, verificar usando el ID almacenado en el usuario
      let membresiaPorId = null;
      if (userData.membresia_activa_id) {
        console.log("Buscando membresía por ID referenciado:", userData.membresia_activa_id);
        
        const { data: membresiaDatos, error: membresiaIdError } = await supabase
          .from("membresias_usuarios")
          .select(`
            *,
            tipo_membresia:membresia_tipos(*)
          `)
          .eq("id", userData.membresia_activa_id)
          .maybeSingle();
          
        if (membresiaIdError) {
          console.error("Error al buscar membresía por ID:", membresiaIdError);
        } else if (membresiaDatos) {
          console.log("Membresía encontrada por ID referenciado:", membresiaDatos.id);
          membresiaPorId = membresiaDatos;
        } else {
          console.log("No se encontró membresía por ID referenciado");
        }
      }
      
      // PASO 4: Resolver y corregir inconsistencias
      let membresiaFinal = null;
      
      // Si encontramos una membresía activa por estado, esa tiene prioridad
      if (membresiaActiva) {
        membresiaFinal = membresiaActiva;
        
        // Si el ID en usuario no coincide, actualizar referencia
        if (userData.membresia_activa_id !== membresiaActiva.id) {
          console.log("Actualizando ID de membresía activa en usuario...");
          
          // Actualizar referencia en base de datos
          const { error: updateError } = await supabase
            .from("usuarios")
            .update({ membresia_activa_id: membresiaActiva.id })
            .eq("id", userId);
            
          if (updateError) {
            console.error("Error actualizando referencia:", updateError);
          } else {
            console.log("Referencia actualizada correctamente");
            // Actualizar también en memoria
            userData.membresia_activa_id = membresiaActiva.id;
          }
        }
      }
      // Si no hay membresía activa por estado pero hay una referenciada, revisamos
      else if (membresiaPorId) {
        // Si la membresía referenciada no está activa, la activamos
        if (membresiaPorId.estado !== 'activa') {
          console.log("Activando membresía referenciada...");
          
          const { error: activateError } = await supabase
            .from("membresias_usuarios")
            .update({ estado: 'activa' })
            .eq("id", membresiaPorId.id);
            
          if (activateError) {
            console.error("Error activando membresía:", activateError);
          } else {
            console.log("Membresía activada correctamente");
            membresiaPorId.estado = 'activa';
          }
        }
        
        membresiaFinal = membresiaPorId;
      }
      // Si no hay membresía válida pero hay referencia, limpiar
      else if (userData.membresia_activa_id) {
        console.log("Limpiando referencia inválida de membresía...");
        
        const { error: clearError } = await supabase
          .from("usuarios")
          .update({ membresia_activa_id: null })
          .eq("id", userId);
          
        if (clearError) {
          console.error("Error limpiando referencia:", clearError);
        } else {
          console.log("Referencia limpiada correctamente");
          userData.membresia_activa_id = null;
        }
      }
      
      // PASO 5: Guardar usuario con membresía resuelta
      const usuarioCompleto = {
        ...userData,
        membresia_activa: membresiaFinal
      };
      
      setUsuario(usuarioCompleto);
      console.log("Datos de usuario establecidos correctamente");
      
      // PASO 6: Cargar tipos de membresías disponibles (independiente de la membresía del usuario)
      console.log("Cargando tipos de membresías disponibles...");
      const { data: membresiasData, error: membresiasError } = await supabase
        .from("membresia_tipos")
        .select("*")
        .order("precio", { ascending: true });
        
      if (membresiasError) {
        console.error("Error al cargar tipos de membresías:", membresiasError);
        throw membresiasError;
      }
      
      console.log(`Cargados ${membresiasData?.length || 0} tipos de membresía`);
      setTiposMembresias(membresiasData || []);
      
      // Seleccionar tipo de membresía por defecto si no hay seleccionada
      if (membresiasData && membresiasData.length > 0 && !membresiaSeleccionada) {
        console.log("Seleccionando membresía por defecto:", membresiasData[0].id);
        setMembresiaSeleccionada(membresiasData[0].id);
      }
      
      console.log("===== CARGA DE DATOS COMPLETADA =====");
    } catch (err) {
      console.error("Error general al cargar datos:", err);
      setMensaje({
        texto: "No se pudieron cargar los datos necesarios. Por favor, intenta de nuevo.",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [userId, membresiaSeleccionada]);
  
  // Verificar permisos y cargar datos
  useEffect(() => {
    if (!permisosVerificados) {
      const verificarAcceso = async () => {
        try {
          console.log("Verificando acceso para gestión de membresías:");
          console.log("- isAuthenticated:", isAuthenticated);
          console.log("- isSuperAdmin:", isSuperAdmin ? isSuperAdmin() : false);
          console.log("- isAdmin:", isAdmin ? isAdmin() : false);
          
          // Siempre cargar datos y conceder acceso - la seguridad ya está en el middleware
          console.log("Concediendo acceso y cargando datos del usuario");
          await cargarDatosUsuario();
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
  }, [permisosVerificados, isAuthenticated, isAdmin, isSuperAdmin, cargarDatosUsuario]);

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    return new Date(fechaStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Asignar nueva membresía - versión mejorada y robusta
  const asignarMembresia = async () => {
    if (!membresiaSeleccionada || !usuario) {
      setMensaje({
        texto: "Datos incompletos. No se puede asignar la membresía.",
        tipo: "error"
      });
      return;
    }
    
    setProcesando(true);
    setMensaje(null);
    
    try {
      console.log("===== INICIANDO PROCESO DE ASIGNACIÓN DE MEMBRESÍA =====");
      console.log("Usuario ID:", userId);
      
      // PASO 1: Obtener detalles del tipo de membresía seleccionada
      const tipoMembresia = tiposMembresias.find(tm => tm.id === membresiaSeleccionada);
      if (!tipoMembresia) {
        throw new Error("Tipo de membresía no encontrado");
      }
      
      console.log(`Asignando membresía: ${tipoMembresia.nombre} (ID: ${tipoMembresia.id})`);
      console.log(`Duración: ${duracion} meses`);
      
      // PASO 2: Calcular fechas con precisión
      const fechaInicio = new Date();
      const fechaInicioISO = fechaInicio.toISOString();
      
      const fechaFin = new Date(fechaInicio);
      fechaFin.setMonth(fechaFin.getMonth() + duracion);
      const fechaFinISO = fechaFin.toISOString();
      
      console.log(`Fecha inicio: ${fechaInicioISO}`);
      console.log(`Fecha fin: ${fechaFinISO}`);
      
      // PASO 3: Primero desactivamos TODAS las membresías activas del usuario
      console.log("Desactivando membresías activas anteriores...");
      
      // Usamos la API para evitar problemas de RLS
      const desactivarResponse = await fetch('/api/update-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          operation: 'deactivate-all'
        }),
      });
      
      const desactivarResult = await desactivarResponse.json();
      
      if (!desactivarResponse.ok) {
        console.warn("Error al desactivar membresías anteriores:", desactivarResult.error);
        // Continuamos aunque haya error, no es crítico
      } else {
        console.log("Membresías anteriores desactivadas correctamente");
      }
      
      // PASO 4: Crear nueva membresía usando la API
      console.log("Creando nueva membresía...");
      
      // Datos para la nueva membresía
      const nuevaMembresiaData = {
        userId: userId,
        tipoMembresiaId: membresiaSeleccionada,
        fechaInicio: fechaInicioISO,
        fechaFin: fechaFinISO,
        estado: "activa"
      };
      
      console.log("Datos para nueva membresía:", nuevaMembresiaData);
      
      // Usar la API de creación de membresía
      const crearResponse = await fetch('/api/create-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nuevaMembresiaData),
      });
      
      const crearResult = await crearResponse.json();
      
      if (!crearResponse.ok || !crearResult.success) {
        console.error("Error al crear membresía:", crearResult.error);
        throw new Error(crearResult.error || "Error al crear la membresía. Consulta con el administrador.");
      }
      
      const membresiaNueva = crearResult.membresia;
      console.log("Membresía creada correctamente:", membresiaNueva);
      
      // PASO 5: Actualizar el campo membresia_activa_id en el usuario
      console.log("Actualizando referencia de membresía en usuario...");
      
      const updateUserResponse = await fetch('/api/update-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          operation: 'update-reference',
          membresiaId: membresiaNueva.id
        }),
      });
      
      const updateUserResult = await updateUserResponse.json();
      
      if (!updateUserResponse.ok) {
        console.warn("Error al actualizar referencia en usuario:", updateUserResult.error);
        // No es crítico para continuar
      } else {
        console.log("Referencia de membresía actualizada correctamente");
      }
      
      // PASO 6: Notificar al usuario por email
      if (usuario.email) {
        try {
          console.log("Enviando notificación por email...");
          
          // Obtener sesión para el token
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            throw new Error("No se pudo obtener la sesión");
          }
          
          // Enviar notificación
          const notifyResponse = await fetch('/api/notify-membership', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: usuario.email,
              nombre: usuario.nombre || usuario.username || "Usuario",
              tipoMembresia: tipoMembresia.nombre,
              fechaExpiracion: fechaFinISO,
              token: session.access_token,
            }),
          });
          
          const notifyResult = await notifyResponse.json();
          
          if (notifyResponse.ok && notifyResult.success) {
            console.log("Email de notificación enviado correctamente");
          } else {
            console.warn("No se pudo enviar email de notificación:", notifyResult.error);
          }
        } catch (emailError) {
          console.error("Error al enviar notificación por email:", emailError);
          // No interrumpir el flujo por error de email
        }
      }
      
      // PASO 7: Mostrar mensaje de éxito y redireccionar
      console.log("Proceso completado con éxito");
      setMensaje({
        texto: `Membresía ${tipoMembresia.nombre} asignada correctamente.`,
        tipo: "success"
      });
      
      // Recargar datos del usuario para ver el cambio
      await cargarDatosUsuario();
      
      // Redireccionar después de un tiempo
      console.log("Redireccionando a perfil de usuario en 2 segundos...");
      setTimeout(() => {
        router.push(`/admin/dashboard/usuarios/${userId}`);
      }, 2000);
      
      console.log("===== PROCESO DE ASIGNACIÓN FINALIZADO =====");
    } catch (err: any) {
      console.error("Error crítico asignando membresía:", err);
      setMensaje({
        texto: `Error al asignar membresía: ${err.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return <Loading text="Cargando información..." />;
  }

  if (!usuario) {
    return (
      <div className="p-4">
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
          Gestionar Membresía
        </h1>
        <Button 
          href={`/admin/dashboard/usuarios/${userId}`}
          variant="secondary"
        >
          Volver al perfil
        </Button>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información del usuario */}
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Información del usuario</h2>
          
          <div className="flex items-center mb-4">
            <div className="h-16 w-16 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-medium text-indigo-800">
                {usuario.username?.[0]?.toUpperCase() || usuario.email?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{usuario.username}</h3>
              <p className="text-sm text-gray-500">{usuario.email}</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-md font-medium text-gray-900 mb-2">Membresía actual</h3>
            
            {usuario.membresia_activa ? (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="mb-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Activa
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">ID: </span> 
                  <span className="font-mono">{usuario.membresia_activa.id.substring(0, 8)}...</span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Tipo: </span> 
                  <span className="font-mono">
                    {usuario.membresia_activa.tipo_membresia_id ? 
                      usuario.membresia_activa.tipo_membresia_id.substring(0, 8) + "..." :
                      "ID no disponible"}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Inicio: </span> 
                  {usuario.membresia_activa.fecha_inicio ? 
                    formatearFecha(usuario.membresia_activa.fecha_inicio) : 
                    "No disponible"}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Vencimiento: </span> 
                  {usuario.membresia_activa.fecha_fin ? 
                    formatearFecha(usuario.membresia_activa.fecha_fin) : 
                    "No disponible"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Sin membresía activa</p>
            )}
          </div>
        </Card>

        {/* Formulario de asignación de membresía */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Asignar nueva membresía</h2>
          
          <div className="space-y-6">
            {/* Selección de tipo de membresía */}
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
                        {tipo.nombre === "Plan Gratuito" && (
                          <li className="text-amber-600">• Sin soporte para escaneo de documentos</li>
                        )}
                        {tipo.nombre !== "Plan Gratuito" && (
                          <li className="text-green-600">• Soporte técnico prioritario</li>
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
              <p className="mt-1 text-sm text-gray-500">La membresía se asignará por esta duración.</p>
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
            
            {/* Botones de acción */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => router.push(`/admin/dashboard/usuarios/${userId}`)}
              >
                Cancelar
              </Button>
              <Button
                onClick={asignarMembresia}
                isLoading={procesando}
                disabled={procesando}
              >
                Asignar membresía
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}