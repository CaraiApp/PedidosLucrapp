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

export default function GestionUsuarios() {
  const { isAdmin, isSuperAdmin, user } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [filtro, setFiltro] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [permisosVerificados, setPermisosVerificados] = useState(false);

  useEffect(() => {
    // Verificar permisos una sola vez
    if (!permisosVerificados) {
      const verificarPermisos = async () => {
        // Si el usuario está autenticado como admin en la sesión de admin O
        // es un superadmin en la sesión normal, tiene acceso
        const tieneAcceso = isAuthenticated || isAdmin() || isSuperAdmin();
        
        if (!tieneAcceso) {
          setMensaje({
            texto: "No tienes permisos para acceder a esta página",
            tipo: "error"
          });
          setLoading(false);
        } else {
          // Usuario tiene permisos, cargar usuarios
          cargarUsuarios();
        }
        
        setPermisosVerificados(true);
      };
      
      verificarPermisos();
    }
  }, [isAuthenticated, isAdmin, isSuperAdmin, permisosVerificados]);

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
      
      // Realizar la consulta simplificada primero para evitar referencias complejas
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error en consulta principal:", error);
        throw new Error(error.message || "Error al cargar datos");
      }

      // Obtener membresías en una segunda consulta si es necesario
      if (data && data.length > 0) {
        try {
          // Aquí podrías cargar membresías por separado si necesitas esa información
          // Por ahora simplemente usamos los datos básicos
          console.log(`Cargados ${data.length} usuarios correctamente`);
        } catch (membresiaErr) {
          console.warn("Error al cargar membresías:", membresiaErr);
          // Continuamos con los datos básicos
        }
      }

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

  // Filtrar usuarios
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

      {/* Buscador */}
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
                        {usuario.membresia_activa_id ? (
                          <div>
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Plan activo
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {usuario.membresia_activa_id.substring(0, 8)}...
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Sin membresía
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatearFecha(usuario.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {usuario.empresa || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          href={`/admin/dashboard/usuarios/${usuario.id}`}
                          variant="ghost"
                          size="sm"
                          className="mr-2"
                        >
                          Ver perfil
                        </Button>
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
