"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "../components/AppLayout";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { Mensaje } from "@/types";
import { supabase } from "@/lib/supabase";

export default function PerfilPage() {
  const router = useRouter();
  const { user, isLoading, error, updateProfile, signOut } = useAuth();
  const [actualizando, setActualizando] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    nombre: user?.nombre || "",
    apellidos: user?.apellidos || "",
    telefono: user?.telefono || "",
    empresa: user?.empresa || "",
  });
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
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

  // Actualizar el formData cuando se carga el usuario
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        nombre: user.nombre || "",
        apellidos: user.apellidos || "",
        telefono: user.telefono || "",
        empresa: user.empresa || "",
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActualizando(true);
    setMensaje(null);

    try {
      console.log("Actualizando perfil con datos:", formData);
      
      // Comprobar que tenemos un usuario autenticado
      if (!user || !user.id) {
        throw new Error("No hay un usuario autenticado");
      }

      try {
        // Ahora actualizamos todos los campos ya que existen en la tabla
        console.log("Actualizando todos los campos del perfil");
        const { data, error } = await supabase
          .from('usuarios')
          .update({
            username: formData.username,
            nombre: formData.nombre || null,
            apellidos: formData.apellidos || null,
            telefono: formData.telefono || null,
            empresa: formData.empresa || null,
          })
          .eq('id', user.id)
          .select();
          
        if (error) {
          console.error("Error al actualizar usuarios:", error);
          throw error;
        }
        
        console.log("Datos actualizados:", data);
        
        // Recargar la página después de mostrar el mensaje de éxito
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (updateError) {
        console.error("Error en la actualización:", updateError);
        throw new Error("Error al actualizar el perfil de usuario");
      }
      
      setMensaje({
        texto: "Perfil actualizado correctamente",
        tipo: "exito",
      });
      
      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => {
        setMensaje(null);
      }, 3000);
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      setMensaje({
        texto: "No se pudo actualizar el perfil. Por favor, intenta nuevamente.",
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
        email: user?.email || "",
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
    } catch (err) {
      console.error("Error al actualizar contraseña:", err);
      setPasswordError(
        "No se pudo actualizar la contraseña. Por favor, intenta nuevamente."
      );
    } finally {
      setActualizando(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AppLayout>
      <div className="py-8">
        <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

        <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

        {isLoading ? (
          <Loading text="Cargando perfil..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <Card title="Información Personal">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nombre de usuario"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      fullWidth
                    />
                    
                    <Input
                      label="Correo electrónico"
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      helpText="El correo electrónico no se puede cambiar"
                      fullWidth
                    />
                    
                    <Input
                      label="Nombre"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      fullWidth
                    />
                    
                    <Input
                      label="Apellidos"
                      id="apellidos"
                      name="apellidos"
                      value={formData.apellidos}
                      onChange={handleInputChange}
                      fullWidth
                    />
                    
                    <Input
                      label="Teléfono"
                      id="telefono"
                      name="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      fullWidth
                    />
                    
                    <Input
                      label="Empresa"
                      id="empresa"
                      name="empresa"
                      value={formData.empresa}
                      onChange={handleInputChange}
                      fullWidth
                    />
                  </div>

                  <div className="mt-6">
                    <Button
                      type="submit"
                      isLoading={actualizando}
                      disabled={actualizando}
                    >
                      Guardar Cambios
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Cambio de contraseña */}
              <Card
                title="Seguridad"
                className="mt-6"
                titleClassName="flex justify-between items-center"
                footer={
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCambiandoPassword(!cambiandoPassword)}
                  >
                    {cambiandoPassword ? "Cancelar" : "Cambiar contraseña"}
                  </Button>
                }
              >
                {cambiandoPassword && (
                  <form onSubmit={handlePasswordSubmit}>
                    {passwordError && (
                      <Alert
                        mensaje={{ texto: passwordError, tipo: "error" }}
                        onClose={() => setPasswordError(null)}
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Contraseña actual"
                        id="passwordActual"
                        name="passwordActual"
                        type="password"
                        value={passwordData.passwordActual}
                        onChange={handlePasswordChange}
                        required
                        fullWidth
                      />

                      <div className="md:col-span-2">
                        <Input
                          label="Nueva contraseña"
                          id="passwordNuevo"
                          name="passwordNuevo"
                          type="password"
                          value={passwordData.passwordNuevo}
                          onChange={handlePasswordChange}
                          required
                          fullWidth
                          helpText={
                            <>
                              <p>La contraseña debe contener al menos:</p>
                              <ul className="list-disc pl-5 mt-1">
                                <li>8 caracteres</li>
                                <li>Una letra mayúscula</li>
                                <li>Una letra minúscula</li>
                                <li>Un número</li>
                                <li>Un carácter especial</li>
                              </ul>
                              {passwordStrength.strength && (
                                <p
                                  className="mt-2 font-medium"
                                  style={{ color: passwordStrength.color }}
                                >
                                  Fortaleza: {passwordStrength.strength}
                                </p>
                              )}
                            </>
                          }
                        />
                      </div>

                      <Input
                        label="Confirmar nueva contraseña"
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        fullWidth
                      />
                    </div>

                    <div className="mt-4">
                      <Button
                        type="submit"
                        isLoading={actualizando}
                        disabled={actualizando}
                      >
                        Actualizar Contraseña
                      </Button>
                    </div>
                  </form>
                )}
              </Card>
            </div>

            {/* Información de la cuenta */}
            <div>
              <Card title="Información de la Cuenta">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Miembro desde</p>
                    <p className="text-lg">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString(
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
                    <p className="text-sm font-medium text-gray-500">Gestión de cuenta</p>
                    <div className="mt-2 space-y-2">
                      <Button href="/perfil/membresia" variant="outline" size="sm" className="w-full">
                        Mi Membresía
                      </Button>
                      <Button href="/perfil/facturacion" variant="outline" size="sm" className="w-full">
                        Datos de Facturación
                      </Button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500">Estado de membresía</p>
                    <div className="mt-2">
                      {user?.membresia_activa && user.membresia_activa.tipo_membresia ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-green-600">
                            {user.membresia_activa.tipo_membresia.nombre || 'Plan Básico'} (Activa)
                          </span>
                          <span className="text-xs text-gray-500">
                            Hasta: {new Date(user.membresia_activa.fecha_fin).toLocaleDateString('es-ES')}
                          </span>
                          <Button href="/membresias" variant="outline" size="sm" className="mt-2">
                            Cambiar plan
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-sm font-medium text-yellow-600">Plan gratuito</span>
                          <Button href="/membresias" variant="primary" size="sm" className="mt-2 w-full">
                            Actualizar a Premium
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-500">Acciones de cuenta</p>
                    <div className="mt-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleSignOut}
                      >
                        Cerrar sesión
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
