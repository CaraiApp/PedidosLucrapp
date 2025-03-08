import { NextRequest, NextResponse } from 'next/server';
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    console.log("Verificando estado de sesión...");
    
    // Verificar sesión
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Error de sesión:", sessionError);
      return NextResponse.json({
        success: false,
        error: "Error al verificar sesión: " + sessionError.message,
        session: null
      });
    }
    
    if (!sessionData?.session) {
      console.log("No hay sesión activa");
      return NextResponse.json({
        success: false,
        error: "No hay sesión activa",
        session: null
      });
    }
    
    // Obtener información adicional del usuario
    const { data: userData, error: userError } = await supabase
      .from("usuarios")
      .select("id, email, membresia_activa_id")
      .eq("id", sessionData.session.user.id)
      .single();
      
    const { data: membresiaData, error: membresiaError } = userData?.membresia_activa_id ? 
      await supabase
        .from("membresias_usuarios")
        .select("id, tipo_membresia_id")
        .eq("id", userData.membresia_activa_id)
        .single() : 
      { data: null, error: null };
    
    // Devolver información de la sesión
    return NextResponse.json({
      success: true,
      session: {
        id: sessionData.session.user.id,
        email: sessionData.session.user.email,
        aud: sessionData.session.user.aud,
        role: sessionData.session.user.role
      },
      userData: userError ? null : userData,
      membresiaData: membresiaError ? null : membresiaData,
      errors: {
        userError: userError ? userError.message : null,
        membresiaError: membresiaError ? membresiaError.message : null
      }
    });
    
  } catch (error: any) {
    console.error("Error general:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Error al verificar sesión"
    });
  }
}