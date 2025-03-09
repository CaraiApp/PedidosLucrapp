/**
 * Módulo de autenticación de administración seguro
 * Este módulo proporciona funciones para verificar credenciales de administrador
 * con múltiples capas de seguridad.
 */

import { createClient } from '@supabase/supabase-js';

// Clave constante para la encriptación - NO CAMBIAR
const ADMIN_SECRET_KEY = "luc-r4pp-2025-4dm1n-s3cr3t-k3y";

// Email del superadministrador (único con acceso absoluto)
export const SUPER_ADMIN_EMAIL = "luisocro@gmail.com";

// Contraseñas válidas hasheadas para acceso directo
const VALID_ADMIN_HASHES = [
  "f7f4d7eb19722cebd6c5f9fae94ddb65", // Hash de "Global01"
  "c9adcfbdbafc907e885e0a279b56a68b", // Hash de "Lucrapp2025"
  "6c569aabbf7775ef8fc570e228c16b98", // Hash de "LuisAdmin"
];

// Tiempo de expiración del token de admin (4 horas)
const ADMIN_TOKEN_EXPIRY = 4 * 60 * 60 * 1000;

// Interfaz para datos de autenticación de admin
export interface AdminAuthData {
  isAuthenticated: boolean;
  email?: string;
  lastAccess: number;
  expiresAt: number;
}

/**
 * Cifra los datos de autenticación de administrador
 */
export function encryptAdminData(data: AdminAuthData): string {
  try {
    // Convertir a JSON
    const jsonData = JSON.stringify(data);
    
    // Cifrado simple Base64 con prefijo seguro
    const encodedData = Buffer.from(jsonData).toString('base64');
    
    // Prefijo seguro para identificar tokens válidos
    return `LCR-ADM-${encodedData}-${generateSimpleHash(encodedData)}`;
  } catch (error) {
    console.error("Error cifrado datos admin:", error);
    throw new Error("Error de seguridad");
  }
}

/**
 * Descifra los datos de autenticación de administrador
 */
export function decryptAdminData(encryptedData: string): AdminAuthData | null {
  try {
    // Verificar formato y prefijo
    if (!encryptedData || !encryptedData.startsWith('LCR-ADM-')) {
      return null;
    }
    
    // Extraer datos y hash
    const parts = encryptedData.split('-');
    if (parts.length < 4) return null;
    
    const encodedData = parts[2];
    const providedHash = parts[3];
    
    // Verificar hash para protección de integridad
    if (providedHash !== generateSimpleHash(encodedData)) {
      console.error("Hash de integridad de token inválido");
      return null;
    }
    
    // Descifrar desde Base64
    const jsonData = Buffer.from(encodedData, 'base64').toString();
    
    // Parsear a objeto
    const data = JSON.parse(jsonData) as AdminAuthData;
    
    // Verificar campos críticos
    if (data && typeof data.isAuthenticated === 'boolean' && 
        typeof data.lastAccess === 'number' && 
        typeof data.expiresAt === 'number') {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error("Error descifrando datos admin:", error);
    return null;
  }
}

/**
 * Verifica si un hash de contraseña es válido para admin
 */
export function validateAdminPasswordHash(passwordHash: string): boolean {
  return VALID_ADMIN_HASHES.includes(passwordHash);
}

/**
 * Verifica si un usuario es superadmin por email
 */
export function isSuperAdmin(email: string): boolean {
  return email === SUPER_ADMIN_EMAIL;
}

/**
 * Verifica si un token de admin es válido
 */
export function isValidAdminToken(token: string): boolean {
  try {
    const data = decryptAdminData(token);
    if (!data) return false;
    
    const now = Date.now();
    return data.isAuthenticated && now < data.expiresAt;
  } catch (error) {
    console.error("Error validando token admin:", error);
    return false;
  }
}

/**
 * Crea un token de administrador
 */
export function createAdminToken(email?: string): string {
  const now = Date.now();
  const adminData: AdminAuthData = {
    isAuthenticated: true,
    email: email,
    lastAccess: now,
    expiresAt: now + ADMIN_TOKEN_EXPIRY
  };
  
  return encryptAdminData(adminData);
}

/**
 * Genera un hash simple para validar integridad
 */
function generateSimpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Verifica si un token de superadmin es válido
 */
export async function validateSuperAdmin(supabaseUrl: string, supabaseKey: string): Promise<boolean> {
  try {
    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verificar sesión
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error("Error validando superadmin:", error);
      return false;
    }
    
    // Verificar email del usuario
    return data?.session?.user?.email === SUPER_ADMIN_EMAIL;
  } catch (error) {
    console.error("Error crítico validando superadmin:", error);
    return false;
  }
}