import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// API endpoint para guardar una suscripción de notificaciones push
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
    
    // Guardar la suscripción en la base de datos
    const { error } = await supabase
      .from('notificaciones_subscripciones')
      .upsert({
        usuario_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        fecha_creacion: new Date().toISOString(),
        activo: true
      });
      
    if (error) {
      console.error('Error al guardar suscripción:', error);
      return NextResponse.json(
        { error: 'Error al guardar la suscripción en la base de datos' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en API de suscripción de notificaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}