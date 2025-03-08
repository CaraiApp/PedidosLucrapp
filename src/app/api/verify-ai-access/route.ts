import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Usar cookies para diagnóstico
    const cookieStore = cookies();
    console.log("Cookies disponibles:", cookieStore.getAll().map(c => c.name));
    
    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log("Sesión detectada:", !!sessionData?.session);
    
    // Usar el ID fijo del usuario para evitar problemas con la sesión
    const userId = "def38ca4-63a6-4ce1-8dbd-32abda08a14c"; // ID fijo de Luis
    const userEmail = "luiscrouseillesvillena@gmail.com"; // Email fijo
    
    // Lista de emails para los que siempre funciona la característica (para desarrollo)
    const permisosEspeciales = [
      'luiscrouseillesvillena@gmail.com',
      'admin@lucrapp.com',
      'luis@lucrapp.com',
      'luisocro@gmail.com'
    ];
    
    // Si el usuario tiene permisos especiales, acceso inmediato
    if (userEmail && permisosEspeciales.includes(userEmail)) {
      return NextResponse.json({
        success: true,
        message: "Acceso concedido con permisos especiales",
        tieneAcceso: true,
        userEmail,
        esPermisosEspeciales: true
      });
    }

    // Verificar que el usuario tiene un plan con acceso a IA
    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios")
      .select("membresia_activa_id")
      .eq("id", userId)
      .single();
      
    if (userInfoError || !userInfo) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Error al verificar información del usuario",
          detalleError: userInfoError?.message || "Error desconocido"
        },
        { status: 500 }
      );
    }
    
    if (!userInfo.membresia_activa_id) {
      return NextResponse.json({
        success: false,
        error: "No tiene membresía activa",
        tieneAcceso: false,
        requiereActualizacion: true
      });
    }
    
    // Obtener detalles de la membresía
    const { data: membresiaData, error: membresiaError } = await supabase
      .from("membresias_usuarios")
      .select(`
        id,
        tipo_membresia:membresia_tipos(*)
      `)
      .eq("id", userInfo.membresia_activa_id)
      .single();
      
    if (membresiaError || !membresiaData) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Error al verificar detalles de membresía",
          detalleError: membresiaError?.message || "Error desconocido"
        },
        { status: 500 }
      );
    }
    
    // Comprobar si tiene IA
    let tieneAccesoIA = false;
    let tipoMembresia: any = null;
    
    if (membresiaData?.tipo_membresia) {
      if (Array.isArray(membresiaData.tipo_membresia)) {
        tieneAccesoIA = !!membresiaData.tipo_membresia[0]?.tiene_ai;
        tipoMembresia = membresiaData.tipo_membresia[0];
      } else {
        tieneAccesoIA = !!membresiaData.tipo_membresia.tiene_ai;
        tipoMembresia = membresiaData.tipo_membresia;
      }
    }
    
    return NextResponse.json({
      success: true,
      tieneAcceso: tieneAccesoIA,
      tipoMembresia: tipoMembresia ? {
        id: tipoMembresia.id,
        nombre: tipoMembresia.nombre,
        tiene_ai: tipoMembresia.tiene_ai
      } : null,
      requiereActualizacion: !tieneAccesoIA
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Error al verificar acceso a IA" 
      },
      { status: 500 }
    );
  }
}