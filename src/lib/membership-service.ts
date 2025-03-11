// src/lib/membership-service.ts
import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';

// Cliente con privilegios de servicio para operaciones que requieren más permisos
const supabaseAdmin = typeof window === 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )
  : null; // Solo se inicializa en el servidor

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
      if (!userId) {
        console.error("Error: se requiere un ID de usuario válido");
        return null;
      }

      console.log(`Buscando membresía activa para usuario: ${userId}`);
      
      // 1. Verificar si el usuario tiene una membresía en la tabla de usuario
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('membresia_activa_id')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error(`Error al consultar usuario para membresía: ${userError.message}`);
      } else if (userData?.membresia_activa_id) {
        console.log(`ID de membresía encontrado en usuario: ${userData.membresia_activa_id}`);
        
        // Si el usuario tiene una referencia a membresía, consultamos sus detalles completos
        const { data: membershipData, error: membershipError } = await supabase
          .from('membresias_usuarios')
          .select(`
            id,
            usuario_id,
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
          .eq('id', userData.membresia_activa_id)
          .single();
        
        if (!membershipError && membershipData) {
          // Verificar que la membresía esté activa y no expirada
          const fechaFin = new Date(membershipData.fecha_fin);
          const hoy = new Date();
          
          if (membershipData.estado === 'activa' && fechaFin > hoy) {
            console.log(`Membresía activa encontrada a través de referencia: ${membershipData.id}`);
            return membershipData;
          } else {
            console.log(`Membresía referenciada no está activa o expiró: ${membershipData.id}, Estado: ${membershipData.estado}, Fecha fin: ${fechaFin.toISOString()}`);
          }
        }
      }
      
      // 2. Buscar membresía activa directamente si no se encontró por referencia
      console.log(`Buscando membresía activa en tabla membresias_usuarios para: ${userId}`);
      const { data: activeMemData, error: activeMemError } = await supabase
        .from('membresias_usuarios')
        .select(`
          id,
          usuario_id,
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
        .gte('fecha_fin', new Date().toISOString())
        .order('fecha_inicio', { ascending: false })
        .limit(1);
      
      if (activeMemError) {
        console.error(`Error al buscar membresía activa: ${activeMemError.message}`);
      } else if (activeMemData && activeMemData.length > 0) {
        console.log(`Membresía activa encontrada por búsqueda directa: ${activeMemData[0].id}`);
        
        // Si encontramos una membresía activa, actualizamos la referencia en la tabla de usuarios
        try {
          const { error: updateError } = await supabase
            .from('usuarios')
            .update({ membresia_activa_id: activeMemData[0].id })
            .eq('id', userId);
            
          if (updateError) {
            console.error(`Error al actualizar referencia de membresía en usuario: ${updateError.message}`);
          } else {
            console.log(`Referencia de membresía actualizada en usuario: ${activeMemData[0].id}`);
          }
        } catch (updateErr) {
          console.error("Error al actualizar referencia de membresía:", updateErr);
        }
        
        return activeMemData[0];
      }
      
      // 3. Si aún no se encuentra membresía, crear una temporal
      console.log("No se encontró membresía activa, creando membresía temporal...");
      
      // NOTA: Originalmente intentábamos reparar/crear mediante la API, pero encontramos problemas
      // con la autenticación y las políticas de seguridad. Para evitar errores, ahora usamos
      // directamente una solución temporal que no requiere acceso a la base de datos.
      
      // Creamos una membresía temporal para mostrar en la interfaz, con estado claramente marcado
      console.log("⚠️ Creando membresía temporal para usuario:", userId);
      console.log("👉 Recomendación: Un administrador debe crear una membresía real para este usuario en la base de datos");
      
      // Determinar usuario si es un administrador o un usuario normal
      // Los usuarios pueden tener diferentes límites de uso
      const isAdminOrSpecial = typeof window !== 'undefined' && 
        localStorage.getItem('user_role') === 'admin';
      
      // Crear una membresía temporal con advertencia visual
      return {
        id: 'temp-membership-' + Date.now(),
        usuario_id: userId,
        tipo_membresia_id: 'basic',
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        estado: 'temporal',
        tipo_membresia: {
          id: 'basic',
          nombre: 'Plan Temporal ⚠️',
          descripcion: 'Esta membresía es temporal y puede afectar algunas funcionalidades. Contacta con soporte.',
          precio: 0,
          tiene_ai: isAdminOrSpecial, // Solo permitimos IA para admins
          limite_listas: isAdminOrSpecial ? 100 : 10,
          limite_proveedores: isAdminOrSpecial ? 50 : 5, 
          limite_articulos: isAdminOrSpecial ? 500 : 50,
          duracion_meses: 12
        }
      };
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
      // Intentar múltiples estrategias para reparar la membresía
      console.log("Iniciando reparación de membresía para:", userId);
      
      // 1. Primer intento: usar el endpoint específico de reparación
      try {
        const response = await fetch('/api/debug-membership/fix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
          console.log("✅ Reparación exitosa vía API:", result);
          return {
            success: true,
            message: result.message || "Membresía reparada exitosamente",
            membership: result.updatedMembership || null
          };
        } else {
          console.warn("⚠️ API de reparación falló:", result.message || "Error desconocido");
          // Continuamos con el segundo intento
        }
      } catch (apiError) {
        console.error("Error al llamar API de reparación:", apiError);
        // Continuamos con el segundo intento
      }
      
      // 2. Segundo intento: intentar crear una membresía gratuita directamente
      try {
        // ID fijo del plan gratuito (asegurando que existe en la base de datos)
        const tipoPlanGratuitoId = "13fae609-2679-47fa-9731-e2f1badc4a61";
        const fechaInicio = new Date().toISOString();
        const fechaFin = new Date();
        fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Plan gratuito por 1 año
        
        console.log("Intentando crear membresía gratuita directamente");
        
        // Intentar con la API de creación directa
        const createResponse = await fetch('/api/create-membership', {
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
        
        const createResult = await createResponse.json();
        
        if (createResponse.ok && createResult.success) {
          console.log("✅ Creación directa exitosa:", createResult);
          return {
            success: true,
            message: "Se ha creado una nueva membresía gratuita",
            membership: createResult.membresia || null
          };
        } else {
          console.warn("⚠️ Creación directa falló:", createResult.error || "Error desconocido");
          // Continuamos con el tercer intento
        }
      } catch (createError) {
        console.error("Error al intentar creación directa:", createError);
      }
      
      // 3. Tercer intento: crear una membresía temporal en memoria
      console.log("Creando membresía temporal como último recurso");
      
      // Determinar si es admin
      const isAdminOrSpecial = typeof window !== 'undefined' && 
        localStorage.getItem('user_role') === 'admin';
      
      // Simular una membresía temporal
      const temporalMembership = {
        id: 'temp-fix-' + Date.now(),
        usuario_id: userId,
        tipo_membresia_id: 'basic',
        fecha_inicio: new Date().toISOString(),
        fecha_fin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        estado: 'temporal',
        tipo_membresia: {
          id: 'basic',
          nombre: 'Plan Temporal ⚠️',
          descripcion: 'Esta membresía es temporal y puede afectar algunas funcionalidades.',
          precio: 0,
          tiene_ai: isAdminOrSpecial, // Solo permitimos IA para admins
          limite_listas: isAdminOrSpecial ? 100 : 10,
          limite_proveedores: isAdminOrSpecial ? 50 : 5, 
          limite_articulos: isAdminOrSpecial ? 500 : 50,
          duracion_meses: 12
        }
      };
      
      // Devolver la membresía temporal con un mensaje de advertencia
      return {
        success: true,
        message: "Se ha creado una membresía temporal. Contacte al soporte para una solución permanente.",
        membership: temporalMembership,
        isTemporal: true
      };
      
    } catch (err: any) {
      console.error("Error general al reparar membresía:", err);
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
      
      // Verificar si la membresía tiene un tipo asociado
      if (!membership.tipo_membresia) return false;
      
      // Verificar si el tipo de membresía tiene el flag tiene_ai activo
      // Usamos una aserción de tipo para indicar que tipo_membresia puede tener la propiedad tiene_ai
      const tipoMembresia = membership.tipo_membresia as { tiene_ai?: boolean };
      
      // Solo devuelve true si la propiedad existe y es true
      return tipoMembresia.tiene_ai === true;
    } catch (err) {
      console.error("Error al verificar acceso IA:", err);
      return false;
    }
  }
};