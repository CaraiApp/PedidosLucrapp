// src/app/dashboard/components/RecentLists.tsx
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ListaCompra } from "@/types";

interface RecentListsProps {
  listas: ListaCompra[];
}

export default function RecentLists({ listas }: RecentListsProps) {
  const router = useRouter();

  if (!listas || listas.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-10">
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No hay listas de compra recientes
          </h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md text-center">
            Crea tu primera lista para empezar a gestionar tus compras a proveedores de forma eficiente.
          </p>
          <div className="mt-6">
            <Button 
              onClick={() => router.push("/listas/nueva")}
            >
              Crear lista de compra
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const getEstadoStyles = (estado: string) => {
    switch(estado) {
      case 'borrador':
        return 'bg-yellow-100 text-yellow-800';
      case 'enviada':
        return 'bg-blue-100 text-blue-800';
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: string) => {
    return estado.charAt(0).toUpperCase() + estado.slice(1);
  };

  return (
    <Card bodyClassName="p-0">
      <ul className="divide-y divide-gray-200">
        {listas.map((lista) => (
          <li key={lista.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/listas/${lista.id}`)}>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg
                      className="h-5 w-5 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-gray-900">
                      {lista.nombre || `Lista #${lista.id.slice(0, 8)}`}
                    </h3>
                    {lista.proveedor && (
                      <p className="text-sm text-gray-500">
                        Proveedor: {lista.proveedor.nombre}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoStyles(lista.estado)}`}
                  >
                    {formatEstado(lista.estado)}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <svg
                    className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  <p>{lista.numero_articulos || 0} artículos</p>
                </div>
                <div className="flex items-center">
                  <svg
                    className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>
                    {new Date(lista.fecha_creacion).toLocaleDateString(
                      "es-ES",
                      {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
