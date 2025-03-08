'use client';

// Export config for client-only
export * from './config';

// Importación dinámica para evitar errores en SSR
let CryptoJS: any = null;

if (typeof window !== 'undefined') {
  // Solo en el cliente
  import('crypto-js').then(module => {
    CryptoJS = module.default;
  }).catch(err => {
    console.error("Error loading CryptoJS in debug-password:", err);
  });
}

export function debugPassword(password: string): string {
  if (!CryptoJS) {
    console.warn("CryptoJS no disponible para generar hash de contraseña");
    // Fallback simple para desarrollo
    return `debug_hash_${password.split('').reverse().join('')}`;
  }
  return CryptoJS.MD5(password).toString();
}