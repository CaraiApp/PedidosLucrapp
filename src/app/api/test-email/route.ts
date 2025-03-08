import { NextResponse } from 'next/server';
import { enviarCorreoDesdeServidor } from '@/lib/email-server';

// Ruta para pruebas de envío de correo electrónico
export async function POST(request: Request) {
  try {
    // Obtener datos del cuerpo de la petición
    const body = await request.json();
    console.log("Cuerpo de la petición recibido:", body);  // Registrar el cuerpo completo
    
    const { destinatario, asunto, contenido } = body;
    
    // Validar campos obligatorios
    if (!destinatario || !asunto || !contenido) {
      console.log("Faltan campos obligatorios:", { destinatario, asunto, contenido });
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: destinatario, asunto, contenido' },
        { status: 400 }
      );
    }
    
    console.log("Preparando envío de prueba a:", destinatario);
    
    // Enviar un correo de prueba usando la implementación del servidor
    const resultado = await enviarCorreoDesdeServidor(
      destinatario,
      asunto,
      contenido
    );
    
    // Registrar el resultado en detalle para diagnóstico
    console.log('Resultado detallado del envío de prueba:', JSON.stringify(resultado));
    
    if (!resultado.success) {
      return NextResponse.json(
        { 
          error: 'Error al enviar el correo de prueba', 
          details: resultado.error,
          errorData: resultado.details
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      statusCode: resultado.statusCode,
      timestamp: resultado.timestamp,
      message: "Correo enviado correctamente. Verifica tu bandeja de entrada."
    });
  } catch (error: any) {
    console.error('Error al enviar correo de prueba:', error);
    return NextResponse.json(
      { 
        error: 'Error al enviar el correo de prueba', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Ruta GET pública para pruebas (no requiere autenticación)
export async function GET(request: Request) {
  console.log("Solicitud GET de prueba de email recibida");
  
  // Obtener el email para prueba desde parámetros de consulta
  const { searchParams } = new URL(request.url);
  const emailDestino = searchParams.get('email');
  
  console.log("Email destino:", emailDestino);
  
  // Validar el email
  if (!emailDestino) {
    console.log("Email no proporcionado en la solicitud");
    return NextResponse.json(
      { error: 'Se requiere el parámetro email' },
      { status: 400 }
    );
  }
  
  try {
    // Enviar un correo de prueba con contenido predefinido
    console.log("Enviando correo de prueba a:", emailDestino);
    
    const resultado = await enviarCorreoDesdeServidor(
      emailDestino,
      "Prueba de configuración con SendGrid en Lucrapp",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">¡Configuración exitosa!</h1>
        <p>Este es un correo de prueba para verificar que la configuración de SendGrid está funcionando correctamente.</p>
        <p>Si estás recibiendo este email, significa que todo está configurado correctamente.</p>
        <p>Fecha y hora: ${new Date().toLocaleString()}</p>
        <div style="margin-top: 30px; padding: 20px 0; border-top: 1px solid #eaeaea;">
          <p style="color: #666; font-size: 14px;">Saludos,<br>El equipo de Lucrapp</p>
        </div>
      </div>
      `
    );
    
    // Registrar el resultado en detalle para diagnóstico
    console.log('Resultado detallado del envío de prueba (GET):', JSON.stringify(resultado));
    
    if (!resultado.success) {
      console.error("Error al enviar email:", resultado.error);
      return NextResponse.json(
        { 
          error: 'Error al enviar el correo de prueba', 
          details: resultado.error,
          errorData: resultado.details
        },
        { status: 500 }
      );
    }
    
    console.log("Email enviado con éxito");
    return NextResponse.json({
      success: resultado.success,
      statusCode: resultado.statusCode,
      timestamp: resultado.timestamp,
      message: "Correo enviado correctamente. Verifica tu bandeja de entrada."
    });
  } catch (error: any) {
    console.error('Error al enviar correo de prueba:', error);
    return NextResponse.json(
      { 
        error: 'Error al enviar el correo de prueba', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}