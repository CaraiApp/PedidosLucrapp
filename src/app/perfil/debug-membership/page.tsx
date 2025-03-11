"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import Loading from "@/components/ui/Loading";

export default function DebugMembershipPage() {
  const { user, isLoading } = useAuth();
  const [membershipData, setMembershipData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const fetchMembershipData = async () => {
      if (isLoading) return; // Esperar a que useAuth termine
      
      try {
        setLoadingData(true);
        
        // Mostrar mensaje de carga
        console.log("Cargando datos de membresía...");
        
        // Forzar headers para mejorar la detección de la sesión
        const response = await fetch('/api/debug-membership', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Datos recibidos:", data);
        setMembershipData(data);
      } catch (error) {
        console.error("Error fetching membership data:", error);
        // No lanzar error para evitar que falle el componente
      } finally {
        setLoadingData(false);
      }
    };

    fetchMembershipData();
  }, [isLoading]);

  const updateMembership = async () => {
    try {
      setUpdating(true);
      setMessage(null);
      
      console.log("Iniciando reparación y actualización de membresía...");
      
      // 1. Intentar reparar primero usando el servicio de membresía mejorado
      try {
        console.log("Intentando reparar membresía con MembershipService...");
        const result = await fetch('/api/test-membership?userId=' + (user?.id || ''), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });
        
        const data = await result.json();
        console.log("Resultado de test-membership:", data);
        
        if (data.success) {
          setMessage({
            text: "Membresía actualizada correctamente. " + 
                  (data.isTemporal ? "Se está usando una membresía temporal debido a problemas de conexión con la base de datos." : ""),
            type: 'success'
          });
          
          // Refrescar los datos
          const response = await fetch('/api/debug-membership');
          const newData = await response.json();
          setMembershipData(newData);
          return;
        }
      } catch (error) {
        console.error("Error en prueba de membresía:", error);
        // Continuamos con el siguiente método
      }
      
      // 2. Usar el endpoint de reparación como respaldo
      try {
        console.log("Intentando reparar con API fix...");
        const response = await fetch('/api/debug-membership/fix', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({ userId: user?.id || membershipData?.user?.id }),
          credentials: 'include'
        });
        
        const data = await response.json();
        console.log("Resultado de reparación:", data);
        
        if (data.success) {
          setMessage({
            text: "Membresía reparada correctamente. Por favor recarga la página para ver los cambios.",
            type: 'success'
          });
          
          // Refrescar los datos
          const response = await fetch('/api/debug-membership');
          const newData = await response.json();
          setMembershipData(newData);
          return;
        } else {
          setMessage({
            text: `Error: ${data.message || 'Ocurrió un error al reparar la membresía'}`,
            type: 'error'
          });
        }
      } catch (error) {
        console.error("Error en reparación:", error);
        // Continuamos con el método tradicional
      }
      
      // 3. Método original como último recurso
      console.log("Usando método tradicional como último recurso...");
      const response = await fetch('/api/update-membership', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({
          text: "Membresía actualizada correctamente. Por favor recarga la página para ver los cambios.",
          type: 'success'
        });
        
        // Refrescar los datos después de 1 segundo
        setTimeout(async () => {
          const response = await fetch('/api/debug-membership');
          const newData = await response.json();
          setMembershipData(newData);
        }, 1000);
      } else {
        setMessage({
          text: `Error: ${data.error || 'Ocurrió un error al actualizar la membresía'}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error("Error updating membership:", error);
      setMessage({
        text: "Error al comunicarse con el servidor. Se usará una membresía temporal.",
        type: 'error'
      });
      
      // Refrescar datos de todos modos para mostrar membresía temporal
      try {
        const response = await fetch('/api/debug-membership');
        const newData = await response.json();
        setMembershipData(newData);
      } catch (err) {
        console.error("Error refrescando datos:", err);
      }
    } finally {
      setUpdating(false);
    }
  };
  
  if (isLoading || loadingData) {
    return (
      <AppLayout>
        <div className="py-8">
          <Loading text="Cargando información de membresía..." />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Debug de Membresía</h1>
          <div>
            <Link href="/perfil">
              <button className="px-4 py-2 mx-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Volver al Perfil
              </button>
            </Link>
            <Link href="/api/verify-ai-access" target="_blank">
              <button className="px-4 py-2 mx-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                Verificar Acceso IA
              </button>
            </Link>
            <button 
              onClick={() => {
                fetch('/api/debug-membership/fix', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ userId: user?.id || membershipData?.user?.id })
                })
                .then(resp => resp.json())
                .then(data => {
                  setMessage({
                    text: data.success ? "Membresía reparada correctamente" : `Error: ${data.message}`,
                    type: data.success ? 'success' : 'error'
                  });
                  if (data.success) {
                    // Refrescar datos tras reparación
                    setTimeout(async () => {
                      const response = await fetch('/api/debug-membership', {
                        credentials: 'include'
                      });
                      const newData = await response.json();
                      setMembershipData(newData);
                    }, 1000);
                  }
                })
                .catch(err => {
                  setMessage({
                    text: `Error: ${err.message}`,
                    type: 'error'
                  });
                });
              }}
              disabled={updating}
              className="px-4 py-2 mx-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Reparar Membresía
            </button>
            <button 
              onClick={updateMembership}
              disabled={updating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? "Actualizando..." : "Actualizar a Premium"}
            </button>
            <Link href={`/api/debug-membership?userId=ddb19376-9903-487d-b3c8-98e40147c69d`} target="_blank">
              <button className="ml-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Ver Usuario 1
              </button>
            </Link>
            <Link href={`/api/debug-membership?userId=b4ea00c3-5e49-4245-a63b-2e3b053ca2c7`} target="_blank">
              <button className="ml-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Ver Usuario 2
              </button>
            </Link>
            <Link href={`/api/debug-membership?userId=b99f2269-1587-4c4c-92cd-30a212c2070e`} target="_blank">
              <button className="ml-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                Ver Usuario 3
              </button>
            </Link>
          </div>
        </div>
        
        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Información del Usuario</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Email:</p>
              <p>{membershipData?.user?.email || 'No disponible'}</p>
            </div>
            <div>
              <p className="font-semibold">ID de Membresía Activa:</p>
              <p>{membershipData?.user?.membresia_activa_id || 'No disponible'}</p>
            </div>
            <div>
              <p className="font-semibold">Es Admin:</p>
              <p>{membershipData?.isAdmin ? 'Sí' : 'No'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Datos de Membresía Premium</h2>
          
          <div className="border rounded-lg p-4 mb-4">
            <p className="font-semibold">ID de la Membresía Premium:</p>
            <p>{membershipData?.premiumMembership?.id || 'No disponible'}</p>
            
            <p className="font-semibold mt-2">Nombre:</p>
            <p>{membershipData?.premiumMembership?.nombre || 'No disponible'}</p>
            
            <p className="font-semibold mt-2">Tiene IA:</p>
            <p>{membershipData?.premiumMembership?.tiene_ai ? 'Sí' : 'No'}</p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Membresía Activa</h2>
          
          {membershipData?.activeMembership ? (
            <div className="border rounded-lg p-4">
              <p className="font-semibold">ID de la Membresía:</p>
              <p>{membershipData.activeMembership.id}</p>
              
              <p className="font-semibold mt-2">ID del Tipo de Membresía:</p>
              <p>{membershipData.activeMembership.tipo_membresia_id}</p>
              
              <p className="font-semibold mt-2">Estado:</p>
              <p>{membershipData.activeMembership.estado}</p>
              
              <p className="font-semibold mt-2">Información del tipo de membresía:</p>
              <div className="pl-4 border-l-2 border-gray-200 mt-1">
                <p><span className="font-medium">ID:</span> {membershipData.activeMembership.tipo_membresia?.id}</p>
                <p><span className="font-medium">Nombre:</span> {membershipData.activeMembership.tipo_membresia?.nombre}</p>
                <p><span className="font-medium">Tiene IA:</span> {membershipData.activeMembership.tipo_membresia?.tiene_ai ? 'Sí' : 'No'}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No hay membresía activa</p>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Todas las Membresías del Usuario</h2>
          
          {membershipData?.memberships && membershipData.memberships.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiene IA</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Inicio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Fin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {membershipData.memberships.map((membership: any) => (
                    <tr key={membership.id} className={membership.id === membershipData.user.membresia_activa_id ? 'bg-green-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">{membership.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{membership.tipo_membresia?.nombre || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{membership.estado}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{membership.tipo_membresia?.tiene_ai ? 'Sí' : 'No'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(membership.fecha_inicio).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(membership.fecha_fin).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No se encontraron membresías</p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}