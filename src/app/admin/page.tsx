// src/app/admin/page.tsx
'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Mensaje } from "@/types";
import { AdminAuthProvider, useAdminAuth } from "./auth";
import { debugPassword } from "./debug-password";

// Componente de inicio de sesión de administrador
function AdminLoginForm() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/admin/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setLoginLoading(true);

    try {
      // DEBUG: Mostrar el hash de la contraseña para diagnóstico
      const passwordHash = debugPassword(password);
      console.log("Password hash:", passwordHash);
      
      // Intentar iniciar sesión con la contraseña proporcionada
      const success = await login(password);
      
      if (success) {
        router.push("/admin/dashboard");
      } else {
        setMensaje({
          texto: "Contraseña incorrecta. Por favor, inténtelo nuevamente. Hash: " + passwordHash,
          tipo: "error"
        });
      }
    } catch (error) {
      console.error("Error al iniciar sesión de administrador:", error);
      setMensaje({
        texto: "Ha ocurrido un error al iniciar sesión. Intente nuevamente.",
        tipo: "error"
      });
    } finally {
      setLoginLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-3xl font-bold text-indigo-600">LucrApp</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Acceso Administrador
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingrese la contraseña para acceder al panel de administración
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              id="password"
              name="password"
              type="password"
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />

            <div>
              <Button
                type="submit"
                isLoading={loginLoading}
                disabled={loginLoading}
                className="w-full"
              >
                Acceder
              </Button>
            </div>
            
            <div className="mt-4 text-center">
              <Link 
                href="/" 
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Volver a la página principal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Contenedor con el proveedor de autenticación
export default function AdminAccess() {
  return (
    <AdminAuthProvider>
      <AdminLoginForm />
    </AdminAuthProvider>
  );
}