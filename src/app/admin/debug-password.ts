'use client';

// Export config for client-only
export * from './config';

// Importación específica solo de MD5 para evitar errores
let md5Function: any = null;

if (typeof window !== 'undefined') {
  // Solo en el cliente, importación específica
  import('crypto-js/md5').then(module => {
    md5Function = module.default;
    console.log("MD5 cargado correctamente");
  }).catch(err => {
    console.error("Error loading MD5 in debug-password:", err);
  });
}

export function debugPassword(password: string): string {
  if (!md5Function) {
    console.warn("MD5 no disponible para generar hash de contraseña");
    // Fallback simple para desarrollo
    return `debug_hash_${password.split('').reverse().join('')}`;
  }
  return md5Function(password).toString();
}