import { NextResponse } from 'next/server';
import { notificarMembresiaDesdeServidor } from '@/lib/email-server';
import { supabase } from '@/lib/supabase';

// API para enviar notificaciones de membresía
export async function POST(request: Request) {
  try {
    // Obtener y validar el body de la petición
    const { email, nombre, tipoMembresia, fechaExpiracion, token } = await request.json();
    
    if (!email || !tipoMembresia || !fechaExpiracion) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios' },
        { status: 400 }
      );
    }
    
    // Verificar autenticación si se proporciona un token
    if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json(
          { error: 'No autorizado', details: authError?.message },
          { status: 401 }
        );
      }
    }
    
    // Enviar correo de notificación de membresía
    const resultado = await notificarMembresiaDesdeServidor(
      email,
      nombre || "Usuario",
      tipoMembresia,
      fechaExpiracion
    );
    
    if (!resultado.success) {
      console.error('Error al enviar notificación de membresía:', resultado.error);
      return NextResponse.json(
        { 
          success: false,
          error: 'Error al enviar la notificación', 
          details: resultado.error 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notificación de membresía enviada correctamente'
    });
  } catch (error: any) {
    console.error('Error en API de notificación de membresía:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}