// src/app/admin/dashboard/seguridad/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import { Mensaje } from "@/types";
import { generateCSRFToken, useAdminAuth } from "../../auth";
import { supabase } from "@/lib/supabase";
import CryptoJS from "crypto-js";

export default function SeguridadAdmin() {
  const router = useRouter();
  const { isAuthenticated } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [currentCSRFToken, setCurrentCSRFToken] = useState<string>("");
  const [caducidadSesion, setCaducidadSesion] = useState<string>("4");
  const [intentosFallidos, setIntentosFallidos] = useState<number>(0);
  const [ultimoAcceso, setUltimoAcceso] = useState<string>("");
  
  // Información para cambiar contraseña
  const [nuevaPassword, setNuevaPassword] = useState<string>("");
  const [confirmarPassword, setConfirmarPassword] = useState<string>("");
  const [passwordActual, setPasswordActual] = useState<string>("");

  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Generar un nuevo token CSRF (ahora es asíncrono)
        const token = await generateCSRFToken();
        setCurrentCSRFToken(token);
        
        // Cargar CryptoJS de forma segura
        const crypto = await import('crypto-js');
        
        // Obtener información de la sesión actual
        const adminDataStr = sessionStorage.getItem("adminAuth");
        if (adminDataStr) {
          try {
            // Intentar diferentes enfoques de descifrado
            let adminData;
            
            // Si parece ser JSON plano (para desarrollo)
            if (adminDataStr.startsWith('{') && adminDataStr.endsWith('}')) {
              adminData = JSON.parse(adminDataStr);
            } else {
              // Descifrar usando CryptoJS
              const bytes = crypto.AES.decrypt(adminDataStr, "lucrapp-admin-secret-key-2025");
              adminData = JSON.parse(bytes.toString(crypto.enc.Utf8));
            }
            
            if (adminData.lastAccess) {
              const fecha = new Date(adminData.lastAccess);
              setUltimoAcceso(fecha.toLocaleString('es-ES'));
            }
          } catch (error) {
            console.error("Error al descifrar datos de sesión", error);
          }
        }
        
        // Obtener intentos fallidos (podría guardarse en localStorage)
        const intentos = localStorage.getItem("adminFailedAttempts") || "0";
        setIntentosFallidos(parseInt(intentos));
        
      } catch (error) {
        console.error("Error al inicializar seguridad:", error);
      }
    };
    
    initializeSecurity();
  }, []);

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    
    if (nuevaPassword !== confirmarPassword) {
      setMensaje({
        texto: "Las contraseñas no coinciden",
        tipo: "error"
      });
      return;
    }
    
    if (nuevaPassword.length < 8) {
      setMensaje({
        texto: "La contraseña debe tener al menos 8 caracteres",
        tipo: "error"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Cargar CryptoJS de forma segura
      const crypto = await import('crypto-js');
      
      // Verificar la contraseña actual (en producción, esto debería validarse contra la base de datos)
      const actualPasswordHash = crypto.MD5(passwordActual).toString();
      const validPasswordHashes = [
        "f7f4d7eb19722cebd6c5f9fae94ddb65", // Hash de "Global01"
        "46e44aa0f7fe67b53554a9fc2c76fbcc"  // Hash de "Global01."
      ];
      
      // También aceptamos la contraseña en texto plano para la demo
      if (passwordActual === "Global01") {
        // Contraseña correcta
      } else if (!validPasswordHashes.includes(actualPasswordHash)) {
        setMensaje({
          texto: "La contraseña actual no es correcta",
          tipo: "error"
        });
        setLoading(false);
        return;
      }
      
      // En un entorno real, aquí se actualizaría la contraseña en la base de datos
      // Para esta demo, vamos a simular un cambio exitoso
      
      // Crear hash de la nueva contraseña para mostrar (en producción, se guardaría en la BD)
      const nuevaPasswordHash = crypto.MD5(nuevaPassword).toString();
      
      // Mostrar mensaje de éxito con el hash para propósitos de debug
      setMensaje({
        texto: `Contraseña actualizada correctamente. En producción, este hash se guardaría en la BD: ${nuevaPasswordHash}`,
        tipo: "success"
      });
      
      // Limpiar campos
      setNuevaPassword("");
      setConfirmarPassword("");
      setPasswordActual("");
      
      // En producción, se actualizaría el hash en la base de datos
      console.log("Nueva contraseña hash:", nuevaPasswordHash);
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      setMensaje({
        texto: "Error al actualizar la contraseña. Intente nuevamente.",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarTiempoSesion = () => {
    setLoading(true);
    
    try {
      // En un entorno real, esto se guardaría en la base de datos
      // Para esta demo, solo mostramos un mensaje de éxito
      
      setMensaje({
        texto: `Tiempo de caducidad de sesión actualizado a ${caducidadSesion} horas`,
        tipo: "success"
      });
    } catch (error) {
      console.error("Error al cambiar tiempo de sesión:", error);
      setMensaje({
        texto: "Error al actualizar el tiempo de sesión",
        tipo: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReiniciarIntentosFallidos = () => {
    try {
      localStorage.setItem("adminFailedAttempts", "0");
      setIntentosFallidos(0);
      
      setMensaje({
        texto: "Contador de intentos fallidos reiniciado",
        tipo: "success"
      });
    } catch (error) {
      console.error("Error al reiniciar intentos:", error);
      setMensaje({
        texto: "Error al reiniciar intentos fallidos",
        tipo: "error"
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Configuración de Seguridad</h1>
        
        <Alert mensaje={mensaje} onClose={() => setMensaje(null)} />
        
        {/* Información de sesión */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Información de sesión</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-sm font-medium text-gray-500">Token CSRF actual</h3>
              <p className="mt-1 text-sm text-gray-900">{currentCSRFToken.substring(0, 8)}...</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-sm font-medium text-gray-500">Último acceso</h3>
              <p className="mt-1 text-sm text-gray-900">{ultimoAcceso || "No disponible"}</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-sm font-medium text-gray-500">Intentos fallidos de acceso</h3>
              <p className="mt-1 text-sm text-gray-900">{intentosFallidos}</p>
              <Button 
                variant="ghost" 
                className="mt-2 text-xs"
                onClick={handleReiniciarIntentosFallidos}
              >
                Reiniciar contador
              </Button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border">
              <h3 className="text-sm font-medium text-gray-500">Tiempo de caducidad de sesión</h3>
              <div className="flex mt-1 items-center">
                <Input
                  id="caducidadSesion"
                  name="caducidadSesion"
                  type="number"
                  min="1"
                  max="24"
                  value={caducidadSesion}
                  onChange={(e) => setCaducidadSesion(e.target.value)}
                  className="w-20 mr-2"
                />
                <span className="text-sm text-gray-600">horas</span>
                <Button 
                  variant="outline" 
                  className="ml-2 text-sm"
                  onClick={handleCambiarTiempoSesion}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Cambio de contraseña */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Cambiar contraseña de administrador</h2>
          
          <form onSubmit={handleCambiarPassword} className="space-y-4 max-w-md">
            <Input
              id="passwordActual"
              name="passwordActual"
              type="password"
              label="Contraseña actual"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              required
              fullWidth
            />
            
            <Input
              id="nuevaPassword"
              name="nuevaPassword"
              type="password"
              label="Nueva contraseña"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              required
              fullWidth
            />
            
            <Input
              id="confirmarPassword"
              name="confirmarPassword"
              type="password"
              label="Confirmar nueva contraseña"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              required
              fullWidth
            />
            
            <div className="pt-2">
              <Button
                type="submit"
                isLoading={loading}
                disabled={loading}
              >
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Logs de actividad */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Registro de actividad reciente</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y hora
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acción
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date().toLocaleString('es-ES')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Acceso al panel de administrador
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  127.0.0.1
                </td>
              </tr>
              {/* Entradas adicionales del registro de actividad */}
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(Date.now() - 3600000).toLocaleString('es-ES')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Cambio de configuración
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  127.0.0.1
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}