import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Verificar si se proporciona token de autorización en la solicitud
    const authHeader = request.headers.get('authorization');
    let token = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // Crear un cliente de Supabase con cookies y/o token para el servidor
    const cookieStore = cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            cookie: cookieStore.toString(),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        }
      }
    );
    
    // Verificar sesión del usuario (con posible token extra)
    let session;
    let userId;
    
    if (token) {
      // Intentar obtener usuario del token
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        userId = data.user.id;
        session = { user: data.user };
      }
    } 
    
    if (!userId) {
      // Intentar obtener sesión normal
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        session = data.session;
        userId = session.user.id;
      }
    }
    
    // Verificar que tenemos un usuario
    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado. Por favor, inicia sesión para guardar datos." },
        { status: 401 }
      );
    }

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