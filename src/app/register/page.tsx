"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    strength: string;
    color: string;
  }>({
    strength: "",
    color: "",
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "password") {
      setPasswordStrength(validatePassword(value));
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};

    // Validar username
    if (!formData.username) {
      newErrors.username = "Por favor ingrese un nombre de usuario.";
    } else if (!/^[a-zA-Z0-9_]{4,20}$/.test(formData.username)) {
      newErrors.username =
        "El nombre de usuario debe tener entre 4 y 20 caracteres y solo puede contener letras, números y guiones bajos.";
    }

    // Validar email
    if (!formData.email) {
      newErrors.email = "Por favor ingrese un correo electrónico.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Por favor ingrese un correo electrónico válido.";
    }

    // Validar contraseña
    if (!formData.password) {
      newErrors.password = "Por favor ingrese una contraseña.";
    } else if (formData.password.length < 8) {
      newErrors.password = "La contraseña debe tener al menos 8 caracteres.";
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        "La contraseña debe contener al menos una letra mayúscula.";
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password =
        "La contraseña debe contener al menos una letra minúscula.";
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "La contraseña debe contener al menos un número.";
    } else if (!/[^A-Za-z0-9]/.test(formData.password)) {
      newErrors.password =
        "La contraseña debe contener al menos un carácter especial.";
    }

    // Validar confirmación de contraseña
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Por favor confirme la contraseña.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      // 1. Registro en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Insertar datos adicionales en la tabla de usuarios
      const { error: profileError } = await supabase.from("usuarios").insert({
        id: authData.user.id,
        username: formData.username,
        email: formData.email,
      });

      if (profileError) throw profileError;

      // 3. Obtener el ID del plan básico/gratuito
      const { data: planGratuito, error: planError } = await supabase
        .from("membresia_tipos")
        .select("id")
        .eq("nombre", "Plan Básico")
        .single();

      if (planError)
        throw new Error("Error al obtener plan gratuito: " + planError.message);

      // ID del plan gratuito
      const tipoPlanGratuitoId = planGratuito.id;

      // 4. Crear membresía gratuita
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

      const { data: membresia, error: membresiaError } = await supabase
        .from("membresias_usuarios")
        .insert({
          usuario_id: authData.user.id,
          tipo_membresia_id: tipoPlanGratuitoId,
          fecha_inicio: new Date().toISOString(),
          fecha_fin: oneYearFromNow.toISOString(),
          estado: "activa",
        })
        .select()
        .single();

      if (membresiaError) throw membresiaError;

      // 5. Actualizar la membresía activa del usuario
      const { error: updateUserError } = await supabase
        .from("usuarios")
        .update({ membresia_activa_id: membresia.id })
        .eq("id", authData.user.id);

      if (updateUserError) throw updateUserError;

      // Redirigir al login
      router.push("/login?registro=exitoso");
    } catch (error: unknown) {
      console.error("Error en el registro:", error.message);
      setErrors((prev) => ({
        ...prev,
        general: error.message || "Ocurrió un error durante el registro",
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Crea tu cuenta
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errors.general && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {errors.general}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Nombre de usuario
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600">{errors.username}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Entre 4 y 20 caracteres, solo letras, números y guiones bajos.
              </p>
            </div>

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
              {errors.email && (
                <p className="mt-2 text-sm text-red-600">{errors.email}</p>
              )}
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
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.password}
                  onChange={handleChange}
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
              {errors.password && (
                <p className="mt-2 text-sm text-red-600">{errors.password}</p>
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
                Confirmar Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? "Procesando..." : "Registrarse"}
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
                  ¿Ya tienes una cuenta?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
