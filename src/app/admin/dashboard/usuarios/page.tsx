// src/app/admin/dashboard/usuarios/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Usuario, Mensaje } from "@/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../auth";

import { MembershipService } from '@/lib/membership-service';

// Componente mejorado para mostrar información de membresía usando el servicio centralizado
const MembresiaInfo = ({ usuarioId }: { usuarioId: string }) => {
  const [membresia, setMembresia] = useState<any | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reparando, setReparando] = useState<boolean>(false);

  // Función para cargar la membresía
  const cargarMembresia = async () => {
    if (!usuarioId) return;
    
    setCargando(true);
    setError(null);
    
    try {
      console.log(`Cargando membresía para usuario: ${usuarioId}`);
      
      // Usar el servicio centralizado
      const membresiaActiva = await MembershipService.getActiveMembership(usuarioId);
      
      if (membresiaActiva) {
        console.log("Membresía activa encontrada:", membresiaActiva.id);
        setMembresia(membresiaActiva);
      } else {
        console.log("No se encontró membresía activa para el usuario");
        setMembresia(null);
      }
    } catch (err: any) {
      console.error("Error al cargar membresía:", err);
      setError(err.message || "Error desconocido");
    } finally {
      setCargando(false);
    }
  };
  
  // Función para reparar la membresía
  const repararMembresia = async () => {
    if (!usuarioId || reparando) return;
    
    setReparando(true);
    
    try {
      console.log(`Reparando membresía para usuario: ${usuarioId}`);
      
      // Usar el servicio de reparación
      const resultado = await MembershipService.fixMembership(usuarioId);
      
      if (resultado.success) {
        console.log("Membresía reparada exitosamente");
        
        // Recargar la membresía después de reparar
        await cargarMembresia();
      } else {
        console.error("Error al reparar membresía:", resultado.message);
        setError("Error al reparar: " + resultado.message);
      }
    } catch (err: any) {
      console.error("Error en reparación de membresía:", err);
      setError(err.message || "Error en reparación");
    } finally {
      setReparando(false);
    }
  };
  
  // Cargar la membresía al montar el componente
  useEffect(() => {
    cargarMembresia();
  }, [usuarioId]);
  
  // Estado de carga
  if (cargando) {
    return <span className="italic text-gray-500 text-xs">Cargando...</span>;
  }
  
  // Estado de error
  if (error) {
    return (
      <div className="flex items-center">
        <span className="text-red-600 text-xs" title={error}>Error</span>
        <button
          onClick={repararMembresia}
          disabled={reparando}
          className="ml-2 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Intentar reparar membresía"
        >
          {reparando ? '...' : '🔄'}
        </button>
      </div>
    );
  }
  
  // Sin membresía
  if (!membresia) {
    return (
      <div className="flex items-center">
        <span className="px-2 py-1 text-xs font-medium rounded-full text-gray-800 bg-gray-100">
          Sin membresía
        </span>
        <button
          onClick={repararMembresia}
          disabled={reparando}
          className="ml-2 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
          title="Verificar membresía"
        >
          {reparando ? '...' : '🔄'}
        </button>
      </div>
    );
  }
  
  // Mostrar membresía activa
  return (
    <div className="flex items-center">
      <span className="px-2 py-1 text-xs font-medium rounded-full text-green-800 bg-green-100">
        {membresia.tipo_membresia?.nombre || "Plan desconocido"}
      </span>
      <button
        onClick={repararMembresia}
        disabled={reparando}
        className="ml-2 text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
        title="Verificar membresía"
      >
        {reparando ? '...' : '✓'}
      </button>
    </div>
  );
};

