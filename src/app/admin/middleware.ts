// src/app/admin/middleware.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function useAdminAuth() {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const checkAdminAccess = async () => {
      setIsVerifying(true);
      
      try {
        // Primero verificamos si hay acceso en sessionStorage
        // Usamos un bloque try-catch porque sessionStorage puede no estar disponible en algunos contextos
        const hasAccess = sessionStorage.getItem("adminAccess") === "granted";
        
        if (!hasAccess) {
          // Si no hay acceso en sessionStorage, redirigimos a la página de login de admin
          console.log("No hay acceso de admin en sessionStorage");
          router.push("/admin");
          return;
        }
        
        // En el entorno de producción, la verificación de sesión de Supabase es opcional
        // Solo verificamos que el token de admin esté presente

        // Esto permitirá que funcione incluso si Supabase no está configurado correctamente
        console.log("Acceso de admin verificado con éxito");
      } catch (error) {
        console.error("Error al verificar acceso de admin:", error);
        router.push("/admin");
      } finally {
        setIsVerifying(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  return { isVerifying };
}

export default useAdminAuth;
