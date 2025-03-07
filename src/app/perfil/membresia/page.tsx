"use client";

import { useState } from "react";
import Link from "next/link";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";

export default function MembresiaPage() {
  const { user, isLoading } = useAuth();
  const [mensaje, setMensaje] = useState<{ texto: string; tipo: string } | null>(null);

  const formatearFecha = (fechaStr?: string) => {
    if (!fechaStr) return "N/A";
    return new Date(fechaStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <Loading text="Cargando información de membresía..." />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Mi Membresía</h1>
          <div>
            <Link href="/perfil">
              <Button variant="outline" className="mr-2">
                Volver al Perfil
              </Button>
            </Link>
            <Link href="/perfil/facturacion">
              <Button variant="outline">
                Datos de Facturación
              </Button>
            </Link>
          </div>
        </div>

        <Alert mensaje={mensaje && { texto: mensaje.texto, tipo: mensaje.tipo as 'exito' | 'error' | 'info' | 'advertencia' }} onClose={() => setMensaje(null)} />

        {/* Estado de la membresía */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Información de Membresía</h3>
            
            {user?.membresia_activa ? (
              <div className="mt-5">
                <div className="rounded-md bg-green-50 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm leading-5 font-medium text-green-800">
                        Membresía Activa: {user.membresia_activa.tipo_membresia.nombre}
                      </h3>
                      <div className="mt-2 text-sm leading-5 text-green-700">
                        <p>Tu membresía estará activa hasta el {formatearFecha(user.membresia_activa.fecha_fin)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg bg-white overflow-hidden">
                  <div className="px-4 py-5 sm:p-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Plan actual</dt>
                        <dd className="mt-1 text-sm text-gray-900">{user.membresia_activa.tipo_membresia.nombre}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Estado</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {user.membresia_activa.estado === 'activa' ? 'Activa' : 'Pendiente'}
                          </span>
                        </dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Fecha de inicio</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatearFecha(user.membresia_activa.fecha_inicio)}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Fecha de vencimiento</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatearFecha(user.membresia_activa.fecha_fin)}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Límites de tu plan</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <li className="bg-gray-50 rounded p-3">
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                                <span>
                                  <strong>{user.membresia_activa.tipo_membresia.limite_proveedores}</strong> proveedores
                                </span>
                              </div>
                            </li>
                            <li className="bg-gray-50 rounded p-3">
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                                </svg>
                                <span>
                                  <strong>{user.membresia_activa.tipo_membresia.limite_articulos}</strong> artículos
                                </span>
                              </div>
                            </li>
                            <li className="bg-gray-50 rounded p-3">
                              <div className="flex items-center">
                                <svg className="h-5 w-5 text-indigo-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                                <span>
                                  <strong>{user.membresia_activa.tipo_membresia.limite_listas}</strong> listas de compra
                                </span>
                              </div>
                            </li>
                          </ul>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Link href="/membresias">
                    <Button variant="outline">
                      Cambiar de plan
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <div className="rounded-md bg-yellow-50 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm leading-5 font-medium text-yellow-800">
                        No tienes una membresía activa
                      </h3>
                      <div className="mt-2 text-sm leading-5 text-yellow-700">
                        <p>Actualmente estás usando el plan gratuito con funciones limitadas. Actualiza a un plan premium para desbloquear todas las funcionalidades.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <Link href="/membresias">
                    <Button>
                      Ver planes disponibles
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Historial de Pagos */}
        <Card title="Historial de Pagos" className="mt-6">
          <div className="border-t border-gray-200 mt-5 pt-5">
            <p className="text-center text-gray-500 text-sm py-4">No hay pagos registrados en este momento.</p>
          </div>
        </Card>

        {/* Beneficios de Membresía */}
        <Card title="Beneficios de Membresía Premium" className="mt-6">
          <div className="border-t border-gray-200 mt-5 pt-5">
            <ul className="divide-y divide-gray-200">
              <li className="py-4 flex">
                <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Sin límites de proveedores y artículos</span>
              </li>
              <li className="py-4 flex">
                <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Envío automático de pedidos vía email y WhatsApp</span>
              </li>
              <li className="py-4 flex">
                <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Acceso a estadísticas y reportes avanzados</span>
              </li>
              <li className="py-4 flex">
                <svg className="h-6 w-6 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Soporte técnico prioritario</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}