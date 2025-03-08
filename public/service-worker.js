// Este es el Service Worker principal de la aplicación
// Combina la funcionalidad de next-pwa con las notificaciones push

// Importar script de notificaciones
importScripts('/sw-notifications.js');

// El resto de la funcionalidad se maneja por next-pwa
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});