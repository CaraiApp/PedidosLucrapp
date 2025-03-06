// src/app/perfil/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "../components/AppLayout";

interface Usuario {
  id: string;
  email: string;
  username: string;
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  empresa?: string;
  created_at: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    nombre: "",
    apellidos: "",
    telefono: "",
    empresa: "",
  });
  const [mensaje, setMensaje] = useState<{
    texto: string;
    tipo: "exito" | "error";
  } | null>(null);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    passwordActual: "",
    passwordNuevo: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: string;
    color: string;
  }>({
    strength: "",
    color: "",
  });

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        setLoading(true);

        // Verificar sesión
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          router.push("/login");
          return;
        }

        // Cargar datos del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", sessionData.session.user.id)
          .single();

        if (userError) throw userError;

        setUsuario(userData);
        setFormData({
          username: userData.username || "",
          nombre: userData.nombre || "",
          apellidos: userData.apellidos || "",
          telefono: userData.telefono || "",
          empresa: userData.empresa || "",
        });
      } catch (err: any) {
        console.error("Error al cargar datos de usuario:", err.message);
        setMensaje({
          texto:
            "No se pudieron cargar tus datos. Por favor, intenta nuevamente.",
          tipo: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarUsuario();
  }, [router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setActualizando(true);

      // Verificar sesión
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      // Actualizar datos del usuario
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({
          username: formData.username,
          nombre: formData.nombre || null,
          apellidos: formData.apellidos || null,
          telefono: formData.telefono || null,
          empresa: formData.empresa || null,
        })
        .eq("id", sessionData.session.user.id);

      if (updateError) throw updateError;

      setMensaje({
        texto: "Perfil actualizado correctamente",
        tipo: "exito",
      });

      // Actualizar el estado del usuario con los nuevos datos
      setUsuario((prev) =>
        prev
          ? {
              ...prev,
              username: formData.username,
              nombre: formData.nombre || null,
              apellidos: formData.apellidos || null,
              telefono: formData.telefono || null,
              empresa: formData.empresa || null,
            }
          : null
      );

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al actualizar perfil:", err.message);
      setMensaje({
        texto:
          "No se pudo actualizar el perfil. Por favor, intenta nuevamente.",
        tipo: "error",
      });
    } finally {
      setActualizando(false);
    }
  };

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
    const { name, value } = e.target;

    if (name === "passwordNuevo") {
      setPasswordStrength(validatePassword(value));
    }

    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Validaciones
    if (passwordData.passwordNuevo.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (!/[A-Z]/.test(passwordData.passwordNuevo)) {
      setPasswordError(
        "La contraseña debe contener al menos una letra mayúscula"
      );
      return;
    }

    if (!/[a-z]/.test(passwordData.passwordNuevo)) {
      setPasswordError(
        "La contraseña debe contener al menos una letra minúscula"
      );
      return;
    }

    if (!/[0-9]/.test(passwordData.passwordNuevo)) {
      setPasswordError("La contraseña debe contener al menos un número");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(passwordData.passwordNuevo)) {
      setPasswordError(
        "La contraseña debe contener al menos un carácter especial"
      );
      return;
    }

    if (passwordData.passwordNuevo !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    try {
      setActualizando(true);

      // Primero intentamos iniciar sesión con la contraseña actual para verificarla
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usuario?.email || "",
        password: passwordData.passwordActual,
      });

      if (signInError) {
        setPasswordError("La contraseña actual es incorrecta");
        setActualizando(false);
        return;
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.passwordNuevo,
      });

      if (updateError) throw updateError;

      setMensaje({
        texto: "Contraseña actualizada correctamente",
        tipo: "exito",
      });

      // Resetear el formulario
      setPasswordData({
        passwordActual: "",
        passwordNuevo: "",
        confirmPassword: "",
      });

      // Cerrar la sección de cambio de contraseña
      setCambiandoPassword(false);

      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error al actualizar contraseña:", err.message);
      setPasswordError(
        "No se pudo actualizar la contraseña. Por favor, intenta nuevamente."
      );
    } finally {
      setActualizando(false);
    }
  };

  return (
    <AppLayout>
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

        {mensaje && (
          <div
            className={`p-4 mb-6 rounded-md ${
              mensaje.tipo === "exito"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4">
                  Información Personal
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="username"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md"
                        value={usuario?.email || ""}
                        disabled
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        El correo electrónico no se puede cambiar
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="nombre"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Nombre
                      </label>
                      <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.nombre}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="apellidos"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Apellidos
                      </label>
                      <input
                        type="text"
                        id="apellidos"
                        name="apellidos"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.apellidos}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="telefono"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="telefono"
                        name="telefono"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.telefono}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="empresa"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Empresa
                      </label>
                      <input
                        type="text"
                        id="empresa"
                        name="empresa"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.empresa}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={actualizando}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {actualizando ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Cambio de contraseña */}
              <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Seguridad</h2>
                  <button
                    type="button"
                    onClick={() => setCambiandoPassword(!cambiandoPassword)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {cambiandoPassword ? "Cancelar" : "Cambiar contraseña"}
                  </button>
                </div>

                {cambiandoPassword && (
                  <form onSubmit={handlePasswordSubmit}>
                    {passwordError && (
                      <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                        {passwordError}
                      </div>
                    )}

                    <div className="mb-4">
                      <label
                        htmlFor="passwordActual"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Contraseña actual
                      </label>
                      <input
                        type="password"
                        id="passwordActual"
                        name="passwordActual"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={passwordData.passwordActual}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="passwordNuevo"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Nueva contraseña
                      </label>
                      <input
                        type="password"
                        id="passwordNuevo"
                        name="passwordNuevo"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={passwordData.passwordNuevo}
                        onChange={handlePasswordChange}
                        required
                      />
                      {passwordStrength.strength && (
                        <p
                          className="mt-2 text-sm"
                          style={{ color: passwordStrength.color }}
                        >
                          Fortaleza de la contraseña:{" "}
                          {passwordStrength.strength}
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

                    <div className="mb-4">
                      <label
                        htmlFor="confirmPassword"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Confirmar nueva contraseña
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={actualizando}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        {actualizando
                          ? "Actualizando..."
                          : "Actualizar Contraseña"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Información de la cuenta */}
            <div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4">
                  Información de la Cuenta
                </h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Miembro desde</p>
                    <p>
                      {usuario?.created_at
                        ? new Date(usuario.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : "N/A"}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Plan actual</p>
                    <p>
                      <a
                        href="/membresias"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Ver detalles de membresía
                      </a>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Acciones de cuenta</p>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          supabase.auth.signOut().then(() => router.push("/"))
                        }
                        className="text-red-600 hover:text-red-800"
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
