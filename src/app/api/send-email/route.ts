import { NextResponse } from 'next/server';
import { enviarCorreoDesdeServidor } from '@/lib/email-server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Obtener y validar el body de la petición
    const body = await request.json();
    const { destinatario, asunto, contenido, token } = body;
    
    if (!destinatario || !asunto || !contenido) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Verificar autenticación
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar que el token es válido
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado', details: authError?.message },
        { status: 401 }
      );
    }
    
    // Verificar que el usuario es admin (opcional, puedes comentar esto para permitir a cualquier usuario enviar correos)
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('rol, id')
      .eq('id', user.id)
      .single();
      
    if (userError || !userData || (userData.rol !== 'admin' && userData.rol !== 'superadmin')) {
      return NextResponse.json(
        { error: 'No tienes permisos para enviar correos' },
        { status: 403 }
      );
    }
    
    // Enviar el correo usando la implementación del servidor
    const resultado = await enviarCorreoDesdeServidor(destinatario, asunto, contenido);
    
    // Registrar detalladamente el resultado para diagnóstico
    console.log('Resultado detallado del envío:', JSON.stringify(resultado));
    
    if (!resultado.success) {
      console.error('Error al enviar correo:', resultado.error);
      return NextResponse.json(
        { error: 'Error al enviar el correo', details: resultado.error },
        { status: 500 }
      );
    }
    
    // Registrar el envío en la base de datos para tener un historial (opcional)
    const { error: logError } = await supabase
      .from('log_comunicaciones')
      .insert({
        remitente_id: userData.id,
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
    
    return NextResponse.json({
      success: true,
      statusCode: resultado.statusCode,
      timestamp: resultado.timestamp
    });
    
  } catch (error: any) {
    console.error('Error en API send-email:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}