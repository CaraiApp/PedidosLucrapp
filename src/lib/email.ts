// Este archivo ahora está diseñado para ser compatible con el cliente
// Las importaciones de NodeJS (como SendGrid) deben usarse solo en el servidor

/**
 * Envía un correo electrónico usando la API
 * Esta versión es compatible con cliente y servidor
 * @param destinatario Email del destinatario
 * @param asunto Asunto del correo
 * @param contenidoHtml Contenido HTML del correo
 * @returns Objeto con el resultado del envío
 */
export async function enviarCorreo(
  destinatario: string,
  asunto: string,
  contenidoHtml: string
) {
  try {
    // Validación básica
    if (!destinatario || !asunto || !contenidoHtml) {
      throw new Error("Todos los campos son obligatorios: destinatario, asunto y contenido");
    }

    // Enviar a través de nuestra API en lugar de importar SendGrid directamente
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destinatario,
        asunto,
        contenido: contenidoHtml,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || result.details || "Error al enviar el correo");
    }
    
    return { 
      success: true, 
      statusCode: 200,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("Error al enviar correo:", error);
    
    // Extraer información del error
    let errorMsg = error.message || "Error desconocido";
    
    if (errorMsg.includes("verified")) {
      errorMsg = "El remitente no está verificado en SendGrid. Por favor, verifica tu dirección de correo.";
    }
    
    return { 
      success: false, 
      error: errorMsg,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Envía una plantilla de correo para bienvenida de nuevos usuarios
 * @param email Email del usuario
 * @param nombre Nombre del usuario
 */
export async function enviarEmailBienvenida(email: string, nombre: string) {
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
  
  // En el cliente, usamos la API
  return await enviarCorreo(email, asunto, contenido);
}

/**
 * Envía una notificación sobre la membresía
 * @param email Email del usuario
 * @param nombre Nombre del usuario
 * @param tipoMembresia Tipo de membresía asignada
 * @param fechaExpiracion Fecha de expiración de la membresía
 */
export async function notificarMembresia(
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
  
  // En el cliente, usamos la API
  return await enviarCorreo(email, asunto, contenido);
}