import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// API endpoint para eliminar una suscripción de notificaciones push
export async function POST(request: Request) {
  try {
    // Verificar que es un cliente válido
    const { subscription, userId } = await request.json();
    
    if (!subscription || !userId) {
      return NextResponse.json(
        { error: 'Faltan datos de suscripción' },
        { status: 400 }
      );
    }
    
    // Marcar la suscripción como inactiva en la base de datos
    const { error } = await supabase
      .from('notificaciones_subscripciones')
      .update({ activo: false })
      .match({ 
        usuario_id: userId,
        endpoint: subscription 
      });
      
    if (error) {
      console.error('Error al cancelar suscripción:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la suscripción en la base de datos' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API de cancelación de notificaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}