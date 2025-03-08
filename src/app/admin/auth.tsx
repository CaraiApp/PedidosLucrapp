// src/app/admin/auth.tsx
'use client';

// Configuración explícita para este archivo
export const dynamic = 'force-dynamic';
// No exportamos config para evitar problemas con Server Components

// For debugging auth issues
export const debugAuth = true;

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Importación condicional de CryptoJS para evitar errores durante la compilación estática
let CryptoJS: any = null;

// Solo cargar CryptoJS en el cliente
if (typeof window !== 'undefined') {
  import('crypto-js').then((module) => {
    CryptoJS = module.default;
  }).catch(err => {
    console.error("Error cargando CryptoJS:", err);
  });
}

// Clave secreta para cifrar/descifrar el token
const SECRET_KEY = "lucrapp-admin-secret-key-2025";

// Datos del administrador
interface AdminData {
  isAuthenticated: boolean;
  lastAccess: number;
  expiresAt: number;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

// Crear contexto para la autenticación del administrador
const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Hook para usar el contexto de autenticación
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  
  // Si está en desarrollo o hay debug habilitado, mostrar advertencia
  if (context === undefined) {
    if (debugAuth) {
      console.warn("useAdminAuth se está usando fuera de AdminAuthProvider. Devolviendo un contexto provisional.");
    }
    // Devolver un contexto provisional para evitar errores
    return {
      isAuthenticated: false,
      isLoading: true,
      login: async () => false,
      logout: () => {}
    };
  }
  
  return context;
}

// Función para cifrar datos
const encryptData = (data: AdminData): string => {
  if (!CryptoJS) {
    console.warn("CryptoJS no está disponible todavía para cifrar");
    // Almacenamiento temporal para desarrollo
    return JSON.stringify(data);
  }
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
};

// Función para descifrar datos
const decryptData = (ciphertext: string): AdminData | null => {
  try {
    if (!CryptoJS) {
      console.warn("CryptoJS no está disponible todavía para descifrar");
      // Si está en formato JSON simple, intentar parsear directamente
      if (ciphertext.startsWith('{') && ciphertext.endsWith('}')) {
        return JSON.parse(ciphertext) as AdminData;
      }
      return null;
    }
    
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData as AdminData;
  } catch (error) {
    console.error("Error al descifrar datos del administrador", error);
    return null;
  }
};

