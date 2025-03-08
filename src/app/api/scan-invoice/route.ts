import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import Anthropic from '@anthropic-ai/sdk';

// Inicializar el cliente de Anthropic con la clave API
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario tiene acceso a las funcionalidades de IA
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = sessionData.session.user.id;

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

    // Obtener la formData con la imagen
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

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

    // Procesar la imagen con Claude
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
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
                "IMPORTANTE: Si no encuentras algún dato, déjalo como una cadena vacía o 0. Asegúrate de que el JSON sea válido."
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

    // Extraer el texto de la respuesta
    const textContent = response.content
      .filter(item => item.type === 'text')
      .map(item => (item as any).text)
      .join('');

    // Extraer el JSON de la respuesta
    let jsonData;
    try {
      // Buscar el JSON en la respuesta utilizando una expresión regular
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se encontró JSON en la respuesta");
      }
    } catch (error) {
      console.error("Error al procesar la respuesta JSON:", error);
      return NextResponse.json(
        { error: "Error al procesar la respuesta de la IA" },
        { status: 500 }
      );
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