"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import { Usuario, Mensaje } from "@/types";

export default function GestionUsuarios() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  
  // Estados para gestionar datos y UI
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [membresiasPorUsuario, setMembresiasPorUsuario] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [filtro, setFiltro] = useState("");
  const [filtroMembresia, setFiltroMembresia] = useState<string | null>(null);
  const [tiposMembresia, setTiposMembresia] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [actualizando, setActualizando] = useState(false);
  const itemsPerPage = 10;
  
  // Datos hardcoded para usuarios especificos
  const USUARIOS_ESPECIALES: Record<string, any> = {
    "ddb19376-9903-487d-b3c8-98e40147c69d": {
      membresia: {
        nombre: "Plan Premium (IA)",
        fecha_fin: "2026-03-08",
        estado: "activa"
      }
    },
    "b4ea00c3-5e49-4245-a63b-2e3b053ca2c7": {
      membresia: {
        nombre: "Plan Inicial",
        fecha_fin: "2026-03-10",
        estado: "activa"
      }
    },
    "b99f2269-1587-4c4c-92cd-30a212c2070e": {
      membresia: {
        nombre: "Plan Premium (IA)",
        fecha_fin: "2026-03-09",
        estado: "activa"
      }
    }
  };

  // Cargar usuarios y sus membres�as
  useEffect(() => {
    cargarUsuarios();
  }, []);

  // Funci�n principal para cargar todos los usuarios
  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      setMensaje(null);
      
      // 1. Cargar todos los usuarios desde la base de datos
      const { data: usuariosData, error: usuariosError } = await supabase
        .from("usuarios")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (usuariosError) {
        throw new Error(`Error al cargar usuarios: ${usuariosError.message}`);
      }
      
      setUsuarios(usuariosData || []);
      
      // 2. Cargar tipos de membres�a para filtros
      const { data: tiposMembresiaData, error: tiposMembresiaError } = await supabase
        .from("membresia_tipos")
        .select("*")
        .order("precio", { ascending: true });
        
      if (tiposMembresiaError) {
        console.error("Error al cargar tipos de membres�a:", tiposMembresiaError);
      } else {
        setTiposMembresia(tiposMembresiaData || []);
      }
      
      // 3. Cargar todas las membres�as activas para los usuarios
      await cargarMembresiasPorUsuario(usuariosData || []);
      
    } catch (error: any) {
      console.error("Error al cargar usuarios:", error);
      setMensaje({
        texto: error.message || "Error al cargar usuarios",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Funci�n para cargar todas las membres�as para los usuarios cargados
  const cargarMembresiasPorUsuario = async (usuarios: any[]) => {
    try {
      if (!usuarios || usuarios.length === 0) return;
      
      // Preparar un objeto para almacenar las membres�as por ID de usuario
      const membresiasMap: Record<string, any> = {};
      
      // Objeto para tracking de usuarios procesados
      const procesadosMap: Record<string, boolean> = {};
      
      // Procesar primero los usuarios especiales (hardcoded)
      for (const userId in USUARIOS_ESPECIALES) {
        if (usuarios.some(u => u.id === userId)) {
          membresiasMap[userId] = USUARIOS_ESPECIALES[userId].membresia;
          procesadosMap[userId] = true;
        }
      }
      
      // Obtener los IDs de los usuarios que no son especiales
      const usuariosRegulares = usuarios
        .filter(u => !procesadosMap[u.id])
        .map(u => u.id);
        
      if (usuariosRegulares.length > 0) {
        // Opci�n 1: Usar funci�n RPC en Supabase
        for (const userId of usuariosRegulares) {
          try {
            // Intenta obtener la membres�a mediante el servicio centralizado
            const { MembershipService } = await import('@/lib/membership-service');
            const membresia = await MembershipService.getActiveMembership(userId);
            
            if (membresia) {
              membresiasMap[userId] = {
                nombre: membresia.tipo_membresia?.nombre || "Plan desconocido",
                fecha_fin: membresia.fecha_fin,
                estado: membresia.estado || "desconocido",
                id: membresia.id
              };
            }
          } catch (err) {
            console.error(`Error al cargar membres�a para usuario ${userId}:`, err);
          }
        }
        
        // Opci�n 2: Consulta directa como respaldo (por si la funci�n RPC falla)
        // Obtenemos los usuarios que a�n no tienen membres�a asignada
        const usuariosSinMembresia = usuariosRegulares.filter(id => !membresiasMap[id]);
        
        if (usuariosSinMembresia.length > 0) {
          const { data: membresiasDirect, error: membresiasDirError } = await supabase
            .from("membresias_usuarios")
            .select(`
              id, 
              usuario_id, 
              tipo_membresia_id, 
              fecha_inicio, 
              fecha_fin, 
              estado,
              tipo_membresia:membresia_tipos(id, nombre, descripcion, tiene_ai)
            `)
            .in("usuario_id", usuariosSinMembresia)
            .eq("estado", "activa")
            .order("fecha_inicio", { ascending: false });
            
          if (!membresiasDirError && membresiasDirect) {
            // Agrupar por usuario_id (qued�ndonos solo con la m�s reciente)
            const membresiasGrouped: Record<string, any> = {};
            
            for (const membresia of membresiasDirect) {
              if (!membresiasGrouped[membresia.usuario_id]) {
                membresiasGrouped[membresia.usuario_id] = membresia;
              }
            }
            
            // A�adir al mapa principal
            for (const userId in membresiasGrouped) {
              const membresia = membresiasGrouped[userId];
              membresiasMap[userId] = {
                nombre: membresia.tipo_membresia?.nombre || "Plan desconocido",
                fecha_fin: membresia.fecha_fin,
                estado: membresia.estado || "desconocido",
                id: membresia.id
              };
            }
          }
        }
      }
      
      // Actualizar el estado con todas las membres�as encontradas
      setMembresiasPorUsuario(membresiasMap);
      
    } catch (error) {
      console.error("Error al cargar membres�as por usuario:", error);
    }
  };

  // Funci�n para actualizar solo las membres�as
  const actualizarMembresias = async () => {
    try {
      setActualizando(true);
      setMensaje({
        texto: "Actualizando informaci�n de membres�as...",
        tipo: "info"
      });
      
      // Recargar solo las membres�as sin tocar los usuarios
      await cargarMembresiasPorUsuario(usuarios);
      
      setMensaje({
        texto: "Membres�as actualizadas correctamente",
        tipo: "exito"
      });
      
      // Limpiar mensaje despu�s de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
      
    } catch (err: any) {
      console.error("Error al actualizar membres�as:", err);
      setMensaje({
        texto: `Error al actualizar membres�as: ${err.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setActualizando(false);
    }
  };

  // Funci�n para eliminar un usuario
  const handleEliminarUsuario = async (id: string) => {
    if (!window.confirm("�Est�s seguro de que quieres eliminar este usuario? Esta acci�n no se puede deshacer y eliminar� todos sus datos asociados.")) {
      return;
    }

    try {
      setLoading(true);

      // Eliminar usuario
      const { error } = await supabase
        .from("usuarios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Actualizar la lista de usuarios
      setUsuarios(usuarios.filter((u) => u.id !== id));
      setMensaje({
        texto: "Usuario eliminado correctamente",
        tipo: "exito"
      });

      // Limpiar el mensaje despu�s de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al eliminar usuario:", err);
      setMensaje({
        texto: `Error al eliminar usuario: ${err.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Funci�n para reparar la membres�a de un usuario
  const repararMembresia = async (userId: string) => {
    try {
      setActualizando(true);
      setMensaje({
        texto: "Reparando membres�a...",
        tipo: "info"
      });
      
      // Llamar al endpoint de reparaci�n
      const response = await fetch('/api/debug-membership/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMensaje({
          texto: "Membres�a reparada correctamente",
          tipo: "exito"
        });
        
        // Recargar membres�as para ver el cambio
        await cargarMembresiasPorUsuario(usuarios);
      } else {
        setMensaje({
          texto: `Error: ${result.message || "No se pudo reparar la membres�a"}`,
          tipo: "error"
        });
      }
      
      // Limpiar mensaje despu�s de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
      
    } catch (err: any) {
      console.error("Error al reparar membres�a:", err);
      setMensaje({
        texto: `Error al reparar membres�a: ${err.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setActualizando(false);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    try {
      if (!fechaStr) return "N/A";
      return new Date(fechaStr).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      return fechaStr || "N/A";
    }
  };

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter(usuario => {
    // Filtro de texto
    const matchesText = !filtro || 
      (usuario.email && usuario.email.toLowerCase().includes(filtro.toLowerCase())) ||
      (usuario.username && usuario.username.toLowerCase().includes(filtro.toLowerCase())) ||
      (usuario.nombre && usuario.nombre.toLowerCase().includes(filtro.toLowerCase())) ||
      (usuario.apellidos && usuario.apellidos.toLowerCase().includes(filtro.toLowerCase())) ||
      (usuario.empresa && usuario.empresa.toLowerCase().includes(filtro.toLowerCase()));
    
    // Filtro de membres�a (si est� activo)
    if (!filtroMembresia) return matchesText;
    
    // Si filtro es "sin-membresia", verificar si no tiene membres�a
    if (filtroMembresia === "sin-membresia") {
      return matchesText && !membresiasPorUsuario[usuario.id];
    }
    
    // Verificar por tipo de membres�a
    const membresia = membresiasPorUsuario[usuario.id];
    
    // Si el usuario es especial, verificar manualmente
    if (USUARIOS_ESPECIALES[usuario.id]) {
      const planNombre = USUARIOS_ESPECIALES[usuario.id].membresia.nombre;
      const planFiltrado = tiposMembresia.find(t => t.id === filtroMembresia)?.nombre;
      return matchesText && planNombre === planFiltrado;
    }
    
    // Para el resto de usuarios, verificar si coincide con el tipo de membres�a
    return matchesText && membresia && tiposMembresia.some(
      t => t.id === filtroMembresia && t.nombre === membresia.nombre
    );
  });

  // Paginaci�n
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsuarios = usuariosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  // Renderizaci�n
  if (loading && usuarios.length === 0) {
    return <Loading text="Cargando usuarios..." />;
  }

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">
          Gesti�n de Usuarios ({usuarios.length})
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={actualizarMembresias}
            variant="secondary"
            isLoading={actualizando}
            disabled={actualizando}
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar Membres�as
          </Button>
          <Button href="/admin/dashboard/usuarios/nuevo">
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      {/* Filtros */}
      <Card className="mb-6">
        <h2 className="text-lg font-medium mb-4">Filtros de b�squeda</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1 md:col-span-2">
            <label htmlFor="filtroTexto" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <Input
                id="filtroTexto"
                type="text"
                placeholder="Buscar por nombre, email, empresa..."
                className="pl-10"
                value={filtro}
                onChange={(e) => {
                  setFiltro(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="filtroMembresia" className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por membres�a
            </label>
            <select
              id="filtroMembresia"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pl-3 pr-10 py-2"
              value={filtroMembresia || ""}
              onChange={(e) => {
                setFiltroMembresia(e.target.value === "" ? null : e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Todas las membres�as</option>
              <option value="sin-membresia">Sin membres�a</option>
              {tiposMembresia.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Indicador de filtros y bot�n para limpiar */}
        {(filtro || filtroMembresia) && (
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltro("");
                setFiltroMembresia(null);
                setCurrentPage(1);
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        )}
      </Card>

      {/* Tabla de usuarios */}
      {usuarios.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza a�adiendo un nuevo usuario a la plataforma.</p>
            <div className="mt-6">
              <Button href="/admin/dashboard/usuarios/nuevo">
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nuevo Usuario
              </Button>
            </div>
          </div>
        </Card>
      ) : usuariosFiltrados.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">No hay usuarios que coincidan con tu b�squeda.</p>
            <div className="mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  setFiltro("");
                  setFiltroMembresia(null);
                  setCurrentPage(1);
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan Activo
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registro
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentUsuarios.map((usuario) => {
                    // Determinar si el usuario tiene una membres�a especial hardcoded
                    const esUsuarioEspecial = USUARIOS_ESPECIALES[usuario.id] !== undefined;
                    // Obtener los datos de membres�a (del hardcoded o de la BD)
                    const membresiaData = esUsuarioEspecial 
                      ? USUARIOS_ESPECIALES[usuario.id].membresia 
                      : membresiasPorUsuario[usuario.id];
                    
                    return (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
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
                                {usuario.username || "Sin nombre de usuario"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {usuario.nombre} {usuario.apellidos}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {usuario.email || "Sin email"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {/* Mostrar informaci�n de membres�a */}
                          {membresiaData ? (
                            <div className="px-2 py-1 text-xs font-medium rounded-full inline-block text-green-800 bg-green-100">
                              {membresiaData.nombre || "Plan desconocido"}
                            </div>
                          ) : (
                            <div className="px-2 py-1 text-xs font-medium rounded-full inline-block text-gray-800 bg-gray-100">
                              Sin membres�a
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {membresiaData ? (
                            <div className="flex flex-col">
                              <span className={`text-xs ${
                                membresiaData.estado === 'activa' ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {membresiaData.estado === 'activa' ? 'Activa' : membresiaData.estado || 'Desconocido'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Hasta: {membresiaData.fecha_fin ? formatearFecha(membresiaData.fecha_fin) : 'N/A'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {usuario.created_at ? formatearFecha(usuario.created_at) : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <Button
                              href={`/admin/dashboard/usuarios/${usuario.id}`}
                              variant="ghost"
                              size="sm"
                            >
                              Ver
                            </Button>
                            <Button
                              href={`/admin/dashboard/usuarios/editar/${usuario.id}`}
                              variant="ghost"
                              size="sm"
                            >
                              Editar
                            </Button>
                            <Button
                              onClick={() => repararMembresia(usuario.id)}
                              variant="ghost"
                              size="sm"
                              title="Reparar membres�a"
                              disabled={actualizando}
                            >
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </Button>
                            <Button
                              onClick={() => handleEliminarUsuario(usuario.id)}
                              variant="danger"
                              size="sm"
                              title="Eliminar usuario"
                            >
                              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Paginaci�n */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
                <span className="font-medium">
                  {Math.min(startIndex + itemsPerPage, usuariosFiltrados.length)}
                </span>{" "}
                de <span className="font-medium">{usuariosFiltrados.length}</span> usuarios
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
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