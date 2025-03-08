import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { cookies } from "next/headers";

// Obtener la clave API de Anthropic de las variables de entorno
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    // Obtener el formData
    const formData = await request.formData();

    // Usar cookies para diagnóstico
    const cookieStore = cookies();
    console.log(
      "Cookies disponibles:",
      cookieStore.getAll().map((c) => c.name)
    );

    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    console.log("Sesión detectada:", !!sessionData?.session);

    // Usar ID fijo de Luis para testing
    const userId = "def38ca4-63a6-4ce1-8dbd-32abda08a14c";

    // Obtener email del usuario
    let userEmail = "luiscrouseillesvillena@gmail.com";

    // Omitir por completo la verificación de membresía para modo de desarrollo
    console.log("MODO DESARROLLO: Omitiendo verificación de membresía");

    // NOTA: En modo producción, aquí iría el código para verificar la membresía
    // pero por ahora lo omitimos para facilitar las pruebas

    // Obtener la imagen del formData
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo" },
        { status: 400 }
      );
    }

    // Convertir el archivo a base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    if (!anthropicApiKey) {
      return NextResponse.json(
        { error: "Error de configuración: API key no disponible" },
        { status: 500 }
      );
    }

    // Verificar si es un PDF o una imagen
    const mimeType = detectMimeType(file);
    const isPdf = mimeType === "application/pdf";

    console.log(
      `Procesando archivo: ${file.name} (${mimeType}), es PDF: ${isPdf}`
    );

    // Si es un PDF, necesitamos usar un modelo más potente
    const model = isPdf ? "claude-3-opus-20240229" : "claude-3-haiku-20240307";
    console.log(
      `Usando modelo: ${model} para procesar ${isPdf ? "PDF" : "imagen"}`
    );

    try {
      // Preparar los mensajes para la API de Claude
      const messages = [
        {
          role: "user",
          content: [],
        },
      ];

      // Añadir instrucciones
      messages[0].content.push({
        type: "text",
        text:
          "Analiza esta " +
          (isPdf ? "factura en PDF" : "imagen de una factura") +
          " y extrae la siguiente información estructurada:\n\n" +
          "1. Información del proveedor:\n" +
          "   - Nombre del proveedor\n" +
          "   - CIF/NIF (generalmente comienza con una letra seguida de 8 números, como B12345678 y tienes que tener en cuenta que no sea el mismo que el cif de los datos de facturación de la cuenta. puede estar también en uno de los márgenes de la factura escrito de maenra vertical.)\n" +
          "   - Dirección\n" +
          "   - Teléfono\n" +
          "   - Email\n\n" +
          "2. Información de artículos/productos (para cada línea):\n" +
          "   - Nombre del producto\n" +
          "   - Cantidad no es relevante\n" +
          "   - Precio unitario, normalmente en la columna de precio\n" +
          "   - Referencia o código (si está disponible)\n\n" +
          "Por favor, devuelve la información en formato JSON con la siguiente estructura:\n" +
          "{\n" +
          '  "proveedor": {\n' +
          '    "nombre": "",\n' +
          '    "cif": "",\n' +
          '    "direccion": "",\n' +
          '    "telefono": "",\n' +
          '    "email": ""\n' +
          "  },\n" +
          '  "articulos": [\n' +
          "    {\n" +
          '      "nombre": "",\n' +
          '      "cantidad": 0,\n' +
          '      "precio": 0.0,\n' +
          '      "sku": ""\n' +
          "    }\n" +
          "  ]\n" +
          "}\n\n" +
          "IMPORTANTE: Si no encuentras algún dato, déjalo como una cadena vacía o 0. Asegúrate de que el JSON sea válido. NO incluyas ningún texto adicional en tu respuesta, solo devuelve el JSON.",
      });

      // Añadir el archivo (imagen o PDF) con el tipo correcto
      if (isPdf) {
        messages[0].content.push({
          type: "file", // Para PDFs, usamos "file" en lugar de "document"
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        });
      } else {
        messages[0].content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType,
            data: base64Data,
          },
        });
      }

      // Llamar a la API de Claude
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4000,
          messages: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error de la API de Claude: ${response.status}`);
      }

      // Procesar la respuesta
      const result = await response.json();

      // Extraer el texto de la respuesta
      if (!result.content || !result.content[0] || !result.content[0].text) {
        throw new Error("Formato de respuesta inesperado de Claude");
      }

      const textContent = result.content[0].text;

      // Extraer el JSON de la respuesta
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No se encontró JSON en la respuesta");
      }

      const jsonData = JSON.parse(jsonMatch[0]);

      // Procesar los datos extraídos
      return await processExtractedData(jsonData, userId);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Error al procesar el documento" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

// Función para procesar los datos extraídos y buscar coincidencias
async function processExtractedData(jsonData: any, userId: string) {
  try {
    let proveedoresExistentes: any[] = [];
    let articulosExistentes: any[] = [];
    let proveedorExistente = null;

    // Obtener los proveedores existentes
    const { data: proveedores } = await supabase
      .from("proveedores")
      .select("id, nombre, cif")
      .eq("usuario_id", userId);

    if (proveedores) {
      proveedoresExistentes = proveedores;
    }

    // Obtener los artículos existentes
    const { data: articulos } = await supabase
      .from("articulos")
      .select("id, nombre, sku, proveedor_id")
      .eq("usuario_id", userId);

    if (articulos) {
      articulosExistentes = articulos;
    }

    // Comprobar si el proveedor ya existe
    if (proveedoresExistentes?.length && jsonData.proveedor?.cif) {
      proveedorExistente = proveedoresExistentes.find(
        (p) =>
          p.cif && p.cif.toLowerCase() === jsonData.proveedor.cif.toLowerCase()
      );
    }

    if (
      !proveedorExistente &&
      jsonData.proveedor?.nombre &&
      proveedoresExistentes?.length
    ) {
      proveedorExistente = proveedoresExistentes.find(
        (p) =>
          p.nombre.toLowerCase() === jsonData.proveedor.nombre.toLowerCase()
      );
    }

    // Añadir información sobre posibles artículos duplicados
    if (articulosExistentes?.length && jsonData.articulos) {
      jsonData.articulos = jsonData.articulos.map((articulo) => {
        const posiblesDuplicados = articulosExistentes.filter(
          (a) =>
            (articulo.nombre &&
              a.nombre.toLowerCase().includes(articulo.nombre.toLowerCase())) ||
            (articulo.sku &&
              a.sku &&
              a.sku.toLowerCase() === articulo.sku.toLowerCase())
        );

        return {
          ...articulo,
          posiblesDuplicados:
            posiblesDuplicados.length > 0 ? posiblesDuplicados : null,
        };
      });
    }

    // Devolver los datos procesados
    return NextResponse.json({
      datos: jsonData,
      proveedorExistente: proveedorExistente || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Error al procesar los datos extraídos" },
      { status: 500 }
    );
  }
}

// Función auxiliar para detectar el tipo MIME basado en el nombre del archivo
function detectMimeType(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    default:
      // Si no podemos determinar la extensión, intentamos con el tipo del archivo
      if (file.type) {
        return file.type;
      }
      return "application/octet-stream";
  }
}
