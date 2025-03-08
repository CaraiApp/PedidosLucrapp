'use client';

export const dynamic = 'force-dynamic';

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Mensaje } from "@/types";

export default function ConfiguracionEmail() {
  const [asunto, setAsunto] = useState("");
  const [contenido, setContenido] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Función para probar el envío de correo
  const enviarCorreoPrueba = async () => {
    if (!destinatario || !asunto || !contenido) {
      setMensaje({
        texto: "Debes completar todos los campos",
        tipo: "error"
      });
      return;
    }

    setEnviando(true);
    setMensaje(null);

    try {
      // En lugar de usar la API POST que requiere autenticación,
      // usamos la API GET que es más simple para pruebas
      const url = `/api/test-email?email=${encodeURIComponent(destinatario)}`;
      console.log("Probando envío de correo a:", url);
      
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        console.error("Error detallado:", result);
        
        // Mostrar mensaje de error específico si está disponible
        if (result.details && typeof result.details === 'string' && result.details.includes("verified")) {
          throw new Error("El remitente no está verificado en SendGrid. Por favor, verifica tu dirección de correo electrónico siguiendo las instrucciones.");
        }
        
        throw new Error(result.details || result.error || "Error al enviar el correo de prueba");
      }

      setMensaje({
        texto: "Correo de prueba enviado correctamente. Revisa tu bandeja de entrada.",
        tipo: "success"
      });
      
      // Limpiar el formulario tras el éxito
      setAsunto("");
      setContenido("");
    } catch (error: any) {
      console.error("Error al enviar correo de prueba:", error);
      setMensaje({
        texto: `Error: ${error.message || "Error desconocido"}`,
        tipo: "error"
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-6">Configuración de Email</h1>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-1">
          <h2 className="text-lg font-medium mb-4">Configuración actual</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Servicio de envío</h3>
              <p className="mt-1">SendGrid</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Estado de configuración</h3>
              <div className="mt-1 flex items-center">
                <span className="inline-flex h-2 w-2 rounded-full bg-yellow-400 mr-2"></span>
                <span>Pendiente de verificación</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-1">
          <h2 className="text-lg font-medium mb-4">Instrucciones de verificación</h2>
          <div className="prose">
            <p>Para poder enviar correos, necesitas verificar tu dirección de correo electrónico en SendGrid:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Inicia sesión en tu cuenta de <a href="https://app.sendgrid.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">SendGrid</a></li>
              <li>Ve a <strong>Settings &gt; Sender Authentication</strong></li>
              <li>Haz clic en <strong>Verify a Single Sender</strong></li>
              <li>Completa el formulario con tus datos y la dirección de correo que quieres usar</li>
              <li>Recibirás un email de verificación, haz clic en el enlace para confirmar</li>
              <li>Actualiza el archivo <code className="bg-gray-100 px-1 py-0.5 rounded">.env.local</code> con tu correo verificado:
                <pre className="bg-gray-100 p-2 rounded mt-2 overflow-x-auto text-xs">
                  EMAIL_REMITENTE=tu-correo-verificado@tudominio.com
                </pre>
              </li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> Si estás en modo de pruebas, puedes usar una dirección de Gmail verificada para hacer pruebas rápidas. La dirección del remitente <strong>debe estar verificada</strong> en SendGrid antes de poder enviar correos.
              </p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-medium mb-4">Probar envío de correo</h2>
          <p className="text-sm text-gray-500 mb-4">Envía un correo de prueba para verificar tu configuración.</p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="destinatario" className="block text-sm font-medium text-gray-700">
                Destinatario
              </label>
              <input
                type="email"
                id="destinatario"
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                placeholder="tu-email@ejemplo.com"
              />
            </div>
            
            <div>
              <label htmlFor="asunto" className="block text-sm font-medium text-gray-700">
                Asunto
              </label>
              <input
                type="text"
                id="asunto"
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Correo de prueba"
              />
            </div>
            
            <div>
              <label htmlFor="contenido" className="block text-sm font-medium text-gray-700">
                Contenido
              </label>
              <textarea
                id="contenido"
                rows={4}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Este es un correo de prueba..."
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                onClick={enviarCorreoPrueba}
                isLoading={enviando}
                disabled={enviando || !destinatario || !asunto || !contenido}
              >
                Enviar correo de prueba
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}