import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import webpush from 'web-push';

// Variable para controlar si se pueden enviar notificaciones
let canSendNotifications = false;

// Configurar Web Push con las claves VAPID solo si están presentes
try {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  
  if (vapidPublicKey && vapidPrivateKey && vapidPublicKey.length > 0 && vapidPrivateKey.length > 0) {
    webpush.setVapidDetails(
      'mailto:info@lucrapp.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    canSendNotifications = true;
    console.log("Configuración de notificaciones VAPID completada");
  } else {
    console.warn("Faltan las claves VAPID, las notificaciones estarán deshabilitadas");
  }
} catch (error) {
  console.error("Error al configurar VAPID:", error);
}

export async function POST(request: Request) {
  try {
    // Si las notificaciones no están configuradas, devolver mensaje informativo
    if (!canSendNotifications) {
      return NextResponse.json({
        success: false,
        message: "Las notificaciones no están disponibles: faltan las claves VAPID"
      });
    }
    
    // Verificar autenticación y parámetros
    const { usuarios, titulo, contenido, url, token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Verificar que el token es válido
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado', details: authError?.message },
        { status: 401 }
      );
    }
    
    // Verificar que el usuario es admin
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single();
      
    if (userError || !userData || (userData.rol !== 'admin' && userData.rol !== 'superadmin')) {
      return NextResponse.json(
        { error: 'No tienes permisos para enviar notificaciones' },
        { status: 403 }
      );
    }
    
    // Validar parámetros
    if (!titulo || !contenido) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios' },
        { status: 400 }
      );
    }
    
    // Preparar la notificación
    const payload = JSON.stringify({
      title: titulo,
      body: contenido,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: url || '/'
      }
    });
    
    // Determinar destinatarios
    let subscripciones: any[] = [];
    
    if (usuarios && usuarios.length > 0) {
      // Buscar suscripciones de usuarios específicos
      const { data, error } = await supabase
        .from('notificaciones_subscripciones')
        .select('*')
        .in('usuario_id', usuarios)
        .eq('activo', true);
        
      if (error) {
        console.error('Error al obtener suscripciones:', error);
        return NextResponse.json(
          { error: 'Error al obtener suscripciones' },
          { status: 500 }
        );
      }
      
      subscripciones = data || [];
    } else {
      // Enviar a todos los usuarios activos
      const { data, error } = await supabase
        .from('notificaciones_subscripciones')
        .select('*')
        .eq('activo', true);
        
      if (error) {
        console.error('Error al obtener todas las suscripciones:', error);
        return NextResponse.json(
          { error: 'Error al obtener todas las suscripciones' },
          { status: 500 }
        );
      }
      
      subscripciones = data || [];
    }
    
    // Si no hay suscripciones, informar
    if (subscripciones.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay suscripciones a las que enviar la notificación',
        enviadas: 0
      });
    }
    
    // Enviar notificaciones
    let exitosas = 0;
    let fallidas = 0;
    
    await Promise.all(subscripciones.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys
        };
        
        await webpush.sendNotification(pushSubscription, payload);
        exitosas++;
        
        // Registrar la notificación enviada
        await supabase
          .from('notificaciones_log')
          .insert({
            usuario_id: sub.usuario_id,
            titulo,
            contenido,
            fecha: new Date().toISOString(),
            estado: 'enviada'
          });
      } catch (error: any) {
        console.error(`Error al enviar notificación a ${sub.endpoint}:`, error);
        fallidas++;
        
        // Si el error es porque la suscripción ya no es válida, marcarla como inactiva
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase
            .from('notificaciones_subscripciones')
            .update({ activo: false })
            .eq('endpoint', sub.endpoint);
        }
      }
    }));
    
    // Devolver resultados
    return NextResponse.json({
      success: true,
      enviadas: exitosas,
      fallidas,
      total: subscripciones.length
    });
  } catch (error: any) {
    console.error('Error en API de envío de notificaciones:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}