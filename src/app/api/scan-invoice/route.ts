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

    // Añadir información sobre posibles artículos duplicados con detección reforzada
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
          // SISTEMA MEJORADO DE DETECCIÓN DE DUPLICADOS
          
          // Array para almacenar duplicados con nivel de confianza
          const duplicadosConConfianza = [];
          
          // 1. COINCIDENCIA POR REFERENCIA/SKU (Confianza Alta - 0.95)
          if (articulo.sku && articulo.sku.trim() !== '') {
            const skuNormalizado = articulo.sku.toLowerCase().trim().replace(/[-\s.,;]/g, '');
            
            // Búsqueda exacta de SKU
            articulosExistentes.forEach(a => {
              if (a.sku && a.sku.trim() !== '') {
                const existenteSkuNormalizado = a.sku.toLowerCase().trim().replace(/[-\s.,;]/g, '');
                
                // Coincidencia exacta de SKU o código de referencia
                if (skuNormalizado === existenteSkuNormalizado) {
                  duplicadosConConfianza.push({
                    articulo: a,
                    confianza: 0.95,
                    razon: 'Coincidencia exacta de referencia/SKU'
                  });
                }
              }
            });
          }
          
          // 2. COINCIDENCIA EXACTA DE NOMBRE (Confianza Alta - 0.9)
          if (articulo.nombre && articulo.nombre.trim() !== '') {
            const nombreNormalizado = articulo.nombre.toLowerCase().trim();
            
            articulosExistentes.forEach(a => {
              // Si ya está en la lista por coincidencia de SKU, omitir
              if (duplicadosConConfianza.some(d => d.articulo.id === a.id && d.confianza >= 0.9)) {
                return;
              }
              
              if (a.nombre && a.nombre.trim() !== '') {
                const existenteNombreNormalizado = a.nombre.toLowerCase().trim();
                
                // Coincidencia exacta de nombre
                if (nombreNormalizado === existenteNombreNormalizado) {
                  duplicadosConConfianza.push({
                    articulo: a,
                    confianza: 0.9,
                    razon: 'Coincidencia exacta de nombre'
                  });
                }
              }
            });
          }
          
          // 3. COINCIDENCIA POR INCLUSIÓN DE NOMBRE (Confianza Media - 0.75)
          if (articulo.nombre && articulo.nombre.trim() !== '') {
            const nombreNormalizado = articulo.nombre.toLowerCase().trim();
            
            articulosExistentes.forEach(a => {
              // Si ya está en la lista con alta confianza, omitir
              if (duplicadosConConfianza.some(d => d.articulo.id === a.id && d.confianza >= 0.75)) {
                return;
              }
              
              if (a.nombre && a.nombre.trim() !== '') {
                const existenteNombreNormalizado = a.nombre.toLowerCase().trim();
                
                // Uno contiene al otro (A contiene B o B contiene A)
                if (nombreNormalizado.includes(existenteNombreNormalizado) || 
                    existenteNombreNormalizado.includes(nombreNormalizado)) {
                  duplicadosConConfianza.push({
                    articulo: a,
                    confianza: 0.75,
                    razon: 'Un nombre contiene al otro'
                  });
                }
              }
            });
          }
          
          // 4. COINCIDENCIA POR PALABRAS CLAVE (Confianza Media-Baja - 0.6)
          if (articulo.nombre && articulo.nombre.trim() !== '') {
            const nombreNormalizado = articulo.nombre.toLowerCase().trim();
            // Extraer palabras significativas (más de 3 caracteres)
            const palabrasArticulo = nombreNormalizado.split(/\s+/).filter(p => p.length > 3);
            
            if (palabrasArticulo.length > 0) {
              articulosExistentes.forEach(a => {
                // Si ya está en la lista con confianza media o alta, omitir
                if (duplicadosConConfianza.some(d => d.articulo.id === a.id && d.confianza >= 0.6)) {
                  return;
                }
                
                if (a.nombre && a.nombre.trim() !== '') {
                  const existenteNombreNormalizado = a.nombre.toLowerCase().trim();
                  const palabrasExistente = existenteNombreNormalizado.split(/\s+/).filter(p => p.length > 3);
                  
                  // Contar palabras coincidentes
                  let palabrasComunes = 0;
                  for (const palabra of palabrasArticulo) {
                    if (palabrasExistente.some(p => p.includes(palabra) || palabra.includes(p))) {
                      palabrasComunes++;
                    }
                  }
                  
                  // Si comparten al menos 2 palabras clave o más del 50% de las palabras
                  const umbralPalabras = Math.min(2, Math.ceil(palabrasArticulo.length * 0.5));
                  if (palabrasComunes >= umbralPalabras) {
                    duplicadosConConfianza.push({
                      articulo: a,
                      confianza: 0.6,
                      razon: `Comparten ${palabrasComunes} palabras clave`,
                      palabrasComunes
                    });
                  }
                }
              });
            }
          }
          
          // 5. COINCIDENCIA POR PROVEEDOR Y NOMBRE PARCIAL (Confianza Baja - 0.4)
          if (proveedorExistente && articulo.nombre && articulo.nombre.trim() !== '') {
            const inicioNombre = articulo.nombre.substring(0, 
                Math.min(5, articulo.nombre.length)).toLowerCase();
            
            articulosExistentes.forEach(a => {
              // Si ya está en la lista con cualquier nivel de confianza, omitir
              if (duplicadosConConfianza.some(d => d.articulo.id === a.id)) {
                return;
              }
              
              // Si es del mismo proveedor y el inicio del nombre coincide
              if (a.proveedor_id === proveedorExistente.id && 
                  a.nombre && 
                  a.nombre.toLowerCase().includes(inicioNombre)) {
                duplicadosConConfianza.push({
                  articulo: a,
                  confianza: 0.4,
                  razon: 'Mismo proveedor y nombre parcialmente coincidente'
                });
              }
            });
          }
          
          // Ordenar duplicados por nivel de confianza (de mayor a menor)
          duplicadosConConfianza.sort((a, b) => b.confianza - a.confianza);
          
          // Convertir a formato esperado (solo los artículos, sin info de confianza)
          const duplicadosUnicos = duplicadosConConfianza.map(d => ({
            ...d.articulo,
            nivelConfianza: d.confianza,
            razonDuplicado: d.razon
          }));

          return {
            ...articulo,
            posiblesDuplicados: duplicadosUnicos.length > 0 ? duplicadosUnicos : null,
            // Añadir flag si hay duplicados con alta confianza (>0.75)
            tieneDuplicadosAltaConfianza: duplicadosUnicos.some(d => d.nivelConfianza >= 0.75)
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
