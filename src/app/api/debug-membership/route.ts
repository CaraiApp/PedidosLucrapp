import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";
import { cookies } from 'next/headers';

// Añadida la capacidad de especificar un ID de usuario en la consulta
export async function GET(request: NextRequest) {
  // Verificar si hay un parámetro userId en la URL
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('userId');
  try {
    // Usar cookies para mejorar la detección de sesión
    const cookieStore = cookies();
    const supabaseAuthCookie = await cookieStore.then(store => store.get('sb-auth-token')?.value);
    
    console.log("Cookies disponibles:", await cookieStore.then(store => store.getAll().map(c => c.name)));
    console.log("Existe cookie de auth:", !!supabaseAuthCookie);
    
    // Verificar sesión a través de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    console.log("Sesión detectada:", !!sessionData?.session);
    console.log("Error de sesión:", sessionError?.message || "Ninguno");
    
    // Usar el ID solicitado o uno por defecto para testing si no hay sesión
    const userId = requestedUserId || sessionData?.session?.user?.id || "def38ca4-63a6-4ce1-8dbd-32abda08a14c";
    const userEmail = sessionData?.session?.user?.email || "luiscrouseillesvillena@gmail.com";
    
    console.log("Usando ID para diagnóstico:", userId);
    
    // 1. Verificar la tabla de usuarios
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, email, username, membresia_activa_id")
      .eq("id", userId)
      .single();
      
    if (userError) {
      return NextResponse.json({
        success: false,
        error: userError.message,
        step: "Consulta de usuarios"
      }, { status: 500 });
    }
    
    // 2. Obtener todas las membresías para el usuario
    const { data: memberships, error: membershipsError } = await supabase
      .from("membresias_usuarios")
      .select(`
        id, 
        usuario_id,
        tipo_membresia_id,
        fecha_inicio, 
        fecha_fin,
        estado,
        tipo_membresia:membresia_tipos(
          id, 
          nombre, 
          precio,
          tiene_ai
        )
      `)
      .eq("usuario_id", userId);
      
    if (membershipsError) {
      return NextResponse.json({
        success: false,
        error: membershipsError.message,
        step: "Consulta de membresías"
      }, { status: 500 });
    }
    
    // 3. Buscar información sobre tipos de membresía premium (con AI)
    let premiumMembership = null;
    try {
      const { data: premiumTypes, error: premiumError } = await supabase
        .from("membresia_tipos")
        .select("*")
        .eq("tiene_ai", true)
        .limit(1);
      
      if (!premiumError && premiumTypes && premiumTypes.length > 0) {
        premiumMembership = premiumTypes[0];
      }
    } catch (err) {
      console.error("Error al buscar membresía premium:", err);
      // Continuamos aunque falle esta consulta
    }
    
    // 4. Verificar la membresía activa del usuario
    let activeMembership = null;
    if (userData.membresia_activa_id) {
      const { data: activeMem, error: activeMemError } = await supabase
        .from("membresias_usuarios")
        .select(`
          id, 
          tipo_membresia_id,
          estado,
          tipo_membresia:membresia_tipos(
            id, 
            nombre, 
            tiene_ai
          )
        `)
        .eq("id", userData.membresia_activa_id)
        .single();
        
      if (!activeMemError) {
        activeMembership = activeMem;
      }
    }
    
    // Devolver toda la información
    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        email: userEmail,
        username: userData.username,
        membresia_activa_id: userData.membresia_activa_id
      },
      memberships: memberships || [],
      premiumMembership: premiumMembership || null,
      activeMembership: activeMembership || null,
      isAdmin: [
        'luiscrouseillesvillena@gmail.com', 
        'admin@lucrapp.com', 
        'luis@lucrapp.com', 
        'luisocro@gmail.com'
      ].includes(userEmail?.toLowerCase() || '')
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || "Error al verificar información de membresía"
    }, { status: 500 });
  }
}