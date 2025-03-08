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
import { useAdminAuth } from "../../../../auth.tsx";

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

  // Cargar datos del usuario
  const cargarDatosUsuario = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Iniciando carga de datos, userId:", userId);
      
      // 1. Primero cargamos los datos básicos del usuario
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error("Error al cargar datos básicos del usuario:", userError);
        throw userError;
      }
      
      console.log("Datos básicos del usuario cargados");
      
      // 2. Si el usuario tiene una membresía activa, cargamos esos datos en una consulta separada
      let membresia = null;
      if (userData.membresia_activa_id) {
        try {
          const { data: membresiaData, error: membresiaError } = await supabase
            .from("membresias_usuarios")
            .select("*")
            .eq("id", userData.membresia_activa_id)
            .single();
            
          if (!membresiaError && membresiaData) {
            membresia = membresiaData;
            console.log("Membresía activa cargada:", membresia.id);
          }
        } catch (membresiaErr) {
          console.warn("Error al cargar membresía activa:", membresiaErr);
          // Continuamos aunque no se pueda cargar la membresía
        }
      }
      
      // 3. Combinamos los datos
      setUsuario({
        ...userData,
        membresia_activa: membresia
      });
      
      console.log("Datos de usuario establecidos");
      
      // 4. Cargar tipos de membresías disponibles
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
      
      // 5. Si no hay membresía seleccionada y hay tipos disponibles, seleccionar la primera
      if (membresiasData && membresiasData.length > 0 && !membresiaSeleccionada) {
        console.log("Seleccionando membresía por defecto:", membresiasData[0].id);
        setMembresiaSeleccionada(membresiasData[0].id);
      }
      
      console.log("Carga de datos completada con éxito");
    } catch (err) {
      console.error("Error detallado al cargar datos:", err);
      setMensaje({
        texto: "No se pudieron cargar los datos necesarios. Revisa la consola para más detalles.",
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
          // Verificar si es admin o superadmin
          if (isAuthenticated || isAdmin() || isSuperAdmin()) {
            // Tiene permisos, cargar datos
            await cargarDatosUsuario();
            setPermisosVerificados(true);
            return;
          }
          
          // Sin permisos
          setMensaje({
            texto: "No tienes permisos para acceder a esta página",
            tipo: "error"
          });
          setLoading(false);
          setPermisosVerificados(true);
        } catch (error) {
          console.error("Error al verificar acceso:", error);
          setMensaje({
            texto: "Error al verificar permisos",
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

  // Asignar nueva membresía
  const asignarMembresia = async () => {
    if (!membresiaSeleccionada || !usuario) return;
    
    setProcesando(true);
    setMensaje(null);
    
    try {
      // Obtener detalles del tipo de membresía seleccionada
      const tipoMembresia = tiposMembresias.find(tm => tm.id === membresiaSeleccionada);
      if (!tipoMembresia) {
        throw new Error("Tipo de membresía no encontrado");
      }
      
      // Calcular fechas
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + duracion);
      
      console.log(`Asignando membresía ${tipoMembresia.nombre} por ${duracion} meses`);
      
      // 0. Primero desactivamos todas las membresías activas del usuario
      console.log("Desactivando membresías activas anteriores...");
      const { error: desactivarError } = await supabase
        .from("membresias_usuarios")
        .update({ estado: "inactiva" })
        .eq("usuario_id", userId)
        .eq("estado", "activa");
        
      if (desactivarError) {
        console.warn("Error al desactivar membresías anteriores:", desactivarError);
        // Continuamos aunque haya error, no es crítico
      } else {
        console.log("Membresías anteriores desactivadas correctamente");
      }
      
      // 1. Crear registro de membresía
      console.log("Creando registro de membresía con:", {
        usuario_id: userId,
        tipo_membresia_id: membresiaSeleccionada,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin.toISOString(),
        estado: "activa"
      });
      
      const { data: membresia, error: membresiaError } = await supabase
        .from("membresias_usuarios")
        .insert({
          usuario_id: userId,
          tipo_membresia_id: membresiaSeleccionada,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin.toISOString(),
          estado: "activa"
        })
        .select()
        .single();
        
      if (membresiaError) {
        console.error("Error al insertar membresía:", membresiaError);
        throw new Error(membresiaError.message || "Error al crear la membresía");
      }
      
      if (!membresia) {
        throw new Error("No se pudo crear la membresía: no se devolvieron datos");
      }
      
      console.log("Membresía creada correctamente:", membresia);
      
      // 2. Actualizar el usuario para establecer esta membresía como la activa
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ membresia_activa_id: membresia.id })
        .eq("id", userId);
        
      if (updateError) {
        console.error("Error al actualizar usuario con membresía:", updateError);
        throw new Error(updateError.message || "Error al actualizar el usuario");
      }
      
      // Notificar al usuario por email - ahora lo hacemos mediante una API
      if (usuario.email) {
        try {
          console.log("Enviando notificación por email...");
          
          // Obtenemos la sesión para incluir el token
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            throw new Error("No se pudo obtener la sesión");
          }
          
          // Enviamos la notificación a través de la API
          const response = await fetch('/api/notify-membership', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: usuario.email,
              nombre: usuario.nombre || usuario.username || "Usuario",
              tipoMembresia: tipoMembresia.nombre,
              fechaExpiracion: fechaFin.toISOString(),
              token: session.access_token,
            }),
          });
          
          const result = await response.json();
          
          if (response.ok && result.success) {
            console.log("Email enviado correctamente");
          } else {
            console.warn("No se pudo enviar el email de notificación:", result.error || "Error desconocido");
          }
        } catch (emailError) {
          console.error("Error al enviar notificación por email:", emailError);
          // No interrumpimos el flujo si falla el email
        }
      }
      
      setMensaje({
        texto: `Membresía ${tipoMembresia.nombre} asignada correctamente`,
        tipo: "success"
      });
      
      // Recargar datos
      await cargarDatosUsuario();
      
      // Redireccionar después de 1.5 segundos
      setTimeout(() => {
        router.push(`/admin/dashboard/usuarios/${userId}`);
      }, 1500);
    } catch (err: any) {
      console.error("Error al asignar membresía:", err);
      setMensaje({
        texto: `Error al asignar membresía: ${err.message || JSON.stringify(err)}`,
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
                      usuario.membresia_activa.membresia_id ? 
                        usuario.membresia_activa.membresia_id.substring(0, 8) + "..." :
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
                        <li>• Proveedores: {tipo.limite_proveedores ? tipo.limite_proveedores : 'Ilimitados'}</li>
                        <li>• Artículos: {tipo.limite_articulos ? tipo.limite_articulos : 'Ilimitados'}</li>
                        <li>• Listas: {tipo.limite_listas ? tipo.limite_listas : 'Ilimitadas'}</li>
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