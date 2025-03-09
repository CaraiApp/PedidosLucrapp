import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Verificación de URL - Si contiene un parámetro bypass, saltar verificaciones
    const url = new URL(request.url);
    const bypassParam = url.searchParams.get('bypass');
    if (bypassParam === 'development') {
      console.log("Modo bypass activado - concediendo acceso directo");
      return NextResponse.json({
        success: true,
        message: "Acceso concedido en modo bypass",
        tieneAcceso: true,
        userEmail: "bypass@lucrapp.com",
        esPermisosEspeciales: true,
        modo: "bypass"
      });
    }
    
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
    
    // MODO DESARROLLO - Para evitar bloqueos durante desarrollo/pruebas
    // En producción, establecer esta variable de entorno a "production"
    const appMode = process.env.APP_MODE || 'development';
    
    if (appMode === 'development') {
      // En modo desarrollo, conceder acceso incluso sin sesión válida
      if (!userId || !userEmail) {
        console.log("MODO DESARROLLO: Concediendo acceso sin sesión válida");
        return NextResponse.json({
          success: true,
          message: "Acceso concedido en modo desarrollo",
          tieneAcceso: true,
          userEmail: "development@lucrapp.com",
          esDesarrollo: true
        });
      }
    } else {
      // En producción, requerir sesión
      if (!userId || !userEmail) {
        return NextResponse.json({ 
          success: false, 
          error: "No hay sesión activa" 
        }, { status: 401 });
      }
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

    // MODO DESARROLLO - Si ya estamos en modo desarrollo con email especial, saltarnos las verificaciones de DB
    if (appMode === 'development' && (
      dominiosPermitidos.some(dominio => userEmail.endsWith('@' + dominio)) ||
      permisosEspeciales.includes(userEmail)
    )) {
      console.log("MODO DESARROLLO: Usuario con permisos especiales o dominio permitido");
      return NextResponse.json({
        success: true,
        message: "Acceso concedido por permisos especiales en modo desarrollo",
        tieneAcceso: true,
        userEmail,
        esPermisosEspeciales: true
      });
    }
    
    try {
      // Verificar que el usuario tiene un plan con acceso a IA
      const { data: userInfo, error: userInfoError } = await supabase
        .from("usuarios")
        .select("membresia_activa_id")
        .eq("id", userId)
        .single();
        
      if (userInfoError) {
        console.error("Error al verificar información del usuario:", userInfoError);
        
        // En modo desarrollo, permitir acceso incluso con error
        if (appMode === 'development') {
          console.log("MODO DESARROLLO: Concediendo acceso a pesar del error de consulta");
          return NextResponse.json({
            success: true,
            message: "Acceso concedido en modo desarrollo (error ignorado)",
            tieneAcceso: true,
            userEmail,
            esDesarrollo: true,
            errorIgnorado: userInfoError.message
          });
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: "Error al verificar información del usuario",
            detalleError: userInfoError?.message || "Error desconocido"
          },
          { status: 500 }
        );
      }
      
      if (!userInfo || !userInfo.membresia_activa_id) {
        // En modo desarrollo, permitir acceso incluso sin membresía
        if (appMode === 'development') {
          console.log("MODO DESARROLLO: Concediendo acceso sin membresía activa");
          return NextResponse.json({
            success: true,
            message: "Acceso concedido en modo desarrollo (sin membresía)",
            tieneAcceso: true,
            userEmail,
            esDesarrollo: true
          });
        }
        
        return NextResponse.json({
          success: false,
          error: "No tiene membresía activa",
          tieneAcceso: false,
          requiereActualizacion: true
        });
      }
    } catch (dbError) {
      console.error("Error general en la consulta a la base de datos:", dbError);
      
      // En modo desarrollo, permitir acceso incluso con error
      if (appMode === 'development') {
        console.log("MODO DESARROLLO: Concediendo acceso a pesar de error general");
        return NextResponse.json({
          success: true,
          message: "Acceso concedido en modo desarrollo (error general ignorado)",
          tieneAcceso: true,
          userEmail,
          esDesarrollo: true
        });
      }
      
      throw dbError; // Re-lanzar para el manejador de catch general
    }
    
    // Obtener detalles de la membresía
    try {
      const { data: membresiaData, error: membresiaError } = await supabase
        .from("membresias_usuarios")
        .select(`
          id,
          tipo_membresia:membresia_tipos(*)
        `)
        .eq("id", userInfo.membresia_activa_id)
        .single();
        
      if (membresiaError) {
        console.error("Error al verificar detalles de membresía:", membresiaError);
        
        // En modo desarrollo, permitir acceso incluso con error
        if (appMode === 'development') {
          console.log("MODO DESARROLLO: Concediendo acceso a pesar del error en consulta de membresía");
          return NextResponse.json({
            success: true,
            message: "Acceso concedido en modo desarrollo (error de membresía ignorado)",
            tieneAcceso: true,
            userEmail,
            esDesarrollo: true,
            errorIgnorado: membresiaError.message
          });
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: "Error al verificar detalles de membresía",
            detalleError: membresiaError?.message || "Error desconocido"
          },
          { status: 500 }
        );
      }
      
      if (!membresiaData) {
        // En modo desarrollo, permitir acceso incluso sin datos de membresía
        if (appMode === 'development') {
          console.log("MODO DESARROLLO: Concediendo acceso sin datos de membresía");
          return NextResponse.json({
            success: true,
            message: "Acceso concedido en modo desarrollo (sin datos de membresía)",
            tieneAcceso: true,
            userEmail,
            esDesarrollo: true
          });
        }
        
        return NextResponse.json({
          success: false,
          error: "No se encontraron datos de la membresía",
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
      
      // Para depurar problemas, registrar información detallada
      console.log("Resultado de verificación IA:", {
        tieneAccesoIA,
        tipoMembresiaNombre: tipoMembresia?.nombre,
        tipoMembresiaId: tipoMembresia?.id,
        tipoMembresiaTieneAI: tipoMembresia?.tiene_ai
      });
      
      // En modo desarrollo, garantizar acceso incluso si no tiene AI en su plan
      if (appMode === 'development' && !tieneAccesoIA) {
        console.log("MODO DESARROLLO: Concediendo acceso a pesar de no tener AI en su plan");
        return NextResponse.json({
          success: true,
          message: "Acceso concedido en modo desarrollo (sin acceso a IA en plan)",
          tieneAcceso: true,
          userEmail,
          esDesarrollo: true,
          planOriginal: tipoMembresia?.nombre || "Desconocido"
        });
      }
      
    } catch (membresiaError) {
      console.error("Error general al verificar membresía:", membresiaError);
      
      // En modo desarrollo, permitir acceso incluso con error
      if (appMode === 'development') {
        console.log("MODO DESARROLLO: Concediendo acceso a pesar de error grave en verificación");
        return NextResponse.json({
          success: true,
          message: "Acceso concedido en modo desarrollo (error grave ignorado)",
          tieneAcceso: true,
          userEmail,
          esDesarrollo: true
        });
      }
      
      throw membresiaError; // Re-lanzar para el manejador de catch general
    }
    
    // Si llegamos hasta aquí, verificamos si estamos en desarrollo pero no hay acceso a IA
    if (appMode === 'development' && !tieneAccesoIA) {
      console.log("MODO DESARROLLO (final): Concediendo acceso a pesar de no tener IA");
      return NextResponse.json({
        success: true,
        tieneAcceso: true, // Forzar a true en desarrollo
        tipoMembresia: tipoMembresia ? {
          id: tipoMembresia.id,
          nombre: tipoMembresia.nombre,
          tiene_ai: true // Forzar a true en desarrollo
        } : {
          id: "simulado-development",
          nombre: "Plan Premium (Simulado)",
          tiene_ai: true
        },
        modoDesarrollo: true
      });
    }
    
    // Respuesta normal en producción
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
    console.error("Error grave en verificación de IA:", error);
    
    // En modo desarrollo, permitir acceso incluso ante errores graves
    const appMode = process.env.APP_MODE || 'development';
    if (appMode === 'development') {
      console.log("MODO DESARROLLO: Concediendo acceso a pesar de error grave");
      return NextResponse.json({
        success: true,
        tieneAcceso: true,
        message: "Acceso concedido en modo desarrollo (error grave ignorado)",
        esDesarrollo: true,
        errorIgnorado: error.message
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Error al verificar acceso a IA" 
      },
      { status: 500 }
    );
  }
}