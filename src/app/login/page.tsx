"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Login content component with searchParams
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registroExitoso = searchParams.get("registro") === "exitoso";
  const resetExitoso = searchParams.get("reset") === "exitoso";
  const verificado = searchParams.get("verificado") === "true";
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Comprobar si es un registro exitoso
    if (registroExitoso) {
      setSuccessMessage("Registro completado exitosamente. Ahora puedes iniciar sesión.");
    }
    
    // Comprobar si es un reset de contraseña exitoso
    if (resetExitoso) {
      setSuccessMessage("Contraseña restablecida correctamente. Ahora puedes iniciar sesión con tu nueva contraseña.");
    }
    
    // Comprobar si el correo electrónico fue verificado
    if (verificado) {
      setSuccessMessage("Tu dirección de correo electrónico ha sido verificada correctamente. Ya puedes iniciar sesión.");
    }
    
    // Verificar si el usuario ya está autenticado
    const checkSession = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // Si ya hay sesión activa, redirigir al dashboard
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Error al verificar sesión:", err);
      }
    };
    
    checkSession();
  }, [router, registroExitoso, resetExitoso, verificado]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Intentar iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;
      
      const userData = data?.user;
      
      // Redireccionar al dashboard
      router.push("/dashboard");
    } catch (err) {
      const error = err as SupabaseError;
      console.error("Error al iniciar sesión:", error);
      
      // Mostrar mensaje de error apropiado
      if (error.code === "auth/invalid-credential") {
        setError("Correo electrónico o contraseña incorrectos.");
      } else {
        setError(error.message || "Ocurrió un error durante el inicio de sesión. Por favor, intenta nuevamente.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Inicia sesión en tu cuenta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          ¿No tienes una cuenta?{" "}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Regístrate gratis
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" role="alert">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link href="/recuperar-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LoginContent />
    </Suspense>
  );
}