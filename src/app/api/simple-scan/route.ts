import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import Anthropic from '@anthropic-ai/sdk';

// Inicializar el cliente de Anthropic con la clave API (asumimos que está configurada)
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
console.log("API Key configurada:", anthropicApiKey ? "Sí" : "No");

const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
});

export async function POST(request: NextRequest) {
  console.log("API simple-scan: Recibida solicitud");
  
  try {
    // Obtener el formData
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: "No se proporcionó ninguna imagen" },
        { status: 400 }
      );
    }
    
    console.log("Archivo recibido:", imageFile.name, imageFile.type, imageFile.size);
    
    // Convertir la imagen a base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    
    // PARTE SIMPLE: Devolver éxito sin procesar con IA
    return NextResponse.json({
      success: true,
      message: "Archivo recibido correctamente",
      filename: imageFile.name,
      filesize: imageFile.size,
      filetype: imageFile.type,
      // Datos simulados para pruebas
      datos: {
        proveedor: {
          nombre: "Proveedor de Prueba",
          cif: "B12345678",
          direccion: "Calle de Prueba, 123",
          telefono: "123456789",
          email: "prueba@ejemplo.com"
        },
        articulos: [
          {
            nombre: "Artículo de Prueba 1",
            cantidad: 1,
            precio: 10.0,
            sku: "ART001"
          },
          {
            nombre: "Artículo de Prueba 2",
            cantidad: 2,
            precio: 20.0,
            sku: "ART002"
          }
        ]
      }
    });
    
  } catch (error: any) {
    console.error("Error en simple-scan:", error);
    return NextResponse.json(
      { error: error.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}