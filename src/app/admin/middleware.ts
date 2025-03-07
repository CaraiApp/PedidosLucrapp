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
      
      // Primero verificamos si hay acceso en sessionStorage
      const hasAccess = sessionStorage.getItem("adminAccess") === "granted";
      
      if (!hasAccess) {
        // Si no hay acceso en sessionStorage, redirigimos a la página de login de admin
        router.push("/admin");
        return;
      }
      
      try {
        // Verificar que la sesión de Supabase esté activa
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Si no hay sesión de Supabase, revocamos el acceso y redirigimos
          sessionStorage.removeItem("adminAccess");
          router.push("/admin");
          return;
        }
        
        // Opcional: Verificar si el usuario tiene rol de administrador en base de datos
        // Esta parte puedes implementarla si tienes una tabla de roles o permisos
      } finally {
        setIsVerifying(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  return { isVerifying };
}

export default useAdminAuth;
