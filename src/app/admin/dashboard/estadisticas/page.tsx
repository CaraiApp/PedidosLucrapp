// src/app/admin/dashboard/estadisticas/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Mensaje } from "@/types";

// Tipos para las estadísticas
interface EstadisticasUsuarios {
  totalUsuarios: number;
  usuariosActivos: number;
  nuevosUsuariosMes: number;
  usuariosPorMes: { mes: string; cantidad: number }[];
}

interface EstadisticasMembresias {
  totalMembresias: number;
  membresiasActivas: number;
  ingresosMensuales: number;
  membresiasVencidas: number;
  distribucionTipos: { tipo: string; cantidad: number }[];
}

interface EstadisticasActividad {
  articulosCreados: number;
  listasCreadas: number;
  proveedoresCreados: number;
  actividadPorDia: { dia: string; cantidad: number }[];
}

export default function EstadisticasAdmin() {
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [periodo, setPeriodo] = useState<"semana" | "mes" | "trimestre" | "anual">("mes");
  const [tipoEstadistica, setTipoEstadistica] = useState<"usuarios" | "membresias" | "actividad">("usuarios");
  
  // Estados para cada tipo de estadística
  const [estadisticasUsuarios, setEstadisticasUsuarios] = useState<EstadisticasUsuarios>({
    totalUsuarios: 0,
    usuariosActivos: 0,
    nuevosUsuariosMes: 0,
    usuariosPorMes: []
  });
  
  const [estadisticasMembresias, setEstadisticasMembresias] = useState<EstadisticasMembresias>({
    totalMembresias: 0,
    membresiasActivas: 0,
    ingresosMensuales: 0,
    membresiasVencidas: 0,
    distribucionTipos: []
  });
  
  const [estadisticasActividad, setEstadisticasActividad] = useState<EstadisticasActividad>({
    articulosCreados: 0,
    listasCreadas: 0,
    proveedoresCreados: 0,
    actividadPorDia: []
  });

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    cargarEstadisticas();
  }, [periodo, tipoEstadistica]);

  // Función para cargar estadísticas desde la base de datos
  const cargarEstadisticas = async () => {
    setLoading(true);
    
    try {
      // En un entorno real, aquí se consultarían los datos de Supabase con filtros según el periodo
      // Para esta demo, generamos datos de muestra
      
      if (tipoEstadistica === "usuarios") {
        await cargarEstadisticasUsuarios();
      } else if (tipoEstadistica === "membresias") {
        await cargarEstadisticasMembresias();
      } else if (tipoEstadistica === "actividad") {
        await cargarEstadisticasActividad();
      }
    } catch (error) {
      console.error("Error al cargar estadísticas:", error);
      setMensaje({
        texto: "Error al cargar las estadísticas. Intente nuevamente.",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar estadísticas de usuarios
  const cargarEstadisticasUsuarios = async () => {
    try {
      // Obtener total de usuarios
      const { count: totalUsuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });
        
      if (usuariosError) throw usuariosError;
      
      // En un caso real, aquí consultaríamos más datos según el período
      // Para la demo, generamos datos de muestra
      
      const usuariosPorMes = [
        { mes: "Enero", cantidad: 12 },
        { mes: "Febrero", cantidad: 18 },
        { mes: "Marzo", cantidad: 25 },
        { mes: "Abril", cantidad: 32 },
        { mes: "Mayo", cantidad: 45 },
        { mes: "Junio", cantidad: 56 },
      ];
      
      setEstadisticasUsuarios({
        totalUsuarios: totalUsuarios || 0,
        usuariosActivos: Math.floor((totalUsuarios || 0) * 0.8), // 80% activos para demo
        nuevosUsuariosMes: 15, // Valor demo
        usuariosPorMes
      });
    } catch (error) {
      console.error("Error al cargar estadísticas de usuarios:", error);
      throw error;
    }
  };

  // Función para cargar estadísticas de membresías
  const cargarEstadisticasMembresias = async () => {
    try {
      // Obtener membresías activas
      const { count: membresiasActivas, error: membresiasError } = await supabase
        .from('membresias_usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'activa');
        
      if (membresiasError) throw membresiasError;
      
      // Para la demo, generamos datos de muestra
      const distribucionTipos = [
        { tipo: "Básico", cantidad: 25 },
        { tipo: "Pro", cantidad: 40 },
        { tipo: "Premium", cantidad: 15 },
      ];
      
      setEstadisticasMembresias({
        totalMembresias: 120, // Demo
        membresiasActivas: membresiasActivas || 0,
        ingresosMensuales: (membresiasActivas || 0) * 19.99,
        membresiasVencidas: 30, // Demo
        distribucionTipos
      });
    } catch (error) {
      console.error("Error al cargar estadísticas de membresías:", error);
      throw error;
    }
  };

  // Función para cargar estadísticas de actividad
  const cargarEstadisticasActividad = async () => {
    try {
      // En un caso real, aquí consultaríamos datos sobre la actividad de los usuarios
      // Para la demo, generamos datos de muestra
      
      const actividadPorDia = [
        { dia: "Lunes", cantidad: 45 },
        { dia: "Martes", cantidad: 52 },
        { dia: "Miércoles", cantidad: 48 },
        { dia: "Jueves", cantidad: 60 },
        { dia: "Viernes", cantidad: 65 },
        { dia: "Sábado", cantidad: 35 },
        { dia: "Domingo", cantidad: 25 },
      ];
      
      setEstadisticasActividad({
        articulosCreados: 256,
        listasCreadas: 120,
        proveedoresCreados: 78,
        actividadPorDia
      });
    } catch (error) {
      console.error("Error al cargar estadísticas de actividad:", error);
      throw error;
    }
  };

  // Función para exportar estadísticas a CSV
  const exportarEstadisticas = () => {
    try {
      let csvContent = "";
      let filename = "";
      
      if (tipoEstadistica === "usuarios") {
        filename = "estadisticas_usuarios.csv";
        csvContent = "Mes,Cantidad\n";
        estadisticasUsuarios.usuariosPorMes.forEach(item => {
          csvContent += `${item.mes},${item.cantidad}\n`;
        });
      } else if (tipoEstadistica === "membresias") {
        filename = "estadisticas_membresias.csv";
        csvContent = "Tipo,Cantidad\n";
        estadisticasMembresias.distribucionTipos.forEach(item => {
          csvContent += `${item.tipo},${item.cantidad}\n`;
        });
      } else if (tipoEstadistica === "actividad") {
        filename = "estadisticas_actividad.csv";
        csvContent = "Día,Cantidad\n";
        estadisticasActividad.actividadPorDia.forEach(item => {
          csvContent += `${item.dia},${item.cantidad}\n`;
        });
      }
      
      // Crear enlace de descarga
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMensaje({
        texto: "Estadísticas exportadas correctamente",
        tipo: "success"
      });
    } catch (error) {
      console.error("Error al exportar estadísticas:", error);
      setMensaje({
        texto: "Error al exportar estadísticas",
        tipo: "error"
      });
    }
  };

  // Formatear número como moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold">Estadísticas detalladas</h1>
          
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <div>
              <select
                className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={tipoEstadistica}
                onChange={(e) => setTipoEstadistica(e.target.value as any)}
              >
                <option value="usuarios">Usuarios</option>
                <option value="membresias">Membresías</option>
                <option value="actividad">Actividad</option>
              </select>
            </div>
            
            <div>
              <select
                className="block w-full bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as any)}
              >
                <option value="semana">Última semana</option>
                <option value="mes">Último mes</option>
                <option value="trimestre">Último trimestre</option>
                <option value="anual">Último año</option>
              </select>
            </div>
            
            <Button
              variant="outline"
              onClick={exportarEstadisticas}
            >
              Exportar CSV
            </Button>
          </div>
        </div>
        
        <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Contenido según el tipo de estadística */}
            {tipoEstadistica === "usuarios" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Usuarios Totales</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasUsuarios.totalUsuarios}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Usuarios Activos</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasUsuarios.usuariosActivos}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Nuevos Usuarios (Mes)</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasUsuarios.nuevosUsuariosMes}</p>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-4">Crecimiento de usuarios por mes</h3>
                <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-end justify-between">
                  {estadisticasUsuarios.usuariosPorMes.map((item, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-indigo-500 w-10" 
                        style={{ 
                          height: `${(item.cantidad / Math.max(...estadisticasUsuarios.usuariosPorMes.map(i => i.cantidad))) * 160}px`
                        }}
                      ></div>
                      <span className="mt-2 text-xs text-gray-500">{item.mes}</span>
                      <span className="text-xs font-semibold">{item.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tipoEstadistica === "membresias" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Total Membresías</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasMembresias.totalMembresias}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Membresías Activas</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasMembresias.membresiasActivas}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Ingresos Mensuales</h3>
                    <p className="mt-1 text-3xl font-bold text-indigo-600">{formatCurrency(estadisticasMembresias.ingresosMensuales)}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Membresías Vencidas</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasMembresias.membresiasVencidas}</p>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-4">Distribución por tipo de membresía</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {estadisticasMembresias.distribucionTipos.map((item, index) => (
                    <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <h3 className="text-gray-700 font-medium">{item.tipo}</h3>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{item.cantidad}</p>
                      <div className="mt-2 bg-gray-200 h-2 rounded-full">
                        <div 
                          className="bg-indigo-500 h-2 rounded-full" 
                          style={{ 
                            width: `${(item.cantidad / estadisticasMembresias.totalMembresias) * 100}%`
                          }}
                        ></div>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {Math.round((item.cantidad / estadisticasMembresias.totalMembresias) * 100)}% del total
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {tipoEstadistica === "actividad" && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Artículos Creados</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasActividad.articulosCreados}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Listas de Compra</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasActividad.listasCreadas}</p>
                  </div>
                  
                  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                    <h3 className="text-gray-500 text-sm font-medium">Proveedores</h3>
                    <p className="mt-1 text-3xl font-bold text-gray-900">{estadisticasActividad.proveedoresCreados}</p>
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold mb-4">Actividad por día de la semana</h3>
                <div className="h-64 bg-gray-50 rounded-lg p-4 flex items-end justify-between">
                  {estadisticasActividad.actividadPorDia.map((item, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div 
                        className="bg-green-500 w-10" 
                        style={{ 
                          height: `${(item.cantidad / Math.max(...estadisticasActividad.actividadPorDia.map(i => i.cantidad))) * 160}px`
                        }}
                      ></div>
                      <span className="mt-2 text-xs text-gray-500">{item.dia}</span>
                      <span className="text-xs font-semibold">{item.cantidad}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}