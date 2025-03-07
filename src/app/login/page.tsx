"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registroExitoso = searchParams.get("registro") === "exitoso";
  const resetExitoso = searchParams.get("reset") === "exitoso";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (registroExitoso) {
      setSuccessMessage(
        "Te has registrado correctamente. Por favor, revisa tu correo electrónico para verificar tu cuenta."
      );
    } else if (resetExitoso) {
      setSuccessMessage("Tu contraseña ha sido actualizada correctamente.");
    }
  }, [registroExitoso, resetExitoso]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.email || !formData.password) {
      setErrors({
        general: "Por favor complete todos los campos",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log("Iniciando sesión con:", formData.email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      console.log("Sesión iniciada correctamente:", data.user.id);

      // Verificar si el usuario existe en nuestra tabla de usuarios
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (userError) {
        // Si el usuario no existe en nuestra tabla, lo creamos
        if (userError.code === "PGRST116") {
          console.log("Creando nuevo usuario en tabla usuarios");
          const { error: insertError } = await supabase
            .from("usuarios")
            .insert({
              id: data.user.id,
              email: data.user.email,
              username: data.user.email?.split("@")[0], // Temporal
            });

          if (insertError) throw insertError;
        } else {
          throw userError;
        }
      }

      console.log("Redirigiendo al dashboard...");
      // Redireccionar al dashboard con un pequeño retraso
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (error: unknown) {
      const supabaseError = error as SupabaseError;
      console.error("Error de inicio de sesión:", supabaseError.message);
      let errorMessage = "Ocurrió un error durante el inicio de sesión";

      // Traducir mensajes de error comunes de Supabase
      if (supabaseError.message.includes("Invalid login credentials")) {
        errorMessage =
          "Credenciales inválidas. Por favor, verifique su correo y contraseña.";
      } else if (supabaseError.message.includes("Email not confirmed")) {
        errorMessage =
          "Por favor, confirme su correo electrónico antes de iniciar sesión.";
      }

      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Iniciar sesión
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {successMessage && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          {errors.general && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/recuperar-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  ¿No tienes una cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/register"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
