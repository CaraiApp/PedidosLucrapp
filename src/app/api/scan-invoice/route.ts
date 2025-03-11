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
    console.log("Cookies disponibles en diagnóstico");

    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    console.log("Sesión detectada:", !!sessionData?.session);

    // Usar ID fijo de Luis para testing
    const userId = "def38ca4-63a6-4ce1-8dbd-32abda08a14c";

    // Obtener email del usuario
    const userEmail = "luiscrouseillesvillena@gmail.com";

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
          content: [] as any[],
        },
      ];

      // Añadir instrucciones mejoradas
      messages[0].content.push({
        type: "text",
        text:
          "Analiza esta " +
          (isPdf ? "factura en PDF" : "imagen de una factura") +
          " y extrae la siguiente información estructurada con máxima precisión:\n\n" +
          "1. Información del proveedor (VENDEDOR):\n" +
          "   - Nombre del proveedor: IMPORTANTE: El proveedor/vendedor casi siempre aparece en la parte SUPERIOR IZQUIERDA de la factura. Busca el nombre más prominente en esta zona. NO confundas con los datos del cliente/comprador que suelen estar en la parte SUPERIOR DERECHA.\n" +
          "   - CIF/NIF: Busca el número fiscal asociado con el proveedor (generalmente comienza con una letra, seguida de 8 números, como B12345678). Suele aparecer junto a etiquetas como 'CIF:', 'NIF:', o cerca de los datos fiscales del proveedor en la parte IZQUIERDA. Puede estar en los márgenes de la factura escrito vertical u horizontalmente. Asegúrate de no confundirlo con el CIF del cliente/comprador que estará en otra zona.\n" +
          "   - Dirección: Busca la dirección completa del PROVEEDOR incluyendo calle, número, código postal y ciudad. Debe estar cerca del CIF del proveedor y del nombre del proveedor, generalmente en la parte SUPERIOR IZQUIERDA.\n" +
          "   - Teléfono: Busca números de contacto del proveedor, normalmente con formato 9XXXXXXXX o similar, en la zona de datos del proveedor.\n" +
          "   - Email: Busca direcciones de correo electrónico del proveedor, normalmente con formato xxx@xxx.xx, en la zona de datos del proveedor.\n\n" +
          "2. Información de artículos/productos:\n" +
          "   - Nombre del producto: Busca en la sección central o cuerpo de la factura, normalmente en columnas tituladas 'Descripción', 'Artículo', 'Concepto', 'Producto' o 'Detalle'. Extrae el NOMBRE COMPLETO del artículo sin truncarlo.\n" +
          "   - Precio unitario: Busca en columnas tituladas 'Precio', 'P.Unit', 'Importe unidad', '€/ud', o similar. Asegúrate de extraer el precio unitario, NO el precio total.\n" +
          "   - Referencia/código/SKU: Busca en columnas tituladas 'Ref.', 'Código', 'SKU', 'Referencia' o al inicio de cada línea de producto.\n\n" +
          "Instrucciones específicas para la extracción de artículos:\n" +
          "- Identifica claramente la tabla o listado de productos en el documento\n" +
          "- Asegúrate de capturar CADA LÍNEA de producto como un artículo separado\n" +
          "- Si el nombre del producto está en varias líneas, unifícalo en una sola entrada\n" +
          "- NO confundas totales, subtotales o resúmenes con artículos individuales\n" +
          "- NO incluyas impuestos, gastos de envío o cargos adicionales como artículos\n" +
          "- Extrae los precios SIN IVA cuando sea posible identificarlos\n" +
          "- Si hay códigos de producto claramente identificables, inclúyelos en el campo 'sku'\n\n" +
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
          "IMPORTANTE: Si no encuentras algún dato, déjalo como una cadena vacía o 0. Asegúrate de que el JSON sea válido. NO incluyas ningún texto adicional en tu respuesta, solo devuelve el JSON. Prioriza la MÁXIMA PRECISIÓN en la extracción de nombres y precios de los artículos.",
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

    // Añadir información sobre posibles artículos duplicados con detección mejorada
    if (articulosExistentes?.length && jsonData.articulos) {
      // Filtrar artículos con información insuficiente o errónea
      jsonData.articulos = jsonData.articulos
        .filter((articulo: any) => {
          // Verificar que el artículo tenga nombre y precio válido
          const nombreValido = articulo.nombre && articulo.nombre.trim().length > 1; // Al menos 2 caracteres
          const precioValido = articulo.precio && !isNaN(articulo.precio) && articulo.precio > 0;
          
          // Excluir líneas que claramente no son artículos (totales, subtotales, etc.)
          const esNoArticulo = articulo.nombre && 
            /^(total|subtotal|suma|base( imponible)?|iva|igic|impuesto|dto\.?|descuento|portes|gastos|env[ií]o)/i.test(articulo.nombre);
          
          return nombreValido && precioValido && !esNoArticulo;
        })
        .map((articulo: any) => {
          // Mejorar la detección de duplicados usando algoritmos de similitud
          const posiblesDuplicados = articulosExistentes.filter((a: any) => {
            // Si hay coincidencia exacta de SKU, es un duplicado más probable
            if (articulo.sku && a.sku && 
               articulo.sku.toLowerCase() === a.sku.toLowerCase()) {
              return true;
            }
            
            // Si los nombres son idénticos o muy similares
            if (articulo.nombre && a.nombre) {
              const nombreArticulo = articulo.nombre.toLowerCase();
              const nombreExistente = a.nombre.toLowerCase();
              
              // Coincidencia exacta
              if (nombreArticulo === nombreExistente) {
                return true;
              }
              
              // Uno contiene al otro (para manejar variaciones en el nombre)
              if (nombreArticulo.includes(nombreExistente) || 
                  nombreExistente.includes(nombreArticulo)) {
                return true;
              }
              
              // Comparar palabras clave (para nombres que difieren en formato pero son el mismo producto)
              const palabrasArticulo = nombreArticulo.split(/\s+/).filter(p => p.length > 3);
              const palabrasExistente = nombreExistente.split(/\s+/).filter(p => p.length > 3);
              
              // Si comparten al menos 2 palabras clave, considerar como posible duplicado
              let palabrasComunes = 0;
              for (const palabra of palabrasArticulo) {
                if (palabrasExistente.some(p => p.includes(palabra) || palabra.includes(p))) {
                  palabrasComunes++;
                }
              }
              
              return palabrasComunes >= 2;
            }
            
            return false;
          });
          
          // Si encontramos un proveedor coincidente, asignar todos los productos de ese proveedor como posibles duplicados
          const proveedorCoincidente = proveedorExistente ? proveedorExistente.id : null;
          let duplicadosPorProveedor = [];
          
          if (proveedorCoincidente) {
            duplicadosPorProveedor = articulosExistentes.filter(
              a => a.proveedor_id === proveedorCoincidente && 
                   a.nombre.toLowerCase().includes(articulo.nombre.substring(0, 5).toLowerCase())
            );
          }
          
          // Combinar ambas listas de duplicados y eliminar duplicados
          const todosDuplicados = [...posiblesDuplicados, ...duplicadosPorProveedor];
          const duplicadosUnicos = todosDuplicados.filter((item, index, self) => 
            self.findIndex(t => t.id === item.id) === index
          );

          return {
            ...articulo,
            posiblesDuplicados: duplicadosUnicos.length > 0 ? duplicadosUnicos : null,
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
