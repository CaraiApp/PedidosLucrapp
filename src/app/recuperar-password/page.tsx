"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Componente para manejar los parámetros de búsqueda con suspense
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'email' | 'password'>(searchParams.has('token') ? 'password' : 'email');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: string;
    color: string;
  }>({
    strength: "",
    color: "",
  });

  useEffect(() => {
    // Si hay un token en la URL o hay acceso de type=recovery, vamos directo al paso de cambiar contraseña
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    
    if (token || type === 'recovery' || accessToken) {
      setStep('password');
    }
  }, [searchParams]);

  const validatePassword = (password: string) => {
    let strength = 0;

    if (password.length >= 8) strength += 1;
    if (password.match(/[A-Z]/)) strength += 1;
    if (password.match(/[a-z]/)) strength += 1;
    if (password.match(/[0-9]/)) strength += 1;
    if (password.match(/[^A-Za-z0-9]/)) strength += 1;

    switch (strength) {
      case 0:
      case 1:
        return { strength: "muy débil", color: "#dc3545" };
      case 2:
        return { strength: "débil", color: "#ffc107" };
      case 3:
        return { strength: "media", color: "#0dcaf0" };
      case 4:
        return { strength: "fuerte", color: "#198754" };
      case 5:
        return { strength: "muy fuerte", color: "#0d6efd" };
      default:
        return { strength: "", color: "" };
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(validatePassword(newPassword));
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!email) {
      setError("Por favor, introduce tu dirección de correo electrónico");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Registro de información adicional para diagnosticar problemas
      console.log("Enviando solicitud de restablecimiento a:", email);
      console.log("URL de redirección:", `${window.location.origin}/recuperar-password?type=recovery`);
      
      const { error, data } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recuperar-password?type=recovery`,
      });
      
      // Registrar resultado para diagnóstico
      console.log("Respuesta recibida:", { error, data });
      
      if (error) {
        console.error("Error detallado de Supabase:", error);
        
        // Mensajes de error específicos
        if (error.message?.includes("rate limit")) {
          throw new Error("Has excedido el límite de intentos. Por favor, espera unos minutos antes de intentar nuevamente.");
        } else if (error.message?.includes("not found") || error.message?.includes("No user found")) {
          throw new Error("No existe ninguna cuenta con este correo electrónico.");
        } else if (error.message?.includes("Unable to validate email address")) {
          throw new Error("La dirección de correo electrónico no es válida.");
        } else if (error.status === 429 || error.status === "429") {
          throw new Error("Has excedido el límite de intentos. Por favor, espera unos minutos antes de intentar nuevamente.");
        } else {
          // Mensaje genérico para cualquier otro error, pero logueamos el error real para diagnóstico
          throw new Error("No se pudo procesar tu solicitud. Inténtalo de nuevo más tarde.");
        }
      } else {
        // Si no hay error, mostrar mensaje de éxito incluso si el correo no existe
        // Esto es una práctica de seguridad para no revelar qué direcciones existen en la base de datos
        setSuccess("Si existe una cuenta con este correo electrónico, te enviaremos instrucciones para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.");
        return; // Para evitar ejecutar el resto del código
      }
    } catch (err: any) {
      console.error("Error al solicitar restablecimiento:", err.message);
      
      // Usar mensaje personalizado si existe, o el mensaje genérico
      setError(err.message || "No se pudo enviar el correo de restablecimiento. Verifica tu dirección de correo e inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe contener al menos una letra mayúscula");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("La contraseña debe contener al menos una letra minúscula");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("La contraseña debe contener al menos un número");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      setError("La contraseña debe contener al menos un carácter especial");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Redireccionar al login con mensaje de éxito
      router.push("/login?reset=exitoso");
    } catch (err: any) {
      console.error("Error al actualizar la contraseña:", err.message);
      setError(
        "Ocurrió un error al actualizar la contraseña. Por favor, inténtalo de nuevo."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Restablecer contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 'email' 
            ? "Introduce tu correo electrónico para recibir instrucciones" 
            : "Introduce tu nueva contraseña"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {step === 'email' ? (
            <form className="space-y-6" onSubmit={handleRequestReset}>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? "Enviando..." : "Enviar instrucciones"}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleUpdatePassword}>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nueva contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={password}
                    onChange={handlePasswordChange}
                  />
                </div>
                {passwordStrength.strength && (
                  <p
                    className="mt-2 text-sm"
                    style={{ color: passwordStrength.color }}
                  >
                    Fortaleza de la contraseña: {passwordStrength.strength}
                  </p>
                )}
                <div className="mt-1 text-xs text-gray-500">
                  <p>La contraseña debe contener al menos:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>8 caracteres</li>
                    <li>Una letra mayúscula</li>
                    <li>Una letra minúscula</li>
                    <li>Un número</li>
                    <li>Un carácter especial</li>
                  </ul>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirmar nueva contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? "Procesando..." : "Actualizar contraseña"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de carga para el Suspense
function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Restablecer contraseña
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Cargando...
        </p>
      </div>
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
