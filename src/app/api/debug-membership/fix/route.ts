import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Para este endpoint usamos el cliente con los permisos de administrador
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: "ID de usuario no proporcionado"
      }, { status: 400 });
    }

    // 1. Verificar si el usuario existe
    const { data: userData, error: userError } = await supabaseAdmin
      .from("usuarios")
      .select("id, email, membresia_activa_id")
      .eq("id", userId)
      .single();
      
    if (userError) {
      return NextResponse.json({
        success: false,
        message: `Error al encontrar usuario: ${userError.message}`
      }, { status: 404 });
    }

    // 2. Buscar todas las membresías del usuario
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from("membresias_usuarios")
      .select(`
        id, 
        tipo_membresia_id,
        estado,
        fecha_inicio,
        fecha_fin,
        tipo_membresia:membresia_tipos(*)
      `)
      .eq("usuario_id", userId)
      .order("fecha_inicio", { ascending: false });
      
    if (membershipsError) {
      return NextResponse.json({
        success: false,
        message: `Error al consultar membresías: ${membershipsError.message}`
      }, { status: 500 });
    }

    // 3. Buscar la membresía premium (con AI)
    const premiumMembership = memberships?.find(m => 
      m.estado === 'activa' && m.tipo_membresia && typeof m.tipo_membresia === 'object' && 'tiene_ai' in m.tipo_membresia && m.tipo_membresia.tiene_ai === true
    );
    
    // 4. Si no hay membresía premium activa, buscar cualquier membresía activa
    const activeMembership = premiumMembership || memberships?.find(m => m.estado === 'activa');
    
    // 5. Si no hay membresía activa, buscar la membresía más reciente
    let targetMembership = activeMembership || (memberships?.length ? memberships[0] : null);
    
    // Si no se encontró ninguna membresía, necesitamos crear una nueva (gratuita)
    if (!targetMembership) {
      // Intentar encontrar el tipo de membresía gratuita o cualquier tipo de membresía
      const { data: membershipTypes, error: typesError } = await supabaseAdmin
        .from("membresia_tipos")
        .select("id, nombre, tiene_ai")
        .order("tiene_ai", { ascending: true }); // Primero las gratuitas (sin AI)
        
      if (typesError) {
        return NextResponse.json({
          success: false,
          message: `Error al obtener tipos de membresía: ${typesError.message}`
        }, { status: 500 });
      }
      
      if (!membershipTypes || membershipTypes.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No se encontraron tipos de membresía disponibles"
        }, { status: 500 });
      }
      
      // Buscar primero la membresía "Plan Gratuito" por nombre exacto
      let freeMembershipType = membershipTypes.find(
        type => type.nombre === "Plan Gratuito"
      );
      
      // Si no se encuentra, buscar alternativas con nombres similares
      if (!freeMembershipType) {
        freeMembershipType = membershipTypes.find(
          type => type.nombre.toLowerCase().includes("gratis") || 
                 type.nombre.toLowerCase().includes("gratuito") || 
                 type.nombre.toLowerCase().includes("básico") ||
                 type.nombre.toLowerCase().includes("basico") ||
                 type.nombre.toLowerCase().includes("free") ||
                 !type.tiene_ai
        );
      }
      
      // Si no encontramos una gratuita, usar la primera disponible
      const freeMembershipTypeId = freeMembershipType?.id || membershipTypes[0].id;
      
      console.log(`Usando tipo de membresía: ${freeMembershipTypeId}`);
      
      // Crear nueva membresía
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 10); // 10 años para membresía gratuita
      
      const { data: newMembership, error: createError } = await supabaseAdmin
        .from("membresias_usuarios")
        .insert({
          usuario_id: userId,
          tipo_membresia_id: freeMembershipTypeId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin.toISOString(),
          estado: "activa"
        })
        .select()
        .single();
        
      if (createError) {
        return NextResponse.json({
          success: false,
          message: `Error al crear nueva membresía: ${createError.message}`
        }, { status: 500 });
      }
      
      targetMembership = newMembership;
    }
    
    // 6. Si la membresía objetivo no está activa, activarla
    if (targetMembership && targetMembership.estado !== 'activa') {
      const { error: updateMembershipError } = await supabaseAdmin
        .from("membresias_usuarios")
        .update({ estado: "activa" })
        .eq("id", targetMembership.id);
        
      if (updateMembershipError) {
        return NextResponse.json({
          success: false,
          message: `Error al activar membresía: ${updateMembershipError.message}`
        }, { status: 500 });
      }
    }
    
    // 7. Actualizar el usuario con la membresía objetivo
    if (targetMembership) {
      const { error: updateUserError } = await supabaseAdmin
        .from("usuarios")
        .update({ membresia_activa_id: targetMembership.id })
        .eq("id", userId);
        
      if (updateUserError) {
        return NextResponse.json({
          success: false,
          message: `Error al actualizar usuario con membresía: ${updateUserError.message}`
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        success: false,
        message: "No se pudo encontrar ni crear una membresía válida"
      }, { status: 500 });
    }
    
    // 8. Desactivar otras membresías activas si existen
    const otherActiveMemberships = targetMembership ? memberships?.filter(m => 
      m.estado === 'activa' && m.id !== targetMembership.id
    ) : [];
    
    if (otherActiveMemberships && otherActiveMemberships.length > 0) {
      const idsToDeactivate = otherActiveMemberships.map(m => m.id);
      
      const { error: deactivateError } = await supabaseAdmin
        .from("membresias_usuarios")
        .update({ estado: "inactiva" })
        .in("id", idsToDeactivate);
        
      if (deactivateError) {
        return NextResponse.json({
          success: false,
          message: `Error al desactivar membresías duplicadas: ${deactivateError.message}`
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "Membresía corregida exitosamente",
      updatedMembership: targetMembership,
      deactivatedCount: otherActiveMemberships?.length || 0
    });
    
  } catch (error: any) {
    console.error("Error al reparar membresía:", error);
    return NextResponse.json({
      success: false,
      message: error.message || "Error al reparar membresía"
    }, { status: 500 });
  }
}