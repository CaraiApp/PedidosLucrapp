import { useState, useEffect } from 'react';
import { supabase, obtenerEstadisticasUso } from '@/lib/supabase';
import { EstadisticasUso, SupabaseError } from '@/types';
import { useAuth } from './useAuth';

export function useEstadisticas() {
  const { user } = useAuth();
  const [estadisticas, setEstadisticas] = useState<EstadisticasUso | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Proporcionar un valor por defecto si no hay estadísticas disponibles
        let estadisticasData = await obtenerEstadisticasUso(user.id);
        
        if (!estadisticasData) {
          // Crear datos predeterminados
          estadisticasData = {
            totalProveedores: 0,
            totalArticulos: 0,
            totalListas: 0,
            membresia: {
              id: "default",
              tipo_id: "free_plan",
              nombre: "Plan Básico",
              limiteProveedores: 5,
              limiteArticulos: 50,
              limiteListas: 10,
              fechaInicio: new Date().toISOString(),
              fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            }
          };
          console.log("Usando estadísticas predeterminadas");
        }
        
        setEstadisticas(estadisticasData);
      } catch (err) {
        const error = err as SupabaseError | Error;
        console.error('Error al cargar estadísticas:', error.message);
        setError('Error al cargar datos de uso. Por favor, intenta nuevamente.');
        
        // En caso de error, proporcionar datos predeterminados
        setEstadisticas({
          totalProveedores: 0,
          totalArticulos: 0,
          totalListas: 0,
          membresia: {
            id: "default",
            tipo_id: "free_plan",
            nombre: "Plan Básico",
            limiteProveedores: 5,
            limiteArticulos: 50,
            limiteListas: 10,
            fechaInicio: new Date().toISOString(),
            fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
          }
        });
      } finally {
        setLoading(false);
      }
    };

    cargarEstadisticas();
  }, [user]);

  // Función para verificar si ha alcanzado el límite de un recurso
  const verificarLimite = (tipo: 'proveedores' | 'articulos' | 'listas') => {
    if (!estadisticas) return true; // Por seguridad, restringir si no hay datos
    
    let usado = 0;
    let limite = 0;
    
    switch (tipo) {
      case 'proveedores':
        usado = estadisticas.totalProveedores;
        limite = estadisticas.membresia.limiteProveedores;
        break;
      case 'articulos':
        usado = estadisticas.totalArticulos;
        limite = estadisticas.membresia.limiteArticulos;
        break;
      case 'listas':
        usado = estadisticas.totalListas;
        limite = estadisticas.membresia.limiteListas;
        break;
    }
    
    // Si el límite es 0, significa ilimitado
    if (limite === 0) return false;
    
    return usado >= limite;
  };

  const actualizarEstadisticas = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const estadisticasData = await obtenerEstadisticasUso(user.id);
      
      if (!estadisticasData) {
        throw new Error('No se pudieron actualizar las estadísticas');
      }
      
      setEstadisticas(estadisticasData);
    } catch (err) {
      console.error('Error al actualizar estadísticas:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    estadisticas,
    loading,
    error,
    verificarLimite,
    actualizarEstadisticas
  };
}