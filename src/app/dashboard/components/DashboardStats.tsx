// src/app/dashboard/components/DashboardStats.tsx
"use client";

import { useEstadisticas } from '@/hooks/useEstadisticas';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Loading from '@/components/ui/Loading';
import Link from 'next/link';

export default function DashboardStats() {
  const { estadisticas, loading, error } = useEstadisticas();

  if (loading) {
    return <Loading text="Cargando estadísticas..." />;
  }

  if (error || !estadisticas) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800 font-medium">
          No se pudieron cargar las estadísticas. Por favor, recarga la página.
        </p>
      </div>
    );
  }

  // Función para formatear límite (mostrar "Ilimitado" si es 0)
  const formatearLimite = (limite: number) => {
    return limite === 0 ? '∞' : limite;
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Proveedores */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Proveedores
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {estadisticas.totalProveedores} /{" "}
                      {formatearLimite(estadisticas.membresia.limiteProveedores)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/proveedores"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                Ver todos
              </Link>
            </div>
          </div>
        </div>

        {/* Artículos */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Artículos
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {estadisticas.totalArticulos} /{" "}
                      {formatearLimite(estadisticas.membresia.limiteArticulos)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/articulos"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                Ver todos
              </Link>
            </div>
          </div>
        </div>

        {/* Listas de Compra */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Listas de Compra
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {estadisticas.totalListas} / {formatearLimite(estadisticas.membresia.limiteListas)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/listas"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                Ver todas
              </Link>
            </div>
          </div>
        </div>

        {/* Membresía */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg
                  className="h-6 w-6 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Plan Actual
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {estadisticas.membresia.nombre}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                href="/membresias"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                Actualizar plan
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso de límites */}
      <Card title="Progreso de límites">
        <div className="space-y-4">
          {/* Proveedores */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Proveedores</span>
              <span className="text-sm font-medium text-gray-700">
                {estadisticas.membresia.limiteProveedores === 0
                  ? 'Ilimitado'
                  : `${estadisticas.totalProveedores}/${estadisticas.membresia.limiteProveedores}`}
              </span>
            </div>
            {estadisticas.membresia.limiteProveedores > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${getColorByPercentage(
                    calcularPorcentaje(estadisticas.totalProveedores, estadisticas.membresia.limiteProveedores)
                  )} h-2 rounded-full`}
                  style={{ width: `${Math.min(calcularPorcentaje(estadisticas.totalProveedores, estadisticas.membresia.limiteProveedores), 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Artículos */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Artículos</span>
              <span className="text-sm font-medium text-gray-700">
                {estadisticas.membresia.limiteArticulos === 0
                  ? 'Ilimitado'
                  : `${estadisticas.totalArticulos}/${estadisticas.membresia.limiteArticulos}`}
              </span>
            </div>
            {estadisticas.membresia.limiteArticulos > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${getColorByPercentage(
                    calcularPorcentaje(estadisticas.totalArticulos, estadisticas.membresia.limiteArticulos)
                  )} h-2 rounded-full`}
                  style={{ width: `${Math.min(calcularPorcentaje(estadisticas.totalArticulos, estadisticas.membresia.limiteArticulos), 100)}%` }}
                ></div>
              </div>
            )}
          </div>

          {/* Listas */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Listas de compra</span>
              <span className="text-sm font-medium text-gray-700">
                {estadisticas.membresia.limiteListas === 0
                  ? 'Ilimitado'
                  : `${estadisticas.totalListas}/${estadisticas.membresia.limiteListas}`}
              </span>
            </div>
            {estadisticas.membresia.limiteListas > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${getColorByPercentage(
                    calcularPorcentaje(estadisticas.totalListas, estadisticas.membresia.limiteListas)
                  )} h-2 rounded-full`}
                  style={{ width: `${Math.min(calcularPorcentaje(estadisticas.totalListas, estadisticas.membresia.limiteListas), 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>

        {/* Información de membresía */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">
              Plan actual:
            </span>
            <span className="text-sm font-semibold text-indigo-600">
              {estadisticas.membresia.nombre}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-sm font-medium text-gray-700">
              Vencimiento:
            </span>
            <span className="text-sm text-gray-700">
              {new Date(estadisticas.membresia.fechaFin).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <Button 
              href="/membresias" 
              variant="outline" 
              size="sm"
            >
              Mejorar plan
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Función para calcular porcentaje
function calcularPorcentaje(usado: number, limite: number) {
  if (limite === 0) return 0; // Si es ilimitado, mostramos 0%
  return Math.round((usado / limite) * 100);
}

// Función para obtener el color según el porcentaje
function getColorByPercentage(percentage: number) {
  if (percentage >= 90) return 'bg-red-600';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}
