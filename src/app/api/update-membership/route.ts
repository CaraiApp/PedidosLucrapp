import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Para este endpoint usamos el cliente con los permisos de administrador
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * API para gestionar membresías con privilegios de administrador
 * Operaciones soportadas:
 * - deactivate-all: Desactiva todas las membresías activas de un usuario
 * - update-reference: Actualiza la referencia membresia_activa_id en el usuario
 * - activate: Activa una membresía específica
 * - deactivate: Desactiva una membresía específica
 */
export async function POST(request: NextRequest) {
  try {
    // Parsear datos de la solicitud
    const requestData = await request.json();
    console.log("Solicitud recibida en update-membership:", requestData);
    
    // Validar datos mínimos requeridos
    if (!requestData.operation) {
      return NextResponse.json({
        success: false,
        error: "Se requiere especificar una operación"
      }, { status: 400 });
    }
    
    if (!requestData.userId) {
      return NextResponse.json({
        success: false,
        error: "Se requiere ID de usuario"
      }, { status: 400 });
    }
    
    const userId = requestData.userId;
    const operation = requestData.operation;
    
    // Ejecutar operación solicitada
    switch (operation) {
      // Desactivar todas las membresías activas de un usuario
      case 'deactivate-all':
        return await deactivateAllMemberships(userId);
        
      // Actualizar la referencia de membresía activa en el usuario
      case 'update-reference':
        if (!requestData.membresiaId) {
          return NextResponse.json({
            success: false,
            error: "Se requiere ID de membresía para actualizar referencia"
          }, { status: 400 });
        }
        return await updateMembershipReference(userId, requestData.membresiaId);
        
      // Activar una membresía específica  
      case 'activate':
        if (!requestData.membresiaId) {
          return NextResponse.json({
            success: false,
            error: "Se requiere ID de membresía para activar"
          }, { status: 400 });
        }
        return await activateMembership(userId, requestData.membresiaId);
        
      // Desactivar una membresía específica
      case 'deactivate':
        if (!requestData.membresiaId) {
          return NextResponse.json({
            success: false,
            error: "Se requiere ID de membresía para desactivar"
          }, { status: 400 });
        }
        return await deactivateMembership(requestData.membresiaId);
        
      // Operación no soportada
      default:
        return NextResponse.json({
          success: false,
          error: `Operación '${operation}' no soportada`
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error en API update-membership:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error interno al actualizar membresía"
    }, { status: 500 });
  }
}

/**
 * Desactiva todas las membresías activas de un usuario
 */
async function deactivateAllMemberships(userId: string) {
  try {
    console.log(`Desactivando todas las membresías activas del usuario ${userId}`);
    
    // Actualizar todas las membresías activas a inactivas
    const { data, error } = await supabaseAdmin
      .from("membresias_usuarios")
      .update({ estado: "inactiva" })
      .eq("usuario_id", userId)
      .eq("estado", "activa");
      
    if (error) {
      console.error("Error al desactivar membresías:", error);
      return NextResponse.json({
        success: false,
        error: error.message || "Error al desactivar membresías"
      }, { status: 500 });
    }
    
    console.log("Membresías desactivadas correctamente");
    return NextResponse.json({
      success: true,
      message: "Todas las membresías han sido desactivadas"
    });
  } catch (error: any) {
    console.error("Error en deactivateAllMemberships:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error al desactivar membresías"
    }, { status: 500 });
  }
}

/**
 * Actualiza la referencia de membresía activa en el usuario
 */
async function updateMembershipReference(userId: string, membresiaId: string) {
  try {
    console.log(`Actualizando referencia de membresía en usuario ${userId} a ${membresiaId}`);
    
    // Verificar que la membresía existe y pertenece al usuario
    const { data: membershipData, error: membershipError } = await supabaseAdmin
      .from("membresias_usuarios")
      .select("id, estado")
      .eq("id", membresiaId)
      .eq("usuario_id", userId)
      .single();
      
    if (membershipError) {
      console.error("Error al verificar membresía:", membershipError);
      return NextResponse.json({
        success: false,
        error: "La membresía especificada no existe o no pertenece al usuario"
      }, { status: 400 });
    }
    
    // Si la membresía no está activa, activarla
    if (membershipData.estado !== "activa") {
      console.log("La membresía no está activa. Activándola...");
      const { error: activateError } = await supabaseAdmin
        .from("membresias_usuarios")
        .update({ estado: "activa" })
        .eq("id", membresiaId);
        
      if (activateError) {
        console.error("Error al activar membresía:", activateError);
        return NextResponse.json({
          success: false,
          error: activateError.message || "Error al activar membresía"
        }, { status: 500 });
      }
    }
    
    // Actualizar referencia en el usuario
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({ membresia_activa_id: membresiaId })
      .eq("id", userId);
      
    if (updateError) {
      console.error("Error al actualizar referencia en usuario:", updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message || "Error al actualizar referencia"
      }, { status: 500 });
    }
    
    console.log("Referencia de membresía actualizada correctamente");
    return NextResponse.json({
      success: true,
      message: "Referencia de membresía actualizada correctamente"
    });
  } catch (error: any) {
    console.error("Error en updateMembershipReference:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error al actualizar referencia"
    }, { status: 500 });
  }
}

