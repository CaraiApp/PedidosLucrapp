"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../auth";
import { Usuario, Mensaje } from "@/types";

export default function Comunicaciones() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  
  // Estados
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<string[]>([]);
  const [asunto, setAsunto] = useState("");
  const [contenido, setContenido] = useState("");
  const [filtroTipoMembresia, setFiltroTipoMembresia] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [permisosVerificados, setPermisosVerificados] = useState(false);
  
  // Verificar permisos y cargar datos
  useEffect(() => {
    if (!permisosVerificados) {
      const verificarAcceso = async () => {
        try {
          // Verificar si es admin o superadmin en Supabase
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            throw new Error("Error al obtener sesión");
          }
          
          if (!session || !session.user) {
            setMensaje({
              texto: "No has iniciado sesión",
              tipo: "error"
            });
            setLoading(false);
            setPermisosVerificados(true);
            return;
          }
          
          // Verificar explícitamente el rol del usuario en la base de datos
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('rol, id, email')
            .eq('id', session.user.id)
            .single();
            
          if (userError) {
            console.error("Error al verificar rol:", userError);
            throw new Error("Error al verificar permisos");
          }
          
          console.log("Rol del usuario:", userData?.rol);
          
          // Verificar que el usuario tiene rol de admin o superadmin
          if (!userData || (userData.rol !== 'admin' && userData.rol !== 'superadmin')) {
            setMensaje({
              texto: `No tienes permisos de administrador. Tu rol actual es: ${userData?.rol || 'sin rol'}`,
              tipo: "error"
            });
            setLoading(false);
            setPermisosVerificados(true);
            return;
          }
          
          console.log("Usuario verificado como administrador:", userData.email);
          
          // Marcar al usuario como verificado y cargar datos
          await cargarUsuarios();
          setPermisosVerificados(true);
        } catch (error: any) {
          console.error("Error al verificar acceso:", error);
          setMensaje({
            texto: `Error al verificar permisos: ${error.message || "Error desconocido"}`,
            tipo: "error"
          });
          setLoading(false);
          setPermisosVerificados(true);
        }
      };
      
      verificarAcceso();
    }
  }, [permisosVerificados]);
  
  // Cargar datos de usuarios
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      
      // Cargar usuarios con información de membresía
      const { data, error } = await supabase
        .from("usuarios")
        .select(`
          *,
          membresia_activa:membresias_usuarios(*, tipo_membresia:membresia_tipos(*))
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Procesar datos
      const usuariosProcesados = data.map(usuario => ({
        ...usuario,
        membresia_activa: usuario.membresia_activa?.[0] || null
      }));
      
      setUsuarios(usuariosProcesados);
      console.log("Usuarios cargados:", usuariosProcesados.length);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      setMensaje({
        texto: "Error al cargar usuarios",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Filtrar usuarios según el tipo de membresía
  const usuariosFiltrados = () => {
    if (filtroTipoMembresia === "todos") {
      return usuarios;
    } else if (filtroTipoMembresia === "sin_membresia") {
      return usuarios.filter(u => !u.membresia_activa);
    } else {
      return usuarios.filter(u => 
        u.membresia_activa?.tipo_membresia?.id === filtroTipoMembresia
      );
    }
  };
  
  // Seleccionar/deseleccionar todos los usuarios
  const seleccionarTodos = () => {
    if (usuariosSeleccionados.length === usuariosFiltrados().length) {
      setUsuariosSeleccionados([]);
    } else {
      setUsuariosSeleccionados(usuariosFiltrados().map(u => u.id));
    }
  };
  
  // Manejar selección de un usuario
  const toggleUsuario = (id: string) => {
    if (usuariosSeleccionados.includes(id)) {
      setUsuariosSeleccionados(prev => prev.filter(uid => uid !== id));
    } else {
      setUsuariosSeleccionados(prev => [...prev, id]);
    }
  };
  
  // Enviar correo a los usuarios seleccionados
  const enviarCorreo = async () => {
    if (usuariosSeleccionados.length === 0) {
      setMensaje({
        texto: "Debes seleccionar al menos un usuario",
        tipo: "error"
      });
      return;
    }
    
    if (!asunto || !contenido) {
      setMensaje({
        texto: "Debes completar el asunto y el contenido del mensaje",
        tipo: "error"
      });
      return;
    }
    
    setEnviando(true);
    setMensaje(null);
    
    try {
      // Obtener la sesión actual para obtener el token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("No se pudo obtener la sesión");
      }
      
      // Ya hemos verificado los permisos de administrador en useEffect, 
      // por lo que no es necesario volver a verificar aquí.
      // Esto evita posibles inconsistencias entre diferentes verificaciones
      
      console.log("Enviando correos como administrador verificado");
      
      // Obtener los usuarios seleccionados
      const usuariosParaEnviar = usuarios.filter(u => 
        usuariosSeleccionados.includes(u.id) && u.email
      );
      
      console.log("Enviando correos a", usuariosParaEnviar.length, "usuarios...");
      
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
      
      // Enviar a cada usuario (en paralelo)
      const resultados = await Promise.all(
        usuariosParaEnviar.map(async (usuario) => {
          try {
            console.log("Enviando correo a:", usuario.email);
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
              console.error("Error al enviar correo a", usuario.email, ":", result);
              return {
                usuario: usuario.email,
                exito: false,
                error: result.error || "Error desconocido",
                detalles: result.details || "",
                resultado: result
              };
            }
            
            return {
              usuario: usuario.email,
              exito: true,
              resultado: result
            };
          } catch (error: any) {
            console.error("Error en petición para", usuario.email, ":", error);
            return {
              usuario: usuario.email,
              exito: false,
              error: error.message || "Error en la petición",
              resultado: null
            };
          }
        })
      );
      
      // Calcular estadísticas
      const exitosos = resultados.filter(r => r.exito).length;
      const fallidos = resultados.length - exitosos;
      
      // Si hay algún error común, mostrarlo
      const errorComun = resultados.find(r => !r.exito && r.error)?.error;
      
      if (fallidos > 0 && errorComun) {
        setMensaje({
          texto: `Error al enviar correos: ${errorComun}. Exitosos: ${exitosos}, Fallidos: ${fallidos}`,
          tipo: "error"
        });
      } else {
        setMensaje({
          texto: `Correos enviados: ${exitosos} exitosos, ${fallidos} fallidos de un total de ${resultados.length}`,
          tipo: fallidos > 0 ? "advertencia" : "success"
        });
      }
      
      console.log("Resultados de envío:", resultados);
      
      // Limpiar formulario si todo OK
      if (fallidos === 0) {
        setAsunto("");
        setContenido("");
        setUsuariosSeleccionados([]);
      }
    } catch (error: any) {
      console.error("Error al enviar correos:", error);
      setMensaje({
        texto: `Error al enviar correos: ${error.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setEnviando(false);
    }
  };
  
  // Enviar notificación push a los usuarios seleccionados
  const enviarNotificacionPush = async () => {
    if (usuariosSeleccionados.length === 0) {
      setMensaje({
        texto: "Debes seleccionar al menos un usuario",
        tipo: "error"
      });
      return;
    }
    
    if (!asunto || !contenido) {
      setMensaje({
        texto: "Debes completar el asunto y el contenido del mensaje",
        tipo: "error"
      });
      return;
    }
    
    setEnviando(true);
    setMensaje(null);
    
    try {
      // Obtener la sesión actual para obtener el token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("No se pudo obtener la sesión");
      }
      
      // Enviar la notificación push
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarios: usuariosSeleccionados,
          titulo: asunto,
          contenido: contenido,
          url: '/dashboard', // URL a la que se redirigirá al hacer clic en la notificación
          token: session.access_token,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Error al enviar la notificación");
      }
      
      // Notificaciones enviadas con éxito
      setMensaje({
        texto: `Notificaciones: ${result.enviadas} enviadas, ${result.fallidas} fallidas de un total de ${result.total}`,
        tipo: result.fallidas > 0 ? "advertencia" : "success"
      });
      
      console.log("Resultados de notificaciones push:", result);
      
      // Limpiar formulario si todo OK
      if (result.fallidas === 0) {
        setAsunto("");
        setContenido("");
        setUsuariosSeleccionados([]);
      }
    } catch (error: any) {
      console.error("Error al enviar notificaciones push:", error);
      setMensaje({
        texto: `Error al enviar notificaciones: ${error.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setEnviando(false);
    }
  };
  
  if (loading) {
    return <Loading text="Cargando datos..." />;
  }
  
  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Comunicaciones
        </h1>
      </div>
      
      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de usuarios */}
        <Card className="lg:col-span-1">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Usuarios</h2>
            <span className="text-sm text-gray-500">
              {usuariosSeleccionados.length} / {usuariosFiltrados().length}
            </span>
          </div>
          
          <div className="mb-4">
            <label htmlFor="filtro" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por membresía
            </label>
            <select
              id="filtro"
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={filtroTipoMembresia}
              onChange={(e) => {
                setFiltroTipoMembresia(e.target.value);
                setUsuariosSeleccionados([]);
              }}
            >
              <option value="todos">Todos los usuarios</option>
              <option value="sin_membresia">Sin membresía activa</option>
              {/* Aquí deberíamos agregar opciones dinámicas por cada tipo de membresía */}
              <option value="basic">Membresía Básica</option>
              <option value="pro">Membresía Pro</option>
              <option value="premium">Membresía Premium</option>
            </select>
          </div>
          
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={seleccionarTodos}
              className="w-full"
            >
              {usuariosSeleccionados.length === usuariosFiltrados().length
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </Button>
          </div>
          
          <div className="max-h-96 overflow-y-auto border rounded-md">
            {usuariosFiltrados().length === 0 ? (
              <p className="text-center py-4 text-gray-500">No hay usuarios con este filtro</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {usuariosFiltrados().map(usuario => (
                  <li key={usuario.id} className="flex items-center py-2 px-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                      checked={usuariosSeleccionados.includes(usuario.id)}
                      onChange={() => toggleUsuario(usuario.id)}
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {usuario.username || usuario.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {usuario.email}
                      </p>
                    </div>
                    <div className="ml-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        usuario.membresia_activa ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {usuario.membresia_activa?.tipo_membresia?.nombre || "Sin membresía"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        
        {/* Formulario de mensaje */}
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Mensaje</h2>
          
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
                placeholder="Asunto del mensaje"
              />
            </div>
            
            <div>
              <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-1">
                Contenido
              </label>
              <textarea
                id="contenido"
                rows={10}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Escribe el contenido del mensaje..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Puedes usar saltos de línea para separar párrafos.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              {/* El botón de notificaciones tiene un tooltip para explicar su estado */}
              <div className="group relative inline-block">
                <Button
                  variant="outline"
                  onClick={enviarNotificacionPush}
                  disabled={true} // Deshabilitado temporalmente
                >
                  Enviar notificación push
                </Button>
                <div className="absolute z-10 w-64 p-2 -mt-1 text-sm bg-black text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none transform -translate-y-full left-0 top-0">
                  Requiere activar el servicio de notificaciones y verificar un dominio HTTPS.
                </div>
              </div>
              <Button
                onClick={enviarCorreo}
                isLoading={enviando}
                disabled={enviando || usuariosSeleccionados.length === 0 || !asunto || !contenido}
              >
                Enviar correo electrónico
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}