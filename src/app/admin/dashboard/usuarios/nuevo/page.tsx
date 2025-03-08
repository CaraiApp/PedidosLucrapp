// src/app/admin/dashboard/usuarios/nuevo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mensaje } from "@/types";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Loading from "@/components/ui/Loading";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "../../../auth";

export default function NuevoUsuario() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const { isAuthenticated } = useAdminAuth();
  const router = useRouter();

  // Estado del formulario
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
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
  
  // Estados para manejar la interfaz
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [permisosVerificados, setPermisosVerificados] = useState(false);

  // Verificar permisos de acceso
  useEffect(() => {
    if (!permisosVerificados) {
      const verificarAcceso = async () => {
        try {
          // Verificar si está autenticado como admin
          if (isAuthenticated) {
            console.log("Admin autenticado con useAdminAuth");
            setLoading(false);
            setPermisosVerificados(true);
            return;
          }
          
          // Verificar si es superadmin o admin
          if (isAdmin() || isSuperAdmin()) {
            console.log("Usuario con permisos de admin");
            setLoading(false);
            setPermisosVerificados(true);
            return;
          }
          
          // Si llegamos aquí, no tiene permisos
          setMensaje({
            texto: "No tienes permisos para crear usuarios",
            tipo: "error"
          });
          setLoading(false);
          setPermisosVerificados(true);
        } catch (error) {
          console.error("Error al verificar permisos:", error);
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
  }, [isAuthenticated, isAdmin, isSuperAdmin, permisosVerificados]);

  // Manejar cambios en los campos del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Crear nuevo usuario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    setGuardando(true);

    try {
      // Validar campos requeridos
      if (!formData.email || !formData.password || !formData.username) {
        setMensaje({
          texto: "El email, contraseña y nombre de usuario son obligatorios",
          tipo: "error"
        });
        setGuardando(false);
        return;
      }

      console.log("Creando usuario en autenticación...");
      // 1. Crear usuario en autenticación
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        console.error("Error en autenticación:", authError);
        throw new Error(`Error al crear la cuenta: ${authError.message}`);
      }

      if (!authData?.user?.id) {
        throw new Error("No se pudo crear el usuario en el sistema de autenticación");
      }

      console.log("Usuario creado en auth con ID:", authData.user.id);
      
      // 2. Crear perfil de usuario en tabla personalizada
      const { error: profileError } = await supabase
        .from("usuarios")
        .insert({
          id: authData.user.id,
          email: formData.email,
          username: formData.username,
          nombre: formData.nombre || null,
          apellidos: formData.apellidos || null,
          telefono: formData.telefono || null,
          empresa: formData.empresa || null,
          razon_social: formData.razon_social || null,
          cif: formData.cif || null,
          direccion_fiscal: formData.direccion_fiscal || null,
          codigo_postal: formData.codigo_postal || null,
          ciudad: formData.ciudad || null,
          provincia: formData.provincia || null,
          pais: formData.pais || null
        });

      if (profileError) {
        console.error("Error al crear perfil:", profileError);
        throw new Error(`Error al crear perfil de usuario: ${profileError.message}`);
      }

      console.log("Perfil de usuario creado con éxito");
      
      // 3. Asignar membresía gratuita al usuario
      await asignarMembresiaGratuita(authData.user.id);

      setMensaje({
        texto: "Usuario creado con éxito",
        tipo: "success"
      });

      // Redireccionar después de 1.5 segundos
      setTimeout(() => {
        router.push("/admin/dashboard/usuarios");
      }, 1500);
    } catch (err: any) {
      console.error("Error al crear usuario:", err);
      
      setMensaje({
        texto: err.message || "Error al crear el usuario. Intenta nuevamente.",
        tipo: "error"
      });
    } finally {
      setGuardando(false);
    }
  };

  // Función auxiliar para asignar membresía gratuita
  const asignarMembresiaGratuita = async (userId: string) => {
    try {
      console.log("Asignando membresía gratuita al usuario...");
      
      // Calcular fechas
      const fechaInicio = new Date().toISOString();
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1); // Plan gratuito por 1 año
      
      // Intentar buscar el ID del plan gratuito por nombre
      let tipoPlanGratuitoId = "13fae609-2679-47fa-9731-e2f1badc4a61"; // ID fijo conocido como fallback
      
      try {
        const { data, error } = await supabase
          .from("membresia_tipos")
          .select("id")
          .eq("nombre", "Plan Gratuito")
          .single();
          
        if (error) {
          console.log("No se encontró el Plan Gratuito por nombre, usando ID fijo");
        } else if (data) {
          tipoPlanGratuitoId = data.id;
          console.log("ID del Plan Gratuito encontrado en DB:", tipoPlanGratuitoId);
        }
      } catch (err) {
        console.error("Error al buscar el plan gratuito:", err);
        // Continuamos con el ID fijo como fallback
      }
      
      // Usar la API para evitar problemas con RLS
      console.log("Usando API para crear membresía...");
      const response = await fetch('/api/create-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          tipoMembresiaId: tipoPlanGratuitoId,
          fechaInicio: fechaInicio,
          fechaFin: fechaFin.toISOString(),
          estado: 'activa'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error("Error al crear membresía a través de API:", result.error);
        throw new Error(result.error || "Error al crear membresía");
      }
      
      console.log("Membresía gratuita asignada con éxito a través de API");
      return true;
    } catch (error) {
      console.error("Error en asignación de membresía:", error);
      return false;
    }
  };

  if (loading) {
    return <Loading text="Verificando permisos..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Crear Nuevo Usuario
        </h1>
        <Button 
          href="/admin/dashboard/usuarios"
          variant="secondary"
        >
          Volver a la lista
        </Button>
      </div>

      <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Información de acceso</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              fullWidth
            />
            
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              fullWidth
              helpText="Mínimo 6 caracteres"
            />
            
            <Input
              label="Nombre de usuario"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              fullWidth
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Información personal</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Apellidos"
              name="apellidos"
              value={formData.apellidos}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Teléfono"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Empresa"
              name="empresa"
              value={formData.empresa}
              onChange={handleChange}
              fullWidth
            />
          </div>
        </Card>

        <Card className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Datos de facturación (opcionales)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Razón social"
              name="razon_social"
              value={formData.razon_social}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="CIF/NIF"
              name="cif"
              value={formData.cif}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Dirección fiscal"
              name="direccion_fiscal"
              value={formData.direccion_fiscal}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Código postal"
              name="codigo_postal"
              value={formData.codigo_postal}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Ciudad"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="Provincia"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              fullWidth
            />
            
            <Input
              label="País"
              name="pais"
              value={formData.pais}
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
            Crear usuario
          </Button>
        </div>
      </form>
    </div>
  );
}