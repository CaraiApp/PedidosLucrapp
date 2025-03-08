// Este archivo es SOLO para uso del servidor (no importar en componentes cliente)
import sgMail from '@sendgrid/mail';

// Inicializar SendGrid (se hará una vez que se establezca la API key)
let sendgridInitialized = false;

// Control de límites de tasa para envío de emails
const EMAIL_RATE_LIMIT = {
  maxEmails: 10, // Máximo número de emails en el período
  periodMs: 60 * 1000, // Período de 1 minuto (en ms)
  waitTimeMs: 1500, // Tiempo de espera entre emails (ms)
  retryCount: 3, // Número de reintentos si falla por límite de tasa
  retryDelay: 2000, // Tiempo de espera entre reintentos (ms)
  emailsSent: 0, // Contador de emails enviados
  lastResetTime: Date.now(), // Último momento de reinicio del contador
};

// Función para resetear el contador si ha pasado el período
function checkAndResetLimit() {
  const now = Date.now();
  if (now - EMAIL_RATE_LIMIT.lastResetTime > EMAIL_RATE_LIMIT.periodMs) {
    console.log(`Reseteando contador de emails. Anterior: ${EMAIL_RATE_LIMIT.emailsSent}`);
    EMAIL_RATE_LIMIT.emailsSent = 0;
    EMAIL_RATE_LIMIT.lastResetTime = now;
    return true;
  }
  return false;
}

// Función para esperar antes de enviar otro email
function waitBetweenEmails() {
  return new Promise(resolve => setTimeout(resolve, EMAIL_RATE_LIMIT.waitTimeMs));
}

// Función para manejar reintentos con espera exponencial
async function withRetry<T>(fn: () => Promise<T>, retries = EMAIL_RATE_LIMIT.retryCount): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (
      retries > 0 && 
      (error.message?.includes('rate limit') || 
       error.message?.includes('too many requests') ||
       error.message?.includes('exceeded'))
    ) {
      console.log(`Error de límite de tasa. Reintentando en ${EMAIL_RATE_LIMIT.retryDelay}ms. Intentos restantes: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, EMAIL_RATE_LIMIT.retryDelay));
      // Incrementamos el tiempo de espera para el próximo reintento (espera exponencial)
      EMAIL_RATE_LIMIT.retryDelay *= 2;
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Envía un correo electrónico usando SendGrid directamente (solo servidor)
 * Con control de límites de tasa y reintentos automáticos
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

    // Comprobar si debemos resetear el contador de límite
    checkAndResetLimit();

    // Comprobar si hemos excedido el límite
    if (EMAIL_RATE_LIMIT.emailsSent >= EMAIL_RATE_LIMIT.maxEmails) {
      console.log(`Límite de emails alcanzado (${EMAIL_RATE_LIMIT.emailsSent}/${EMAIL_RATE_LIMIT.maxEmails}). Esperando al próximo período.`);
      // Esperamos hasta el inicio del siguiente período y reiniciamos
      await new Promise(resolve => setTimeout(resolve, EMAIL_RATE_LIMIT.periodMs));
      EMAIL_RATE_LIMIT.emailsSent = 0;
      EMAIL_RATE_LIMIT.lastResetTime = Date.now();
    }

    // Esperamos un poco entre emails para no saturar la API
    if (EMAIL_RATE_LIMIT.emailsSent > 0) {
      await waitBetweenEmails();
    }

    const emailRemitente = process.env.EMAIL_REMITENTE || "noreply@lucrapp.com";
    const nombreRemitente = process.env.NOMBRE_REMITENTE || "Lucrapp";
    
    console.log(`Configurando correo desde: ${emailRemitente} (${nombreRemitente})`);
    console.log(`Para enviar a: ${destinatario}`);
    
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

    console.log(`Enviando email #${EMAIL_RATE_LIMIT.emailsSent + 1} en este período...`);
    
    // Usar la función de reintento para enviar el correo
    const response = await withRetry(async () => {
      return await sgMail.send(mensaje);
    });
    
    // Incrementamos el contador de emails enviados
    EMAIL_RATE_LIMIT.emailsSent++;
    
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
    
    // Manejo de errores específicos
    if (errorMsg.includes("does not exist or is not verified")) {
      errorMsg = "El remitente no está verificado en SendGrid. Por favor, verifica tu dirección de correo en la plataforma de SendGrid.";
    } else if (errorMsg.includes("rate limit") || errorMsg.includes("exceeded") || errorMsg.includes("too many requests")) {
      errorMsg = "Límite de envío de correos alcanzado. Por favor, intenta más tarde.";
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