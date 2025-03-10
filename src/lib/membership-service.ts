// src/lib/membership-service.ts
import { supabase } from './supabase';

/**
 * Servicio para gestionar las membresías de usuarios de forma robusta y consistente
 */
export const MembershipService = {
  /**
   * Obtiene la membresía activa de un usuario consultando directamente la tabla membresias_usuarios
   * @param userId ID del usuario
   * @returns Objeto con los datos de la membresía o null si no tiene membresía activa
   */
  async getActiveMembership(userId: string) {
    try {
      // 1. Intentar usar función RPC si existe (optimización)
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_user_active_membership', { user_id: userId });
          
        if (!rpcError && rpcData) {
          console.log("Membresía obtenida mediante RPC:", rpcData);
          return rpcData;
        }
      } catch (rpcErr) {
        console.log("RPC no disponible o error:", rpcErr);
      }
      
      // 2. Consulta directa a la tabla con join (enfoque más robusto)
      const { data, error } = await supabase
        .from('membresias_usuarios')
        .select(`
          id,
          tipo_membresia_id,
          fecha_inicio,
          fecha_fin,
          estado,
          tipo_membresia:membresia_tipos (
            id,
            nombre,
            descripcion,
            precio,
            tiene_ai,
            limite_listas,
            limite_proveedores,
            limite_articulos,
            duracion_meses
          )
        `)
        .eq('usuario_id', userId)
        .eq('estado', 'activa')
        .order('fecha_inicio', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error("Error al obtener membresía activa:", error);
        throw error;
      }
      
      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error("Error en getActiveMembership:", err);
      return null;
    }
  },
  
  /**
   * Verifica y repara la consistencia de la membresía de un usuario
   * @param userId ID del usuario a reparar
   * @returns Objeto con el resultado de la operación
   */
  async fixMembership(userId: string) {
    try {
      // Llamar al endpoint de reparación
      const response = await fetch('/api/debug-membership/fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId })
      });
      
      const result = await response.json();
      
      return {
        success: result.success,
        message: result.message,
        membership: result.updatedMembership || null
      };
    } catch (err: any) {
      console.error("Error al reparar membresía:", err);
      return {
        success: false,
        message: err.message || "Error al reparar membresía",
        membership: null
      };
    }
  },
  
  /**
   * Verifica si la membresía de un usuario le permite acceder a funciones de IA
   * @param userId ID del usuario
   * @returns booleano indicando si tiene acceso a IA
   */
  async hasAIAccess(userId: string) {
    try {
      const membership = await this.getActiveMembership(userId);
      
      // Si no tiene membresía activa, no tiene acceso a IA
      if (!membership) return false;
      
      // Verificar si la membresía tiene el flag tiene_ai
      return membership.tipo_membresia?.tiene_ai === true;
    } catch (err) {
      console.error("Error al verificar acceso IA:", err);
      return false;
    }
  }
};