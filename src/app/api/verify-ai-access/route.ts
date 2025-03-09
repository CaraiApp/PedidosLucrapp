import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Usar cookies para diagnóstico
    const cookieStore = cookies();
    console.log("Cookies disponibles para diagnóstico");
    
    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log("Sesión detectada:", !!sessionData?.session);
    
    // Obtener ID y email del usuario de la sesión
    const userId = sessionData?.session?.user?.id;
    const userEmail = sessionData?.session?.user?.email;
    
    console.log("Verificando acceso para usuario:", { userId, userEmail });
    
    // Si no hay sesión activa, devolver error
    if (!userId || !userEmail) {
      return NextResponse.json({ 
        success: false, 
        error: "No hay sesión activa" 
      }, { status: 401 });
    }
    
    // Lista de emails para los que siempre funciona la característica (para desarrollo)
    // Agregamos un wildcard para permitir todos los emails con dominio lucrapp.com
    const permisosEspeciales = [
      'luiscrouseillesvillena@gmail.com',
      'admin@lucrapp.com',
      'luis@lucrapp.com',
      'luisocro@gmail.com'
    ];
    
    // Añadir soporte para dominios completos (permitir cualquier email de lucrapp.com)
    const dominiosPermitidos = ['lucrapp.com'];
    
    // Si el usuario tiene permisos especiales por email exacto o por dominio, conceder acceso inmediato
    const tienePermisoEspecial = userEmail && (
      permisosEspeciales.includes(userEmail) || 
      dominiosPermitidos.some(dominio => userEmail.endsWith('@' + dominio))
    );
    
    if (tienePermisoEspecial) {
      console.log("Concediendo acceso por permisos especiales a:", userEmail);
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
    
    // Para depurar problemas, registrar información detallada
    console.log("Resultado de verificación IA:", {
      tieneAccesoIA,
      tipoMembresiaNombre: tipoMembresia?.nombre,
      tipoMembresiaId: tipoMembresia?.id,
      tipoMembresiaTieneAI: tipoMembresia?.tiene_ai
    });
    
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