/**
 * Activa una membresía específica (y desactiva las demás)
 */
async function activateMembership(userId: string, membresiaId: string) {
  try {
    console.log(`Activando membresía ${membresiaId} para usuario ${userId}`);
    
    // 1. Desactivar todas las membresías activas primero
    await deactivateAllMemberships(userId);
    
    // 2. Activar la membresía especificada
    const { error: activateError } = await supabaseAdmin
      .from("membresias_usuarios")
      .update({ estado: "activa" })
      .eq("id", membresiaId)
      .eq("usuario_id", userId);
      
    if (activateError) {
      console.error("Error al activar membresía:", activateError);
      return NextResponse.json({
        success: false,
        error: activateError.message || "Error al activar membresía"
      }, { status: 500 });
    }
    
    // 3. Actualizar referencia en el usuario
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({ membresia_activa_id: membresiaId })
      .eq("id", userId);
      
    if (updateError) {
      console.error("Error al actualizar referencia en usuario:", updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message || "Error al actualizar referencia"
      }, { status: 500 });
    }
    
    console.log("Membresía activada correctamente");
    return NextResponse.json({
      success: true,
      message: "Membresía activada correctamente"
    });
  } catch (error: any) {
    console.error("Error en activateMembership:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error al activar membresía"
    }, { status: 500 });
  }
}

/**
 * Desactiva una membresía específica
 */
async function deactivateMembership(membresiaId: string) {
  try {
    console.log(`Desactivando membresía ${membresiaId}`);
    
    // 1. Obtener el usuario de la membresía
    const { data: membershipData, error: membershipError } = await supabaseAdmin
      .from("membresias_usuarios")
      .select("usuario_id")
      .eq("id", membresiaId)
      .single();
      
    if (membershipError) {
      console.error("Error al obtener datos de membresía:", membershipError);
      return NextResponse.json({
        success: false,
        error: "La membresía especificada no existe"
      }, { status: 400 });
    }
    
    const userId = membershipData.usuario_id;
    
    // 2. Verificar si la membresía está configurada como activa en el usuario
    const { data: userData, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("membresia_activa_id")
      .eq("id", userId)
      .single();
      
    if (userError) {
      console.error("Error al verificar membresía activa en usuario:", userError);
      return NextResponse.json({
        success: false,
        error: "Error al verificar membresía activa en usuario"
      }, { status: 500 });
    }
    
    // 3. Si es la membresía activa del usuario, limpiar la referencia
    if (userData.membresia_activa_id === membresiaId) {
      const { error: updateError } = await supabaseAdmin
        .from("usuarios")
        .update({ membresia_activa_id: null })
        .eq("id", userId);
        
      if (updateError) {
        console.error("Error al limpiar referencia en usuario:", updateError);
        return NextResponse.json({
          success: false,
          error: updateError.message || "Error al limpiar referencia"
        }, { status: 500 });
      }
    }
    
    // 4. Desactivar la membresía
    const { error: deactivateError } = await supabaseAdmin
      .from("membresias_usuarios")
      .update({ estado: "inactiva" })
      .eq("id", membresiaId);
      
    if (deactivateError) {
      console.error("Error al desactivar membresía:", deactivateError);
      return NextResponse.json({
        success: false,
        error: deactivateError.message || "Error al desactivar membresía"
      }, { status: 500 });
    }
    
    console.log("Membresía desactivada correctamente");
    return NextResponse.json({
      success: true,
      message: "Membresía desactivada correctamente"
    });
  } catch (error: any) {
    console.error("Error en deactivateMembership:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error al desactivar membresía"
    }, { status: 500 });
  }
}