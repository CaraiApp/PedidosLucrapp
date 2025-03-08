// Este archivo es SOLO para uso del servidor (no importar en componentes cliente)
import sgMail from '@sendgrid/mail';

// Inicializar SendGrid (se hará una vez que se establezca la API key)
let sendgridInitialized = false;

/**
 * Envía un correo electrónico usando SendGrid directamente (solo servidor)
 * @param destinatario Email del destinatario
 * @param asunto Asunto del correo
 * @param contenidoHtml Contenido HTML del correo
 * @returns Objeto con el resultado del envío
 */
export async function enviarCorreoDesdeServidor(
  destinatario: string,
  asunto: string,
  contenidoHtml: string
) {
  try {
    // Validación básica
    if (!destinatario || !asunto || !contenidoHtml) {
      throw new Error("Todos los campos son obligatorios: destinatario, asunto y contenido");
    }

    // Inicializar SendGrid si aún no está inicializado
    if (!sendgridInitialized) {
      if (!process.env.SENDGRID_API_KEY) {
        throw new Error("SENDGRID_API_KEY no está configurada en las variables de entorno");
      }
      console.log("Inicializando SendGrid con API Key");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      sendgridInitialized = true;
    }

    const emailRemitente = process.env.EMAIL_REMITENTE || "noreply@lucrapp.com";
    const nombreRemitente = process.env.NOMBRE_REMITENTE || "Lucrapp";
    
    console.log(`Configurando correo desde: ${emailRemitente} (${nombreRemitente})`);
    console.log(`Para enviar a: ${destinatario}`);
    
    // IMPORTANTE: El email remitente debe estar verificado en SendGrid
    // Si estás en modo de pruebas, es más fácil usar una dirección de Gmail o similar
    // que ya esté verificada para pruebas
    
    const mensaje = {
      to: destinatario,
      from: {
        email: emailRemitente,
        name: nombreRemitente
      },
      subject: asunto,
      html: contenidoHtml,
      // Versión en texto plano
      text: contenidoHtml.replace(/<[^>]*>/g, '')
    };

    console.log("Enviando mensaje a través de SendGrid...");
    const response = await sgMail.send(mensaje);
    
    console.log("Correo enviado correctamente:", response[0].statusCode);
    return { 
      success: true, 
      statusCode: response[0].statusCode,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("Error al enviar correo:", error);
    
    // Extraer información detallada del error de SendGrid
    let errorMsg = error.message || "Error desconocido";
    let errorDetails = null;
    
    if (error.response && error.response.body) {
      try {
        errorDetails = error.response.body;
        console.error("Detalles del error de SendGrid:", JSON.stringify(errorDetails));
      } catch (e) {
        console.error("No se pudieron parsear los detalles del error");
      }
    }
    
    if (errorMsg.includes("does not exist or is not verified")) {
      errorMsg = "El remitente no está verificado en SendGrid. Por favor, verifica tu dirección de correo en la plataforma de SendGrid.";
    }
    
    return { 
      success: false, 
      error: errorMsg,
      details: errorDetails,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Envía una plantilla de correo para bienvenida de nuevos usuarios (versión servidor)
 * @param email Email del usuario
 * @param nombre Nombre del usuario
 */
export async function enviarEmailBienvenidaDesdeServidor(email: string, nombre: string) {
  const asunto = "¡Bienvenido a Lucrapp!";
  const contenido = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">¡Bienvenido a Lucrapp!</h1>
      <p>Hola ${nombre},</p>
      <p>Gracias por registrarte en nuestra plataforma. Estamos encantados de tenerte como usuario.</p>
      <p>Con Lucrapp podrás gestionar tus:</p>
      <ul>
        <li>Proveedores</li>
        <li>Artículos</li>
        <li>Listas de compra</li>
      </ul>
      <p>Si tienes cualquier duda o sugerencia, no dudes en contactarnos.</p>
      <div style="margin-top: 30px; padding: 20px 0; border-top: 1px solid #eaeaea;">
        <p style="color: #666; font-size: 14px;">Saludos,<br>El equipo de Lucrapp</p>
      </div>
    </div>
  `;
  
  return await enviarCorreoDesdeServidor(email, asunto, contenido);
}

/**
 * Envía una notificación sobre la membresía (versión servidor)
 * @param email Email del usuario
 * @param nombre Nombre del usuario
 * @param tipoMembresia Tipo de membresía asignada
 * @param fechaExpiracion Fecha de expiración de la membresía
 */
export async function notificarMembresiaDesdeServidor(
  email: string, 
  nombre: string,
  tipoMembresia: string,
  fechaExpiracion: string
) {
  const fechaFormateada = new Date(fechaExpiracion).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  
  const asunto = `Tu membresía ${tipoMembresia} ha sido activada`;
  const contenido = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #4f46e5;">¡Membresía Activada!</h1>
      <p>Hola ${nombre},</p>
      <p>Nos complace informarte que tu membresía <strong>${tipoMembresia}</strong> ha sido activada correctamente.</p>
      <p>Detalles de tu membresía:</p>
      <ul>
        <li><strong>Tipo:</strong> ${tipoMembresia}</li>
        <li><strong>Fecha de expiración:</strong> ${fechaFormateada}</li>
      </ul>
      <p>Disfruta de todos los beneficios de tu membresía.</p>
      <div style="margin-top: 30px; padding: 20px 0; border-top: 1px solid #eaeaea;">
        <p style="color: #666; font-size: 14px;">Saludos,<br>El equipo de Lucrapp</p>
      </div>
    </div>
  `;
  
  return await enviarCorreoDesdeServidor(email, asunto, contenido);
}