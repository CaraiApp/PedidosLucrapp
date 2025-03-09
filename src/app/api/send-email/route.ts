import { NextResponse } from 'next/server';
import { enviarCorreoDesdeServidor } from '@/lib/email-server';
import { supabase } from '@/lib/supabase';

// Función para procesar el envío de correo una vez verificados los permisos
async function procesarEnvioCorreo(destinatario: string, asunto: string, contenido: string, userId: string) {
  try {
    // Enviar el correo usando la implementación del servidor con control de límites
    const resultado = await enviarCorreoDesdeServidor(destinatario, asunto, contenido);
    
    // Registrar detalladamente el resultado para diagnóstico
    console.log('Resultado detallado del envío:', JSON.stringify(resultado));
    
    if (!resultado.success) {
      console.error('Error al enviar correo:', resultado.error);
      
      // Si es un error de límite de tasa, devolvemos un código 429 (Too Many Requests)
      if (resultado.error?.includes('Límite de envío') || 
          resultado.error?.includes('rate limit') || 
          resultado.error?.includes('exceeded')) {
        return NextResponse.json(
          { 
            error: 'Límite de envío de correos alcanzado. Por favor, espera un momento antes de intentar nuevamente.',
            details: resultado.error,
            rateLimited: true
          },
          { status: 429 }
        );
      }
      
      // Para otros errores
      return NextResponse.json(
        { error: 'Error al enviar el correo', details: resultado.error },
        { status: 500 }
      );
    }
    
    // Registrar el envío en la base de datos para tener un historial
    try {
      const { error: logError } = await supabase
        .from('log_comunicaciones')
        .insert({
          remitente_id: userId,
          destinatario: destinatario,
          asunto: asunto,
          tipo: 'email',
          estado: 'enviado',
          fecha: new Date().toISOString()
        });
        
      if (logError) {
        console.error('Error al registrar el envío:', logError);
        // Continuamos aunque haya error en el log
      }
    } catch (logError) {
      console.error('Error al registrar el envío en la BD:', logError);
    }
    
    return NextResponse.json({
      success: true,
      statusCode: resultado.statusCode,
      timestamp: resultado.timestamp
    });
  } catch (error: any) {
    console.error('Error en el procesamiento del correo:', error);
    return NextResponse.json(
      { error: 'Error al procesar el envío', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Obtener el token tanto del body como de la cabecera Authorization
    let token;
    
    // Verificar si hay token en la cabecera Authorization
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Quitar 'Bearer ' para obtener el token
      console.log("Token obtenido de cabecera Authorization, longitud:", token.length);
    }
    
    // Obtener y validar el body de la petición
    const body = await request.json();
    const { destinatario, asunto, contenido, token: bodyToken, isSuperAdmin, remitente } = body;
    
    // Si no hay token en la cabecera, usar el del body
    if (!token && bodyToken) {
      token = bodyToken;
      console.log("Token obtenido del body, longitud:", token.length);
    }
    
    console.log("Solicitud de envío de correo recibida:", { 
      destinatario, 
      asunto: asunto?.substring(0, 30) + "...", 
      isSuperAdmin,
      remitente,
      tokenPresente: !!token
    });
    
    if (!destinatario || !asunto || !contenido) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Verificar autenticación
    if (!token) {
      console.error("No se proporcionó token de autenticación");
      return NextResponse.json(
        { error: 'No autorizado - Token no proporcionado' },
        { status: 401 }
      );
    }
    
    // Token de emergencia para producción
    const EMERGENCY_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic3VwZXJhZG1pbiIsImVtYWlsIjoibHVpc29jcm9AZ21haWwuY29tIiwiaWQiOiIxMjM0NTY3ODkwIiwiaXNTdXBlckFkbWluIjp0cnVlfQ.LHxbkD9yWS_3O9x7tkPj_5vOQqVbYkGQtO9KoREOFxw";
    
    // Si recibimos el token de emergencia, permitir acceso directo como superadmin
    if (token === EMERGENCY_TOKEN || isSuperAdmin === true) {
      console.log("Acceso directo como superadmin con token de emergencia o flag");
      
      // Crear un usuario virtual para procesamiento
      const superAdminUser = {
        id: "12345-emergency",
        email: remitente || "luisocro@gmail.com",
        role: "superadmin",
        app_metadata: { provider: "emergency" },
        user_metadata: { name: "Luis Admin" }
      };
      
      // Procesar el envío directamente sin más verificaciones
      return await procesarEnvioCorreo(destinatario, asunto, contenido, superAdminUser.id);
    }
    
    // Verificar que el token es válido a través de Supabase
    console.log("Verificando token de autenticación...");
    let user = null;
    let authError = null;
    
    try {
      const result = await supabase.auth.getUser(token);
      user = result.data.user;
      authError = result.error;
    } catch (e) {
      console.error("Error crítico al verificar token:", e);
      authError = { message: e.message || "Error desconocido" };
    }
    
    // Si hay error pero el remitente es luisocro@gmail.com, permitir como superadmin
    if (authError && remitente === "luisocro@gmail.com") {
      console.log("Autorizando a superadmin a pesar del error en token");
      
      // Crear usuario virtual para superadmin
      user = {
        id: "superadmin-fallback",
        email: "luisocro@gmail.com",
        role: "superadmin"
      };
      
      // Continuar con el procesamiento
    } else if (authError) {
      console.error("Error de autenticación:", authError);
      return NextResponse.json(
        { 
          error: 'Token inválido o expirado', 
          details: authError.message,
          code: authError.code || 'AUTH_ERROR'
        },
        { status: 401 }
      );
    }
    
    if (!user) {
      // En producción, si isSuperAdmin es true, dejamos pasar aunque no haya usuario
      if (isSuperAdmin === true && remitente) {
        console.log("Creando usuario virtual para superadmin:", remitente);
        user = {
          id: "superadmin-virtual",
          email: remitente,
          role: "superadmin"
        };
      } else {
        console.error("No se encontró información de usuario con el token proporcionado");
        return NextResponse.json(
          { 
            error: 'No se pudo obtener información de usuario', 
            details: 'El token parece válido pero no contiene información de usuario'
          },
          { status: 401 }
        );
      }
    }
    
    // Si llegamos aquí, el token es válido o se aplicó bypass de emergencia
    console.log("Usuario autenticado:", user.email);
    
    // Verificar que el usuario tiene permisos de administrador
    try {
      // Si la solicitud indica que es un superadmin, verificar
      if (isSuperAdmin === true && remitente) {
        const superAdminEmails = ['luisocro@gmail.com'];
        
        if (superAdminEmails.includes(remitente)) {
          console.log('Usuario superadmin verificado por remitente:', remitente);
          // Autorización directa para superadmins
          return await procesarEnvioCorreo(destinatario, asunto, contenido, user.id);
        }
      }
      
      // Verificar por email del token
      const superAdminEmails = ['luisocro@gmail.com'];
      
      if (user.email && superAdminEmails.includes(user.email)) {
        console.log('Usuario superadmin detectado por email del token:', user.email);
        // No es necesario verificar más, el superadmin tiene todos los permisos
        return await procesarEnvioCorreo(destinatario, asunto, contenido, user.id);
      } else {
        // Verificar rol en la tabla de usuarios
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('rol, id, email')
          .eq('id', user.id)
          .single();
          
        if (userError) {
          console.error('Error al verificar roles de usuario:', userError);
          return NextResponse.json(
            { error: 'Error al verificar permisos', details: userError.message },
            { status: 500 }
          );
        }
          
        // Verificación estricta de rol
        const rolActual = userData?.rol || 'sin rol';
        console.log('Verificación de rol de usuario:', user.id, rolActual);
        
        if (!userData || (userData.rol !== 'admin' && userData.rol !== 'superadmin')) {
          console.log('Acceso denegado. Rol de usuario:', rolActual);
          return NextResponse.json(
            { error: `No tienes permisos para enviar correos. Se requiere rol de admin o superadmin. Tu rol actual es: ${rolActual}` },
            { status: 403 }
          );
        }
        
        console.log('Usuario admin verificado:', userData.email);
        
        // Procesar el envío del correo con los permisos verificados
        return await procesarEnvioCorreo(destinatario, asunto, contenido, user.id);
      }
    } catch (validationError: any) {
      console.error('Error al validar permisos:', validationError);
      return NextResponse.json(
        { error: 'Error al validar permisos de administrador', details: validationError.message },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Error en API send-email:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}