// src/app/admin/dashboard/usuarios/editar/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Usuario, Mensaje } from "@/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../../../auth";

export default function EditarUsuario() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [usuario, setUsuario] = useState<Usuario>({
    id: "",
    email: "",
    username: "",
    created_at: "",
    nombre: "",
    apellidos: "",
    telefono: "",
    empresa: "",
    razon_social: "",
    cif: "",
    direccion_fiscal: "",
    codigo_postal: "",
    ciudad: "",
    provincia: "",
    pais: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [permisosVerificados, setPermisosVerificados] = useState(false);

  const cargarDatosUsuario = useCallback(async () => {
    try {
      setLoading(true);
      
      // Obtener datos básicos del usuario
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Actualizar el estado con los datos del usuario
      setUsuario(data);
    } catch (err) {
      console.error("Error al cargar datos del usuario:", err);
      setMensaje({
        texto: "No se pudieron cargar los datos del usuario",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);
  
  // useEffect para verificar permisos y cargar datos (solo se ejecuta una vez)
  useEffect(() => {
    if (!permisosVerificados) {
      const verificarAcceso = async () => {
        try {
          // 1. Verificar la autenticación de admin en Supabase
          try {
            const { data: { session } } = await supabase.auth.getSession();
            // Si hay un usuario logueado, comprobamos si es superadmin
            if (session && session.user && session.user.email) {
              const superAdminEmails = ['luisocro@gmail.com', 'admin@lucrapp.com'];
              if (superAdminEmails.includes(session.user.email)) {
                console.log("Superadmin detectado, concediendo acceso");
                // Superadmin tiene acceso, cargamos datos del usuario
                cargarDatosUsuario();
                setPermisosVerificados(true);
                return;
              }
            }
          } catch (authError) {
            console.warn("Error al verificar sesión de Supabase:", authError);
          }
          
          // 2. Verificar la autenticación de admin con el hook de admin
          if (isAuthenticated) {
            console.log("Admin autenticado mediante hook useAdminAuth");
            // Admin autenticado, cargar datos
            cargarDatosUsuario();
            setPermisosVerificados(true);
            return;
          }
          
          // 2.1 Verificar la autenticación de admin en sessionStorage (respaldo)
          const adminAuth = sessionStorage.getItem("adminAuth");
          if (adminAuth) {
            console.log("Autenticación de admin detectada en sessionStorage");
            // Admin autenticado, cargar datos
            cargarDatosUsuario();
            setPermisosVerificados(true);
            return;
          }
          
          // 3. Verificar funciones locales de autenticación como último recurso
          const tienePermisosLocales = isAdmin() || isSuperAdmin();
          if (tienePermisosLocales) {
            console.log("Permisos locales verificados");
            cargarDatosUsuario();
            setPermisosVerificados(true);
            return;
          }
          
          // Si llegamos aquí, el usuario no tiene permisos
          console.log("Sin permisos de acceso");
          setMensaje({
            texto: "No tienes permisos para acceder a esta página",
            tipo: "error"
          });
          setLoading(false);
          setPermisosVerificados(true);
        } catch (error) {
          console.error("Error al verificar acceso:", error);
          setMensaje({
            texto: "Error al verificar permisos de acceso",
            tipo: "error"
          });
          setLoading(false);
          setPermisosVerificados(true);
        }
      };
      
      verificarAcceso();
    }
  }, [permisosVerificados, userId, cargarDatosUsuario, isAdmin, isSuperAdmin, isAuthenticated]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUsuario(prev => ({ ...prev, [name]: value }));
  };

  // Guardar cambios del usuario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);

    try {
      console.log("Iniciando actualización de usuario, ID:", userId);
      
      // Enfoque simplificado: solo actualizar campos básicos
      const datosMinimos = {
        nombre: usuario.nombre || null,
        apellidos: usuario.apellidos || null,
        telefono: usuario.telefono || null,
        empresa: usuario.empresa || null
      };
      
      console.log("Intentando actualizar con datos mínimos:", datosMinimos);
      
      // Actualización directa, sin validaciones complejas
      const resultado = await supabase
        .from("usuarios")
        .update(datosMinimos)
        .eq("id", userId);
      
      // Verificar resultado
      console.log("Resultado de actualización:", resultado);
      
      if (resultado.error) {
        console.error("Error identificado:", resultado.error);
        throw resultado.error;
      }
      
      setMensaje({
        texto: "Usuario actualizado con éxito",
        tipo: "success"
      });
      
      // Redireccionar después de 1.5 segundos
      setTimeout(() => {
        router.push(`/admin/dashboard/usuarios/${userId}`);
      }, 1500);
    } catch (err: any) {
      console.error("Error capturado:", err);
      
      // Mostrar cualquier detalle disponible
      let detalleError = "";
      
      if (err.message) detalleError += ` Mensaje: ${err.message}`;
      if (err.code) detalleError += ` Código: ${err.code}`;
      if (err.details) detalleError += ` Detalles: ${err.details}`;
      
      setMensaje({
        texto: `Error al actualizar: ${detalleError || JSON.stringify(err)}`,
        tipo: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <Loading text="Cargando información del usuario..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Editar Usuario
        </h1>
        <div className="flex space-x-2">
          <Button 
            href={`/admin/dashboard/usuarios/${userId}`}
            variant="outline"
          >
            Cancelar
          </Button>
          <Button 
            href="/admin/dashboard/usuarios"
            variant="secondary"
          >
            Volver a la lista
          </Button>
        </div>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Información básica</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Email"
              name="email"
              type="email"
              value={usuario.email || ""}
              onChange={handleChange}
              required
              fullWidth
            />
            
            <Input
              label="Nombre de usuario"
              name="username"
              value={usuario.username || ""}
              onChange={handleChange}
              required
              fullWidth
            />
            
            <Input
              label="Nombre"
              name="nombre"
              value={usuario.nombre || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Apellidos"
              name="apellidos"
              value={usuario.apellidos || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Teléfono"
              name="telefono"
              value={usuario.telefono || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Empresa"
              name="empresa"
              value={usuario.empresa || ""}
              onChange={handleChange}
              fullWidth
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Datos de facturación</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Razón social"
              name="razon_social"
              value={usuario.razon_social || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="CIF/NIF"
              name="cif"
              value={usuario.cif || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Dirección fiscal"
              name="direccion_fiscal"
              value={usuario.direccion_fiscal || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Código postal"
              name="codigo_postal"
              value={usuario.codigo_postal || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Ciudad"
              name="ciudad"
              value={usuario.ciudad || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Provincia"
              name="provincia"
              value={usuario.provincia || ""}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="País"
              name="pais"
              value={usuario.pais || ""}
              onChange={handleChange}
              fullWidth
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            isLoading={guardando}
            disabled={guardando}
          >
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}