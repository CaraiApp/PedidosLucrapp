// src/app/admin/middleware.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAdminAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsVerifying(true);
      
      try {
        // Si estamos en la página de login del admin, no verificar
        if (pathname === '/admin' || pathname === '/admin/') {
          setIsVerifying(false);
          return;
        }
        
        // Verificar acceso de admin de varias formas para mayor robustez
        let hasAccess = false;
        let accessSource = "none";
        
        // 1. Verificar en sessionStorage (principal)
        try {
          if (typeof sessionStorage !== 'undefined') {
            if (sessionStorage.getItem("adminAccess") === "granted") {
              hasAccess = true;
              accessSource = "sessionStorage/simple";
            } else if (sessionStorage.getItem("adminAuth")) {
              hasAccess = true;
              accessSource = "sessionStorage/auth";
            }
          }
        } catch (e) {
          console.warn("Error al acceder a sessionStorage:", e);
        }
        
        // 2. Verificar en localStorage (respaldo)
        if (!hasAccess) {
          try {
            if (typeof localStorage !== 'undefined') {
              if (localStorage.getItem("adminAccess") === "granted") {
                hasAccess = true;
                accessSource = "localStorage/simple";
              } else if (localStorage.getItem("adminAuth")) {
                hasAccess = true;
                accessSource = "localStorage/auth";
              } else if (localStorage.getItem("adminEmail") === "luisocro@gmail.com") {
                hasAccess = true;
                accessSource = "localStorage/superadmin";
                
                // Restaurar adminAccess si tenemos email de superadmin
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.setItem("adminAccess", "granted");
                }
              }
            }
          } catch (e) {
            console.warn("Error al acceder a localStorage:", e);
          }
        }
        
        // 3. Verificar en cookies (última opción)
        if (!hasAccess) {
          try {
            if (typeof document !== 'undefined' && document.cookie) {
              if (document.cookie.includes("adminAuth=") || document.cookie.includes("adminAccess=granted")) {
                hasAccess = true;
                accessSource = "cookie";
                
                // Restaurar adminAccess si tenemos cookie
                if (typeof sessionStorage !== 'undefined') {
                  sessionStorage.setItem("adminAccess", "granted");
                }
              }
            }
          } catch (e) {
            console.warn("Error al acceder a cookies:", e);
          }
        }
        
        // 4. Verificación de superadmin por sesión de Supabase
        if (!hasAccess) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user?.email === "luisocro@gmail.com") {
              hasAccess = true;
              accessSource = "supabase/superadmin";
              
              // Establecer acceso en almacenamiento para futuras verificaciones
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem("adminAccess", "granted");
              }
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem("adminEmail", "luisocro@gmail.com");
              }
            }
          } catch (supabaseError) {
            console.warn("Error al verificar sesión de Supabase:", supabaseError);
          }
        }
        
        // 5. Verificación especial de superadmin por URL para emergencias
        if (!hasAccess && typeof window !== 'undefined') {
          try {
            const urlParams = new URLSearchParams(window.location.search);
            const adminKey = urlParams.get('adminKey');
            
            // Clave especial para emergencias (solo usar en producción cuando otras opciones fallen)
            if (adminKey === 'luisAdmin2025') {
              hasAccess = true;
              accessSource = "url/emergency";
              
              // Configurar acceso permanente
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem("adminAccess", "granted");
              }
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem("adminEmail", "luisocro@gmail.com");
              }
              
              // Establecer cookie HTTP
              document.cookie = "adminAccess=granted; path=/; max-age=86400; secure; samesite=strict";
            }
          } catch (e) {
            console.warn("Error al verificar URL params:", e);
          }
        }
        
        // Si no hay acceso, redirigir al login
        if (!hasAccess) {
          console.log("No hay acceso de admin verificado, redirigiendo a login");
          setIsAuthenticated(false);
          router.replace("/admin");
          return;
        }
        
        // Acceso verificado
        console.log(`Acceso de admin verificado con éxito (fuente: ${accessSource})`);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error al verificar acceso de admin:", error);
        setIsAuthenticated(false);
        router.replace("/admin");
      } finally {
        setIsVerifying(false);
      }
    };

    checkAdminAccess();
  }, [router, pathname]);

  return { isVerifying, isAuthenticated };
}

// Crear un componente middleware real para proteger todas las rutas del admin
export function AdminMiddleware() {
  const { isVerifying, isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si estamos en la página de login del admin, no verificar
    if (pathname === '/admin' || pathname === '/admin/') {
      return;
    }

    // Cuando termine la verificación, si no está autenticado, redirigir
    if (!isVerifying && !isAuthenticated) {
      console.log('AdminMiddleware: Redirigiendo a /admin por falta de autenticación');
      router.replace('/admin');
    }
  }, [isVerifying, isAuthenticated, router, pathname]);

  return null;
}

export default useAdminAuth;
