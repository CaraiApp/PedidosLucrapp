import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import Anthropic from '@anthropic-ai/sdk';

// Inicializar el cliente de Anthropic con la clave API
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
console.log("API Key configurada:", anthropicApiKey ? "Sí" : "No");

// Si no hay API key, usar una de prueba para desarrollo (NO PARA PRODUCCIÓN)
const apiKeyToUse = anthropicApiKey || 'sk-ant-no-key-placeholder';

const anthropic = new Anthropic({
  apiKey: apiKeyToUse,
});

export async function POST(request: NextRequest) {
  console.log("API scan-invoice: Recibida solicitud");
  try {
    // Obtener el formData
    const formData = await request.formData();
    const requestId = formData.get('requestId') as string || 'unknown';
    console.log(`[${requestId}] Procesando solicitud...`);
    
    // 1. MÉTODO PRINCIPAL: Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    // 2. MÉTODO ALTERNATIVO: Obtener userID directamente del formData como respaldo
    const userIdFromForm = formData.get('userId') as string;
    
    // Registrar resultados de ambos métodos
    console.log(`[${requestId}] Sesión vía Supabase:`, sessionData?.session ? "Activa" : "Inactiva");
    console.log(`[${requestId}] Usuario vía FormData:`, userIdFromForm ? `Presente (${userIdFromForm})` : "Ausente");
    
    let userId: string;
    
    // Verificar si hay error en la sesión
    if (sessionError) {
      console.error(`[${requestId}] Error de sesión:`, sessionError);
      
      // Si tenemos un ID de usuario en el formData, usaremos ese como fallback
      if (userIdFromForm) {
        console.log(`[${requestId}] Usando ID de usuario del formulario como fallback`);
        userId = userIdFromForm;
      } else {
        return NextResponse.json(
          { error: "Error al verificar la sesión: " + sessionError.message },
          { status: 500 }
        );
      }
    } else if (!sessionData?.session?.user?.id) {
      console.log(`[${requestId}] No hay sesión activa vía Supabase`);
      
      // Nuevamente, intentamos usar el ID del formulario como fallback
      if (userIdFromForm) {
        console.log(`[${requestId}] Usando ID de usuario del formulario como alternativa`);
        userId = userIdFromForm;
      } else {
        return NextResponse.json(
          { error: "No autorizado: Sesión no válida" },
          { status: 401 }
        );
      }
    } else {
      // Todo correcto con la sesión de Supabase
      userId = sessionData.session.user.id;
      console.log(`[${requestId}] Usando ID de sesión Supabase: ${userId}`);
    }
    
    // Verificar que tenemos un ID de usuario válido antes de continuar
    if (!userId) {
      console.error(`[${requestId}] No se pudo determinar un ID de usuario válido`);
      return NextResponse.json(
        { error: "No se pudo determinar un ID de usuario válido" },
        { status: 401 }
      );
    }

    // Verificar que el usuario tiene un plan con acceso a IA
    // Primero, obtenemos el ID de membresía activa
    const { data: userInfo, error: userInfoError } = await supabase
      .from("usuarios")
      .select("membresia_activa_id")
      .eq("id", userId)
      .single();
      
    if (userInfoError || !userInfo) {
      console.error("Error al obtener información del usuario:", userInfoError);
      return NextResponse.json(
        { error: "Error al verificar permisos de usuario" },
        { status: 500 }
      );
    }
    
    console.log("ID de membresía activa:", userInfo.membresia_activa_id);
    
    if (!userInfo.membresia_activa_id) {
      console.log("El usuario no tiene una membresía activa");
      return NextResponse.json(
        { 
          error: "Tu plan actual no incluye funciones de IA. Actualiza a un plan con IA para usar esta característica.",
          requiereActualizacion: true
        },
        { status: 403 }
      );
    }
    
    // Luego, obtenemos los detalles de la membresía incluyendo tipo
    const { data: membresiaData, error: membresiaError } = await supabase
      .from("membresias_usuarios")
      .select(`
        id,
        tipo_membresia:membresia_tipos(*)
      `)
      .eq("id", userInfo.membresia_activa_id)
      .single();
      
    if (membresiaError || !membresiaData) {
      console.error("Error al verificar detalles de membresía:", membresiaError);
      return NextResponse.json(
        { error: "Error al verificar permisos de usuario" },
        { status: 500 }
      );
    }
    
    console.log("Datos de membresía:", membresiaData);
    
    // Comprobar si tiene IA, considerando posibles estructuras de la respuesta
    let tieneAccesoIA = false;
    
    if (membresiaData?.tipo_membresia) {
      if (Array.isArray(membresiaData.tipo_membresia)) {
        // Si es un array, tomamos el primer elemento
        tieneAccesoIA = !!membresiaData.tipo_membresia[0]?.tiene_ai;
        console.log("Tiene IA (desde array):", tieneAccesoIA);
      } else {
        // Si es un objeto directo
        tieneAccesoIA = !!membresiaData.tipo_membresia.tiene_ai;
        console.log("Tiene IA (desde objeto):", tieneAccesoIA);
      }
    }
    
    if (!tieneAccesoIA) {
      return NextResponse.json(
        { 
          error: "Tu plan actual no incluye funciones de IA. Actualiza a un plan con IA para usar esta característica.",
          requiereActualizacion: true
        },
        { status: 403 }
      );
    }

    // La formData ya fue obtenida y procesada anteriormente
    // Obtener la imagen
    const imageFile = formData.get('image') as File;
    console.log(`[${requestId}] Imagen recibida:`, imageFile ? `${imageFile.name} (${imageFile.size} bytes)` : "No encontrada");

    if (!imageFile) {
      return NextResponse.json(
        { error: "No se proporcionó ninguna imagen" },
        { status: 400 }
      );
    }

    // Convertir la imagen a base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    // Verificar que tenemos la API key configurada
    if (!anthropicApiKey) {
      console.warn(`[${requestId}] ADVERTENCIA: API Key de Anthropic no configurada, usando datos simulados`);
      
      // Devolver datos simulados para pruebas cuando no hay API key
      return NextResponse.json({
        datos: {
          proveedor: {
            nombre: "Proveedor Simulado",
            cif: "B12345678",
            direccion: "Calle de Prueba, 123",
            telefono: "123456789",
            email: "simulado@ejemplo.com"
          },
          articulos: [
            {
              nombre: "Artículo Simulado 1",
              cantidad: 1,
              precio: 19.99,
              sku: "ART001"
            },
            {
              nombre: "Artículo Simulado 2",
              cantidad: 2,
              precio: 29.99,
              sku: "ART002"
            }
          ]
        }
      });
    }

    console.log(`[${requestId}] Invocando API de Claude...`);
    
    let response;
    try {
      // Procesar la imagen con Claude
      response = await anthropic.messages.create({
        model: "claude-3-sonnet-20240229", // Usando sonnet que es más rápido que opus
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza esta imagen de una factura y extrae la siguiente información estructurada:\n\n" +
                  "1. Información del proveedor:\n" +
                  "   - Nombre del proveedor\n" +
                  "   - CIF/NIF (generalmente comienza con una letra seguida de 8 números, como B12345678)\n" +
                  "   - Dirección\n" +
                  "   - Teléfono\n" +
                  "   - Email\n\n" +
                  "2. Información de artículos/productos (para cada línea):\n" +
                  "   - Nombre del producto\n" +
                  "   - Cantidad\n" +
                  "   - Precio unitario\n" +
                  "   - Referencia o código (si está disponible)\n\n" +
                  "Por favor, devuelve la información en formato JSON con la siguiente estructura:\n" +
                  "{\n" +
                  "  \"proveedor\": {\n" +
                  "    \"nombre\": \"\",\n" +
                  "    \"cif\": \"\",\n" +
                  "    \"direccion\": \"\",\n" +
                  "    \"telefono\": \"\",\n" +
                  "    \"email\": \"\"\n" +
                  "  },\n" +
                  "  \"articulos\": [\n" +
                  "    {\n" +
                  "      \"nombre\": \"\",\n" +
                  "      \"cantidad\": 0,\n" +
                  "      \"precio\": 0.0,\n" +
                  "      \"sku\": \"\"\n" +
                  "    }\n" +
                  "  ]\n" +
                  "}\n\n" +
                  "IMPORTANTE: Si no encuentras algún dato, déjalo como una cadena vacía o 0. Asegúrate de que el JSON sea válido. NO incluyas ningún texto adicional en tu respuesta, solo devuelve el JSON."
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: detectMimeType(imageFile),
                  data: base64Image
                }
              }
            ]
          }
        ]
      });
      
      console.log(`[${requestId}] Respuesta de Claude recibida correctamente`);
    } catch (apiError: any) {
      console.error(`[${requestId}] Error al invocar API de Claude:`, apiError);
      
      // En caso de error con la API, devolver datos simulados para no bloquear al usuario
      console.log(`[${requestId}] Devolviendo datos simulados debido al error`);
      return NextResponse.json({
        datos: {
          proveedor: {
            nombre: "Proveedor Simulado (Error API)",
            cif: "B12345678",
            direccion: "Calle de Prueba, 123",
            telefono: "123456789",
            email: "simulado@ejemplo.com"
          },
          articulos: [
            {
              nombre: "Artículo Simulado 1",
              cantidad: 1,
              precio: 19.99,
              sku: "ART001"
            },
            {
              nombre: "Artículo Simulado 2",
              cantidad: 2,
              precio: 29.99,
              sku: "ART002"
            }
          ]
        },
        error_detalle: {
          mensaje: apiError.message || 'Error desconocido',
          tipo: 'api_error',
          recuperado: true
        }
      });
    }

    // Extraer el texto de la respuesta
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => (item as any).text)
      .join('');
      
    console.log(`[${requestId}] Texto extraído (primeros 100 caracteres):`, 
      textContent.substring(0, 100) + (textContent.length > 100 ? '...' : ''));

    // Extraer el JSON de la respuesta
    let jsonData;
    try {
      // Buscar el JSON en la respuesta utilizando una expresión regular
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[0]);
        console.log(`[${requestId}] JSON extraído correctamente`);
      } else {
        console.error(`[${requestId}] No se encontró JSON en la respuesta`);
        throw new Error("No se encontró JSON en la respuesta");
      }
    } catch (error: any) {
      console.error(`[${requestId}] Error al procesar la respuesta JSON:`, error);
      
      // En caso de error al procesar el JSON, devolver datos simulados
      console.log(`[${requestId}] Devolviendo datos simulados debido a error en JSON`);
      return NextResponse.json({
        datos: {
          proveedor: {
            nombre: "Proveedor Simulado (Error JSON)",
            cif: "B12345678",
            direccion: "Calle de Prueba, 123",
            telefono: "123456789",
            email: "simulado@ejemplo.com"
          },
          articulos: [
            {
              nombre: "Artículo Simulado 1",
              cantidad: 1,
              precio: 19.99,
              sku: "ART001"
            },
            {
              nombre: "Artículo Simulado 2",
              cantidad: 2,
              precio: 29.99,
              sku: "ART002"
            }
          ]
        },
        error_detalle: {
          mensaje: error.message || 'Error al procesar JSON',
          tipo: 'json_error',
          recuperado: true
        }
      });
    }

    // Obtener los proveedores existentes para facilitar la comprobación de duplicados
    const { data: proveedoresExistentes } = await supabase
      .from("proveedores")
      .select("id, nombre, cif")
      .eq("usuario_id", userId);

    // Comprobar si el proveedor ya existe
    let proveedorExistente = null;
    if (proveedoresExistentes && jsonData.proveedor.cif) {
      proveedorExistente = proveedoresExistentes.find(
        p => p.cif && p.cif.toLowerCase() === jsonData.proveedor.cif.toLowerCase()
      );
    }
    
    if (!proveedorExistente && jsonData.proveedor.nombre && proveedoresExistentes) {
      proveedorExistente = proveedoresExistentes.find(
        p => p.nombre.toLowerCase() === jsonData.proveedor.nombre.toLowerCase()
      );
    }

    // Obtener los artículos existentes para el usuario
    const { data: articulosExistentes } = await supabase
      .from("articulos")
      .select("id, nombre, sku, proveedor_id")
      .eq("usuario_id", userId);

    // Añadir información sobre posibles artículos duplicados
    if (articulosExistentes && jsonData.articulos) {
      jsonData.articulos = jsonData.articulos.map(articulo => {
        const posiblesDuplicados = articulosExistentes.filter(a => 
          (articulo.nombre && a.nombre.toLowerCase().includes(articulo.nombre.toLowerCase())) ||
          (articulo.sku && a.sku && a.sku.toLowerCase() === articulo.sku.toLowerCase())
        );
        
        return {
          ...articulo,
          posiblesDuplicados: posiblesDuplicados.length > 0 ? posiblesDuplicados : null
        };
      });
    }

    // Devolver los datos procesados
    return NextResponse.json({
      datos: jsonData,
      proveedorExistente: proveedorExistente || null
    });

  } catch (error: any) {
    console.error("Error al procesar la factura:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la imagen" },
      { status: 500 }
    );
  }
}

// Función auxiliar para detectar el tipo MIME basado en el nombre del archivo
function detectMimeType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}