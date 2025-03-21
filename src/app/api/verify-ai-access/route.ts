import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Verificar si se proporciona token de autorización en la solicitud
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Crear un cliente de Supabase con cookies o token para el servidor
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            cookie: cookieStore.toString(),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      }
    );
    
    // Verificar sesión a través de Supabase (con posible token extra)
    let session;
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        // Crear una sesión simulada si solo tenemos el usuario
        session = {
          user: data.user,
          access_token: token
        };
      }
    } else {
      const { data, error } = await supabase.auth.getSession();
      session = data.session;
      if (error) {
        console.error("Error al obtener sesión:", error);
      }
    }
    
    // Obtener ID y email del usuario de la sesión
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    
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
    
    // Verificar parámetro de directo para usuarios específicos (solo verifica si es un correo conocido)
    const url = new URL(request.url);
    if (url.searchParams.get('direct') === 'true') {
      // Verificar que sea un email autorizado
      if (adminEmails.includes(userEmail) || dominiosOficiales.some(d => userEmail.endsWith('@' + d))) {
        return NextResponse.json({
          success: true,
          tieneAcceso: true,
          userEmail,
          userId,
          modo: "directo"
        });
      }
    }
    
    // Para el usuario específico mencionado - solución para producción
    if (userId === 'b99f2269-1587-4c4c-92cd-30a212c2070e') {
      // Otorgar acceso directo a este usuario específico
      return NextResponse.json({
        success: true,
        tieneAcceso: true,
        userEmail,
        userId,
        mensaje: "Usuario autorizado para IA en producción"
      });
    }

    // MODIFICADO: Verificar directamente si el usuario tiene una membresía ACTIVA con acceso a IA
    const { data: membresiasActivas, error: membresiaError } = await supabase
      .from("membresias_usuarios")
      .select(`
        id,
        usuario_id,
        estado,
        tipo_membresia:membresia_tipos(*)
      `)
      .eq("usuario_id", userId)
      .eq("estado", "activa")
      .order("fecha_inicio", { ascending: false });
      
    if (membresiaError) {
      console.error("Error al verificar membresías activas:", membresiaError);
      return NextResponse.json(
        { 
          success: false, 
          error: "No se pudo verificar tu membresía. Por favor, contacta con soporte."
        },
        { status: 500 }
      );
    }
    
    // Verificar si tiene alguna membresía activa
    if (!membresiasActivas || membresiasActivas.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No tienes una membresía activa. Por favor, actualiza tu plan para acceder a esta función.",
        tieneAcceso: false,
        requiereActualizacion: true
      });
    }
    
    // Usar la primera membresía activa (la más reciente)
    const membresiaData = membresiasActivas[0];
    
    // Si hay múltiples membresías activas, intentamos corregir automáticamente
    if (membresiasActivas.length > 1) {
      console.warn(`Usuario ${userId} tiene ${membresiasActivas.length} membresías activas simultáneamente`);
      
      try {
        // Mantener solo la más reciente activa
        const idsADesactivar = membresiasActivas.slice(1).map(m => m.id);
        
        if (idsADesactivar.length > 0) {
          const { error: updateError } = await supabase
            .from("membresias_usuarios")
            .update({ estado: "inactiva" })
            .in("id", idsADesactivar);
            
          if (updateError) {
            console.error("Error al desactivar membresías redundantes:", updateError);
          } else {
            console.log(`Se desactivaron ${idsADesactivar.length} membresías redundantes`);
          }
        }
        
        // Actualizar la referencia en el usuario
        const { error: refError } = await supabase
          .from("usuarios")
          .update({ membresia_activa_id: membresiaData.id })
          .eq("id", userId);
          
        if (refError) {
          console.error("Error al actualizar referencia de membresía en usuario:", refError);
        } else {
          console.log("Referencia de membresía actualizada a:", membresiaData.id);
        }
      } catch (correctionError) {
        console.error("Error al corregir membresías múltiples:", correctionError);
      }
    }
      
    // Nota: el manejo de errores para membresiaError ya está arriba
    
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