// Proveedor de autenticación para el administrador
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Estado para manejar si estamos en cliente o servidor
  const [isBrowser, setIsBrowser] = useState(false);
  
  // Detectar si estamos en el navegador
  useEffect(() => {
    setIsBrowser(true);
  }, []);

  // Verificar si el administrador ya está autenticado al cargar
  useEffect(() => {
    // No hacer nada si no estamos en el navegador
    if (!isBrowser) return;
    
    const checkAuthStatus = async () => {
      try {
        // Solo acceder a sessionStorage en el cliente
        // Primero verificamos si hay una sesión válida en sessionStorage
        const adminData = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem("adminAuth") : null;
        if (adminData) {
          const decryptedData = decryptData(adminData);
          if (decryptedData) {
            // Verificar si la sesión ha expirado
            const now = Date.now();
            if (now <= decryptedData.expiresAt) {
              // Sesión válida
              setIsAuthenticated(true);
              
              // Renovar la sesión automáticamente
              const newExpiresAt = now + 4 * 60 * 60 * 1000; // 4 horas desde ahora
              const newAdminData: AdminData = {
                isAuthenticated: true,
                lastAccess: now,
                expiresAt: newExpiresAt
              };
              sessionStorage.setItem("adminAuth", encryptData(newAdminData));
              setIsLoading(false);
              return;
            } else {
              // La sesión ha expirado, la eliminamos
              sessionStorage.removeItem("adminAuth");
            }
          }
        }
        
        // Si no hay sesión de admin válida, verificamos si es un superadmin en Supabase
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session && session.user && session.user.email) {
            const superAdminEmails = ['luisocro@gmail.com'];
            
            if (superAdminEmails.includes(session.user.email)) {
              console.log("Superadmin detectado en verificación:", session.user.email);
              
              // Usuario superadmin, autenticar automáticamente
              const now = Date.now();
              const expiresAt = now + 8 * 60 * 60 * 1000; // 8 horas para superadmins
              
              const adminData: AdminData = {
                isAuthenticated: true,
                lastAccess: now,
                expiresAt: expiresAt
              };
              
              sessionStorage.setItem("adminAuth", encryptData(adminData));
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          }
        } catch (supabaseError) {
          console.error("Error al verificar sesión de Supabase:", supabaseError);
        }
        
        // Si llegamos aquí, no hay autenticación válida
        setIsAuthenticated(false);
        setIsLoading(false);
      } catch (error) {
        console.error("Error al verificar estado de autenticación", error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [isBrowser]);

  // Función para iniciar sesión
  const login = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Verificamos primero si hay una sesión de usuario en Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      // Si hay sesión, verificamos si es un email autorizado como superadmin
      if (session && session.user) {
        const userEmail = session.user.email;
        // Lista de superadmins que no necesitan contraseña si ya están logueados en el sistema
        const superAdminEmails = ['luisocro@gmail.com'];
        
        if (userEmail && superAdminEmails.includes(userEmail)) {
          console.log("Usuario superadmin detectado:", userEmail);
          
          // Usuario superadmin logueado, crear sesión de admin automáticamente
          const now = Date.now();
          const expiresAt = now + 8 * 60 * 60 * 1000; // 8 horas para superadmins
          
          const adminData: AdminData = {
            isAuthenticated: true,
            lastAccess: now,
            expiresAt: expiresAt
          };
          
          // Guardar los datos cifrados en sessionStorage
          sessionStorage.setItem("adminAuth", encryptData(adminData));
          setIsAuthenticated(true);
          return true;
        }
      }
      
      // Si no es un superadmin o no hay sesión, procedemos con la autenticación por contraseña
      // Contraseñas válidas y sus hashes
      const validPasswordHashes = [
        "f7f4d7eb19722cebd6c5f9fae94ddb65", // Hash de "Global01"
        "46e44aa0f7fe67b53554a9fc2c76fbcc", // Hash de "Global01."
        "c9adcfbdbafc907e885e0a279b56a68b"  // Hash de "Lucrapp2025"
      ];
      
      // Si el usuario escribe alguna de estas contraseñas, lo aceptamos directamente
      if (password === "Global01" || password === "Lucrapp2025") {
        // Contraseña correcta, crear sesión
        const now = Date.now();
        const expiresAt = now + 4 * 60 * 60 * 1000; // 4 horas
        
        const adminData: AdminData = {
          isAuthenticated: true,
          lastAccess: now,
          expiresAt: expiresAt
        };
        
        // Guardar los datos cifrados en sessionStorage
        sessionStorage.setItem("adminAuth", encryptData(adminData));
        setIsAuthenticated(true);
        return true;
      }
      
      // Calcular hash de la contraseña ingresada
      const inputPasswordHash = CryptoJS.MD5(password).toString();
      
      if (validPasswordHashes.includes(inputPasswordHash)) {
        // Contraseña correcta, crear sesión
        const now = Date.now();
        const expiresAt = now + 4 * 60 * 60 * 1000; // 4 horas
        
        const adminData: AdminData = {
          isAuthenticated: true,
          lastAccess: now,
          expiresAt: expiresAt
        };
        
        // Guardar los datos cifrados en sessionStorage
        sessionStorage.setItem("adminAuth", encryptData(adminData));
        setIsAuthenticated(true);
        return true;
      } else {
        // Contraseña incorrecta
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error("Error en el inicio de sesión", error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = () => {
    sessionStorage.removeItem("adminAuth");
    setIsAuthenticated(false);
    router.push("/admin");
  };

  // Proporcionar el contexto
  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// Middleware de acceso (solo permitir si está autenticado)
export function withAdminAuth<T extends object>(Component: React.ComponentType<T>) {
  return function WithAdminAuth(props: T) {
    const { isAuthenticated, isLoading } = useAdminAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push("/admin");
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}

// Función para verificar seguridad adicional (anti-CSRF)
export function generateCSRFToken(): string {
  if (!CryptoJS) {
    // Fallback simple para cuando CryptoJS no está disponible
    const randomToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem("adminCsrfToken", randomToken);
    }
    return randomToken;
  }
  
  const token = CryptoJS.lib.WordArray.random(16).toString();
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem("adminCsrfToken", token);
  }
  return token;
}

export function validateCSRFToken(token: string): boolean {
  if (typeof sessionStorage === 'undefined') {
    return true; // En SSR siempre devolver true
  }
  const storedToken = sessionStorage.getItem("adminCsrfToken");
  return storedToken === token;
}