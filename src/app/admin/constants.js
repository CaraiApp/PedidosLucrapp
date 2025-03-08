// Constantes para la sección de administración
// Usamos un archivo .js para evitar problemas con TypeScript

export const ADMIN_TITLE = 'LucrApp - Administración';
export const ADMIN_DESCRIPTION = 'Panel de administración de LucrApp';

// Superadmins que pueden acceder sin contraseña
export const SUPERADMIN_EMAILS = ['luisocro@gmail.com'];

// Contraseñas válidas en texto plano (solo para desarrollo)
export const VALID_PASSWORDS = ['Global01', 'Lucrapp2025'];

// Hashes de contraseñas válidas
export const VALID_PASSWORD_HASHES = [
  'f7f4d7eb19722cebd6c5f9fae94ddb65', // Hash de "Global01"
  '46e44aa0f7fe67b53554a9fc2c76fbcc', // Hash de "Global01."
  'c9adcfbdbafc907e885e0a279b56a68b'  // Hash de "Lucrapp2025"
];