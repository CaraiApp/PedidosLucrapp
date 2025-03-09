import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // Obtener ID y email del usuario de la sesión
    const userId = sessionData?.session?.user?.id;
    const userEmail = sessionData?.session?.user?.email;
    
    // Comprobar si hay sesión válida
    if (!userId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: "No hay sesión activa. Por favor, inicia sesión para continuar." 
      }, { status: 401 });
    }
    
    // Lista de emails de administradores que siempre tienen acceso completo
    const adminEmails = [
      'luiscrouseillesvillena@gmail.com',
      'admin@lucrapp.com',
      'luis@lucrapp.com'
    ];
    
    // Dominios oficiales de la empresa que siempre tienen acceso
    const dominiosOficiales = ['lucrapp.com'];
    
    // Verificar si es un administrador o email corporativo
    const esAdminOCorporativo = userEmail && (
      adminEmails.includes(userEmail) || 
      dominiosOficiales.some(dominio => userEmail.endsWith('@' + dominio))
    );
    
    if (esAdminOCorporativo) {
      // Los administradores y correos corporativos tienen acceso a todas las funciones
      return NextResponse.json({
        success: true,
        tieneAcceso: true,
        userEmail
      });
    }
    
    // Verificar que el usuario tiene un plan con acceso a IA
    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios")
      .select("membresia_activa_id")
      .eq("id", userId)
      .single();
      
    if (userInfoError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No se pudo verificar la información de tu cuenta. Por favor, contacta con soporte."
        },
        { status: 500 }
      );
    }
    
    if (!userInfo || !userInfo.membresia_activa_id) {
      return NextResponse.json({
        success: false,
        error: "No tienes una membresía activa. Por favor, actualiza tu plan para acceder a esta función.",
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
      
    if (membresiaError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No se pudieron verificar los detalles de tu membresía. Por favor, contacta con soporte."
        },
        { status: 500 }
      );
    }
    
    if (!membresiaData) {
      return NextResponse.json({
        success: false,
        error: "No se encontró información de tu membresía. Por favor, contacta con soporte.",
        tieneAcceso: false,
        requiereActualizacion: true
      });
    }
    
    // Comprobar si tiene IA
    let tieneAccesoIA = false;
    let tipoMembresia: any = null;
    
    if (membresiaData?.tipo_membresia) {
      // Tratar la respuesta como 'any' ya que puede ser un array o un objeto 
      const tipoMembresiaData = membresiaData.tipo_membresia as any;
      
      if (Array.isArray(tipoMembresiaData)) {
        tieneAccesoIA = !!tipoMembresiaData[0]?.tiene_ai;
        tipoMembresia = tipoMembresiaData[0];
      } else {
        tieneAccesoIA = !!tipoMembresiaData.tiene_ai;
        tipoMembresia = tipoMembresiaData;
      }
    }
    
    if (!tieneAccesoIA) {
      return NextResponse.json({
        success: false,
        tieneAcceso: false,
        error: "Tu plan actual no incluye funciones de IA. Actualiza a un plan Premium para acceder a esta característica.",
        requiereActualizacion: true,
        planActual: tipoMembresia?.nombre || "Plan Básico"
      });
    }
    
    // Si llegamos aquí, el usuario tiene acceso a IA
    return NextResponse.json({
      success: true,
      tieneAcceso: true,
      tipoMembresia: {
        id: tipoMembresia.id,
        nombre: tipoMembresia.nombre,
        tiene_ai: true
      }
    });

  } catch (error: any) {
    // Error grave en la verificación
    return NextResponse.json(
      { 
        success: false, 
        error: "Ocurrió un error al verificar tu acceso. Por favor, intenta nuevamente o contacta con soporte." 
      },
      { status: 500 }
    );
  }
}