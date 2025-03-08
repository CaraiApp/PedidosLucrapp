/**
 * Biblioteca para la gestión de notificaciones push en la aplicación
 */

// Convertir URL de servidor público a URL de suscripción de vapid
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

// Solicitar permiso para enviar notificaciones
export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones push');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error al solicitar permiso de notificaciones:', error);
    return false;
  }
}

// Comprobar si tenemos permiso de notificaciones
export function tienePermisoNotificaciones(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Registrar el service worker para notificaciones push
export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker no soportado en este navegador');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (error) {
    console.error('Error al registrar el service worker:', error);
    return null;
  }
}

// Suscribir al usuario a notificaciones push
export async function suscribirseANotificaciones(userId: string): Promise<boolean> {
  try {
    // 1. Comprobar y solicitar permiso si es necesario
    if (!tienePermisoNotificaciones()) {
      const permiso = await solicitarPermisoNotificaciones();
      if (!permiso) return false;
    }

    // 2. Registrar service worker
    const registration = await registrarServiceWorker();
    if (!registration) return false;

    // 3. Comprobar si ya existe una suscripción
    let subscription = await registration.pushManager.getSubscription();
    
    // 4. Si ya existe, eliminarla para crear una nueva
    if (subscription) {
      await subscription.unsubscribe();
    }

    // 5. Obtener la clave pública VAPID
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicVapidKey) {
      console.error('Falta la clave pública VAPID');
      return false;
    }

    // 6. Crear la nueva suscripción
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    });

    // 7. Enviar la suscripción al servidor
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId
      }),
    });

    if (!response.ok) {
      console.error('Error al guardar la suscripción en el servidor');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error al suscribirse a notificaciones:', error);
    return false;
  }
}

// Mostrar una notificación local (solo cliente)
export function mostrarNotificacionLocal(titulo: string, opciones?: NotificationOptions): void {
  if (!tienePermisoNotificaciones()) {
    console.warn('No se tiene permiso para mostrar notificaciones');
    return;
  }

  const notificacion = new Notification(titulo, opciones);
  
  notificacion.onclick = function() {
    window.focus();
    notificacion.close();
  };
}

// Cancelar una suscripción de notificaciones
export async function cancelarSuscripcion(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) return true; // Ya no está suscrito
    
    // Eliminar del servidor
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.endpoint,
        userId
      }),
    });
    
    // Cancelar en el navegador
    await subscription.unsubscribe();
    
    return response.ok;
  } catch (error) {
    console.error('Error al cancelar la suscripción:', error);
    return false;
  }
}