// Service Worker para gestionar notificaciones push
// Este archivo debe estar en /public/sw-notifications.js

// Escuchar evento de instalación
self.addEventListener('install', event => {
  console.log('Service Worker instalado para notificaciones push');
  self.skipWaiting(); // Activar inmediatamente
});

// Escuchar evento de activación
self.addEventListener('activate', event => {
  console.log('Service Worker activado para notificaciones push');
  return self.clients.claim(); // Tomar control de los clientes inmediatamente
});

// Escuchar eventos push
self.addEventListener('push', event => {
  if (!event.data) {
    console.log('Recibida notificación push sin datos');
    return;
  }

  try {
    // Obtener datos de la notificación
    const data = event.data.json();
    
    // Configuración básica si faltan datos
    const title = data.title || 'Lucrapp';
    const options = {
      body: data.body || 'Tienes una nueva notificación',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      data: data.data || { url: '/' }
    };
    
    // Mostrar la notificación
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (error) {
    console.error('Error al procesar notificación push:', error);
  }
});

// Escuchar evento de clic en notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  // URL a la que redirigir cuando se hace clic
  const urlToOpen = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/dashboard';
    
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Comprobar si ya hay una ventana abierta con la URL
        const matchingClient = windowClients.find(client => {
          return (new URL(client.url).pathname === new URL(urlToOpen, self.location.origin).pathname);
        });
        
        // Si existe, enfocamos esa ventana
        if (matchingClient) {
          return matchingClient.focus();
        }
        
        // Si no, abrimos una nueva
        return clients.openWindow(urlToOpen);
      })
  );
});