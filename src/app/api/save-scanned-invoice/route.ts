import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    // Verificar sesión del usuario
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const userId = sessionData.session.user.id;

    // Obtener los datos enviados
    const requestData = await request.json();
    const { proveedor, articulos, proveedorExistenteId } = requestData;

    if (!proveedor || !Array.isArray(articulos)) {
      return NextResponse.json(
        { error: "Datos incompletos o inválidos" },
        { status: 400 }
      );
    }

    // Variable para almacenar el ID del proveedor
    let proveedorId: string;
    
    // Si se eligió un proveedor existente, usar ese ID
    if (proveedorExistenteId) {
      proveedorId = proveedorExistenteId;
    } else {
      // Crear nuevo proveedor
      const nuevoProveedor = {
        usuario_id: userId,
        nombre: proveedor.nombre,
        cif: proveedor.cif || null,
        telefono: proveedor.telefono || null,
        email: proveedor.email || null,
        direccion: proveedor.direccion || null
      };

      const { data: proveedorData, error: proveedorError } = await supabase
        .from('proveedores')
        .insert(nuevoProveedor)
        .select('id')
        .single();

      if (proveedorError) {
        return NextResponse.json(
          { error: "Error al crear el proveedor: " + proveedorError.message },
          { status: 500 }
        );
      }

      proveedorId = proveedorData.id;
    }

    // Crear los artículos
    const nuevosArticulos = articulos
      .filter(art => !art.ignorar) // Filtrar artículos que el usuario marcó para ignorar
      .map(articulo => ({
        usuario_id: userId,
        proveedor_id: proveedorId,
        nombre: articulo.nombre,
        precio: articulo.precio || null,
        sku: articulo.sku || null,
        descripcion: articulo.descripcion || null
      }));

    if (nuevosArticulos.length > 0) {
      const { error: articulosError } = await supabase
        .from('articulos')
        .insert(nuevosArticulos);

      if (articulosError) {
        return NextResponse.json(
          { error: "Error al crear los artículos: " + articulosError.message },
          { status: 500 }
        );
      }
    }

    // Devolver respuesta exitosa
    return NextResponse.json({
      success: true,
      message: "Datos guardados correctamente",
      proveedorId,
      totalArticulos: nuevosArticulos.length
    });

  } catch (error: any) {
    console.error("Error al guardar los datos:", error);
    return NextResponse.json(
      { error: error.message || "Error al guardar los datos" },
      { status: 500 }
    );
  }
}