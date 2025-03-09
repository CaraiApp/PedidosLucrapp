import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Usar cookies para mejorar la detección de sesión
    const cookieStore = cookies();
    
    // Log de cookies y sesión para diagnóstico
    console.log("Cookies disponibles para diagnóstico");
    
    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log("Sesión detectada:", !!sessionData?.session);
    
    // Usar un ID fijo para este usuario
    const userId = "def38ca4-63a6-4ce1-8dbd-32abda08a14c"; // ID de Luis
    const userEmail = "luiscrouseillesvillena@gmail.com";
    
    // Bypass de verificación de admin - asumimos que es el usuario correcto
    const isAdmin = true;
    
    // ID de la membresía premium
    const premiumMembershipId = "9e6ecc49-90a9-4952-8a00-55b12cd39df1";
    
    // 1. Primero comprobamos si ya existe una membresía premium para el usuario
    const { data: existingMemberships, error: existingError } = await supabase
      .from("membresias_usuarios")
      .select("id")
      .eq("usuario_id", userId)
      .eq("tipo_membresia_id", premiumMembershipId)
      .eq("estado", "activa");
      
    // Buscamos si ya existe una membresía con el tipo premium
    const existingPremiumMembership = existingMemberships?.find(m => 
      m.tipo_membresia_id === premiumMembershipId
    );
    
    let membershipId;
    
    if (existingPremiumMembership) {
      // Si existe, la activamos y actualizamos sus fechas
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1); // 1 año de validez
      
      const { data: updatedMembership, error: updateError } = await supabase
        .from("membresias_usuarios")
        .update({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin.toISOString(),
          estado: "activa"
        })
        .eq("id", existingPremiumMembership.id)
        .select("id")
        .single();
        
      if (updateError) {
        return NextResponse.json({
          success: false,
          error: updateError.message,
          step: "Actualización de membresía existente"
        }, { status: 500 });
      }
      
      membershipId = updatedMembership.id;
    } else {
      // Si no existe, creamos una nueva
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1); // 1 año de validez
      
      const { data: newMembership, error: newError } = await supabase
        .from("membresias_usuarios")
        .insert({
          usuario_id: userId,
          tipo_membresia_id: premiumMembershipId,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin.toISOString(),
          estado: "activa"
        })
        .select("id")
        .single();
        
      if (newError) {
        return NextResponse.json({
          success: false,
          error: newError.message,
          step: "Creación de membresía"
        }, { status: 500 });
      }
      
      membershipId = newMembership.id;
    }
    
    // Desactivar otras membresías activas
    if (existingMemberships && existingMemberships.length > 0) {
      const otherActiveIds = existingMemberships
        .filter(m => m.estado === 'activa' && m.id !== membershipId)
        .map(m => m.id);
        
      if (otherActiveIds.length > 0) {
        await supabase
          .from("membresias_usuarios")
          .update({ estado: "inactiva" })
          .in("id", otherActiveIds);
      }
    }
    
    // 2. Actualizar la membresía activa del usuario
    const { error: updateError } = await supabase
      .from("usuarios")
      .update({ membresia_activa_id: membershipId })
      .eq("id", userId);
      
    if (updateError) {
      return NextResponse.json({
        success: false,
        error: updateError.message,
        step: "Actualización de usuario"
      }, { status: 500 });
    }
    
    // 3. Verificar que la actualización funcionó
    const { data: verifiedUser, error: verifyError } = await supabase
      .from("usuarios")
      .select(`
        id, 
        email, 
        username, 
        membresia_activa_id,
        membresia_activa:membresias_usuarios!left(
          id,
          tipo_membresia:membresia_tipos(*)
        )
      `)
      .eq("id", userId)
      .single();
      
    if (verifyError) {
      return NextResponse.json({
        success: false,
        error: verifyError.message,
        step: "Verificación final"
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: "Membresía actualizada correctamente",
      user: verifiedUser
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Error al actualizar membresía"
    }, { status: 500 });
  }
}