export default function GestionUsuarios() {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [filtro, setFiltro] = useState("");
  const [tiposMembresia, setTiposMembresia] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [permisosVerificados, setPermisosVerificados] = useState(false);

  useEffect(() => {
    // Verificar permisos una sola vez
    if (!permisosVerificados) {
      const verificarPermisos = async () => {
        try {
          // Verificación exhaustiva de seguridad para la sección de usuarios
          const tieneAccesoAdmin = await verificarAccesoAdmin();
          
          if (!tieneAccesoAdmin) {
            setMensaje({
              texto: "No tienes permisos para acceder a esta página",
              tipo: "error"
            });
            setLoading(false);
            // Redireccionar al login de admin después de 3 segundos
            setTimeout(() => {
              window.location.href = "/admin";
            }, 3000);
            return;
          }
          
          // Usuario tiene permisos, cargar usuarios
          cargarUsuarios();
          setPermisosVerificados(true);
        } catch (error) {
          console.error("Error verificando permisos:", error);
          setMensaje({
            texto: "Error de autenticación. Serás redirigido al inicio de sesión.",
            tipo: "error"
          });
          // Redireccionar en caso de error
          setTimeout(() => {
            window.location.href = "/admin";
          }, 3000);
        }
      };
      
      verificarPermisos();
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin, permisosVerificados]);
  
  // Verificación exhaustiva de acceso administrativo
  const verificarAccesoAdmin = async (): Promise<boolean> => {
    try {
      // 1. Verificar si hay autenticación en el contexto de admin
      if (isAuthenticated) {
        return true;
      }
      
      // 2. Verificar si es un superadmin (administrador del sistema)
      if (isAdmin() || isSuperAdmin()) {
        return true;
      }
      
      // 3. Verificar cookies especiales de superadmin/emergencia
      if (document.cookie.includes('adminSuperAccess=granted') || 
          document.cookie.includes('adminEmergencyAccess=granted')) {
        return true;
      }
      
      // 4. Verificar email directamente con Supabase (última verificación)
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.email === 'luisocro@gmail.com') {
        return true;
      }
      
      // 5. Verificación adicional de tokens en almacenamiento
      if ((typeof sessionStorage !== 'undefined' && 
          (sessionStorage.getItem('adminAuth') || 
           sessionStorage.getItem('adminAccess') === 'granted')) ||
          (typeof localStorage !== 'undefined' && 
          (localStorage.getItem('adminAuth') || 
           localStorage.getItem('adminAccess') === 'granted'))) {
        return true;
      }
      
      // Si no pasa ninguna verificación, no tiene acceso
      console.log("Verificación de acceso admin fallida");
      return false;
    } catch (error) {
      console.error("Error en verificación de acceso admin:", error);
      return false;
    }
  };

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      
      // Verificar primero si hay conexión
      const { data: testData, error: testError } = await supabase
        .from("usuarios")
        .select("count", { count: "exact", head: true });
      
      if (testError) {
        console.error("Error al verificar conexión:", testError);
        throw new Error("Error de conexión a la base de datos: " + (testError.message || "Error desconocido"));
      }
      
      console.log("Test de conexión exitoso, procediendo a cargar usuarios");
      
      // SIMPLIFICADO: Solo consultamos los usuarios, el componente MembresiaInfo se encargará de mostrar la membresía
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("Error al cargar usuarios:", error);
        throw new Error(error.message || "Error al cargar datos");
      }
      
      // Cargar tipos de membresía para los filtros
      const { data: tiposMembresiaData } = await supabase
        .from("membresia_tipos")
        .select("id, nombre")
        .order("precio", { ascending: true });
        
      if (tiposMembresiaData) {
        setTiposMembresia(tiposMembresiaData);
      }
      
      // Simplemente asignamos los usuarios a la variable de estado
      setUsuarios(data || []);
    } catch (err) {
      console.error("Error detallado al cargar usuarios:", err);
      setMensaje({
        texto: `No se pudieron cargar los usuarios: ${err instanceof Error ? err.message : "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarUsuario = async (id: string) => {
    if (
      !window.confirm(
        "¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer y eliminará todos sus datos asociados."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar usuario (esto debería desencadenar eliminaciones en cascada para todos los datos del usuario)
      const { error } = await supabase.from("usuarios").delete().eq("id", id);

      if (error) throw error;

      // Actualizar la lista de usuarios
      setUsuarios(usuarios.filter((u) => u.id !== id));
      setMensaje({
        texto: "Usuario eliminado correctamente",
        tipo: "exito"
      });

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      setMensaje({
        texto: "No se pudo eliminar el usuario. Por favor, intenta nuevamente.",
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

  // Filtrar usuarios solo por texto (más simple)
  const usuariosFiltrados = usuarios.filter(
    (usuario) => 
      usuario.email.toLowerCase().includes(filtro.toLowerCase()) ||
      usuario.username.toLowerCase().includes(filtro.toLowerCase()) ||
      (usuario.nombre &&
        usuario.nombre.toLowerCase().includes(filtro.toLowerCase())) ||
      (usuario.apellidos &&
        usuario.apellidos.toLowerCase().includes(filtro.toLowerCase())) ||
      (usuario.empresa &&
        usuario.empresa.toLowerCase().includes(filtro.toLowerCase()))
  );

  // Paginación
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsuarios = usuariosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Gestión de Usuarios
        </h1>
        <Button href="/admin/dashboard/usuarios/nuevo">
          Crear nuevo usuario
        </Button>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      {/* Buscador simplificado */}
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
          <Input
            type="text"
            placeholder="Buscar usuarios..."
            className="pl-10"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value);
              setCurrentPage(1); // Resetear a la primera página al filtrar
            }}
          />
        </div>
        
        {/* Indicador de filtros activos */}
        {filtro && (
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-600">
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
            </div>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => {
                setFiltro("");
                setCurrentPage(1);
              }}
            >
              Limpiar filtro
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <Loading text="Cargando usuarios..." />
      ) : usuarios.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No hay usuarios registrados.</p>
            <Button href="/admin/dashboard/usuarios/nuevo">
              Crear primer usuario
            </Button>
          </div>
        </Card>
      ) : usuariosFiltrados.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">
              No se encontraron usuarios que coincidan con tu búsqueda.
            </p>
            <Button 
              variant="secondary" 
              className="mt-4"
              onClick={() => setFiltro("")}
            >
              Limpiar filtros
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Membresía
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentUsuarios.map((usuario) => (
                    <tr key={usuario.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-800 font-medium text-sm">
                              {usuario.username?.[0]?.toUpperCase() ||
                                usuario.email?.[0]?.toUpperCase() ||
                                "U"}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {usuario.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {usuario.nombre} {usuario.apellidos}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MembresiaInfo usuarioId={usuario.id} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatearFecha(usuario.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.empresa || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={`/admin/dashboard/usuarios/${usuario.id}`}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 mr-2"
                          onClick={(e) => {
                            e.preventDefault();
                            // Navegación manual para evitar problemas con rutas dinámicas
                            window.location.href = `/admin/dashboard/usuarios/${usuario.id}`;
                          }}
                        >
                          Ver perfil
                        </a>
                        <Button
                          href={`/admin/dashboard/usuarios/editar/${usuario.id}`}
                          variant="ghost"
                          size="sm"
                          className="mr-2"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleEliminarUsuario(usuario.id)}
                        >
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, usuariosFiltrados.length)}
                </span>{" "}
                de <span className="font-medium">{usuariosFiltrados.length}</span> usuarios
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
