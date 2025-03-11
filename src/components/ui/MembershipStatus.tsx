import React from 'react';
import Alert from './Alert';
import { Mensaje } from '@/types';

interface MembershipStatusProps {
  membership: any;
  showTemporalWarning?: boolean;
  isAdmin?: boolean;
}

/**
 * Componente para mostrar el estado de membresía con alertas visuales
 * cuando hay problemas que requieren atención del usuario o administrador
 */
const MembershipStatus: React.FC<MembershipStatusProps> = ({ 
  membership,
  showTemporalWarning = true,
  isAdmin = false
}) => {
  if (!membership) return null;
  
  const isTemporary = membership.estado === 'temporal';
  
  if (!isTemporary || !showTemporalWarning) return null;
  
  // Diferentes mensajes para administradores y usuarios regulares
  const texto = isAdmin
    ? '⚠️ La membresía de este usuario está en estado temporal debido a un problema de conexión con la base de datos. Necesitas crear una membresía real para que pueda acceder a todas las funcionalidades.'
    : '⚠️ Tu plan actual es temporal debido a un problema técnico. Algunas funcionalidades pueden estar limitadas. Por favor, intenta reparar la membresía desde la página de perfil o contacta con soporte.';
  
  const mensaje: Mensaje = {
    texto,
    tipo: 'advertencia'
  };
  
  return (
    <div className="mb-4">
      <Alert 
        mensaje={mensaje}
        className="mb-2"
      />
      {isAdmin ? (
        <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-sm">
          <strong>Solución para administradores:</strong>
          <ol className="list-decimal pl-5 mt-1 space-y-1 text-gray-700">
            <li>Usa la función "Reparar membresía" en la página de usuarios</li>
            <li>O crea manualmente una nueva membresía para este usuario</li>
            <li>Verifica que las políticas de seguridad de Supabase están correctamente configuradas</li>
            <li>Comprueba que la clave de servicio (SUPABASE_SERVICE_ROLE_KEY) es correcta en las variables de entorno</li>
          </ol>
        </div>
      ) : (
        <div className="mt-2 bg-indigo-50 p-3 rounded-md border border-indigo-200 text-sm text-gray-700">
          <p className="mb-1">Esta es una <strong>membresía temporal</strong> que te permite seguir utilizando la aplicación a pesar del problema técnico. Incluye:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Hasta {membership.tipo_membresia.limite_proveedores} proveedores</li>
            <li>Hasta {membership.tipo_membresia.limite_articulos} artículos</li>
            <li>Hasta {membership.tipo_membresia.limite_listas} listas de compra</li>
            <li>Acceso a funciones de IA: {membership.tipo_membresia.tiene_ai ? '✓' : '✗'}</li>
          </ul>
          <p className="mt-2 text-indigo-600 font-medium">Puedes intentar reparar la membresía desde la página de <a href="/perfil/debug-membership" className="underline">Depuración de Membresía</a>.</p>
        </div>
      )}
    </div>
  );
};

export default MembershipStatus;